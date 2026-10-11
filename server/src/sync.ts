import express, { Express, Request, Response } from 'express';
import CryptoJS from 'crypto-js';
import zlib from 'zlib';

import {
    ActionRecord,
    CompressedActionsSyncRequest,
    DeltaSyncRequest,
    FullSyncRequest,
    SyncEndpointResponse,
    SyncJsonPatch,
    SyncRequest,
    SyncResponse
} from '../../shared/protocols';

/**
 * 同步契約（伺服器端）。
 *
 * Tx_Hash = HMAC-SHA256(key = secret, message = Action + JSON.stringify(Payload) + secret + previousHash)
 * 客戶端對應實作：assets/scripts/core/systems/SyncHash.ts（兩邊由 tests/SyncContract.test.ts 交叉驗證）。
 *
 * 錨點規則：每次同步的雜湊鏈都從伺服器記錄的 Last_Sync_Hash 開始；
 * 同步成功後伺服器輪換 Session_Secret 並回傳新錨點，客戶端從新錨點繼續串鏈。
 */

export interface PlayerRecord {
    Last_Sync_Hash: string;
    Session_Secret: string;
    Assets: { Gold: number; Exp: number };
    Save_Snapshot: unknown;
}

export type PlayerStore = Record<string, PlayerRecord>;

export function createDefaultPlayerStore(): PlayerStore {
    return {
        PLAYER_TEST_01: {
            Last_Sync_Hash: 'INIT_HASH',
            Session_Secret: 'MOCK_SECRET_KEY',
            Assets: { Gold: 1000, Exp: 0 },
            Save_Snapshot: {}
        }
    };
}

export function computeTxHash(action: string, payload: unknown, secret: string, previousHash: string): string {
    const payloadStr = JSON.stringify(payload);
    return CryptoJS.HmacSHA256(`${action}${payloadStr}${secret}${previousHash}`, secret).toString();
}

type ChainResult = { ok: true; lastHash: string } | { ok: false; seq: number };

/** 先驗證整條鏈，全部通過才回傳；不在驗證途中改動玩家資料。 */
export function verifyActionChain(records: ActionRecord[], startHash: string, secret: string): ChainResult {
    let anchor = startHash;
    for (const record of records) {
        const calculated = computeTxHash(record.Action, record.Payload, secret, anchor);
        if (calculated !== record.Tx_Hash) {
            return { ok: false, seq: record.Seq };
        }
        anchor = calculated;
    }
    return { ok: true, lastHash: anchor };
}

/** 邏輯重演（簡易範例） */
function replayActions(player: PlayerRecord, records: ActionRecord[]): void {
    for (const record of records) {
        const payload = (record.Payload ?? {}) as { Gold?: number; Cost?: number };
        if (record.Action === 'BATTLE_WIN') {
            player.Assets.Gold += payload.Gold || 0;
        } else if (record.Action === 'SHOP_BUY') {
            player.Assets.Gold -= payload.Cost || 0;
        }
    }
}

function decodePointer(path: string): string[] {
    if (path === '') return [];
    if (!path.startsWith('/')) throw new Error(`Invalid JSON pointer: ${path}`);
    return path.slice(1).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** 套用 JSON Patch（add / remove / replace），回傳新物件，不修改 base。 */
export function applyJsonPatches(base: unknown, patches: SyncJsonPatch[]): unknown {
    let root: unknown = base === undefined ? {} : JSON.parse(JSON.stringify(base));
    for (const patch of patches) {
        if (patch.op !== 'add' && patch.op !== 'remove' && patch.op !== 'replace') {
            throw new Error(`Unsupported patch op: ${patch.op}`);
        }
        const keys = decodePointer(patch.path);
        if (keys.length === 0) {
            root = patch.op === 'remove' ? {} : JSON.parse(JSON.stringify(patch.value ?? null));
            continue;
        }
        let parent: any = root;
        for (const key of keys.slice(0, -1)) {
            if (parent === null || typeof parent !== 'object' || !(key in parent)) {
                throw new Error(`Patch path not found: ${patch.path}`);
            }
            parent = parent[key];
        }
        const last = keys[keys.length - 1];
        if (parent === null || typeof parent !== 'object') {
            throw new Error(`Patch parent is not a container: ${patch.path}`);
        }
        if (Array.isArray(parent)) {
            const index = last === '-' ? parent.length : Number(last);
            if (!Number.isInteger(index) || index < 0 || index > parent.length) {
                throw new Error(`Invalid array index: ${patch.path}`);
            }
            if (patch.op === 'add') parent.splice(index, 0, patch.value);
            else if (patch.op === 'remove') parent.splice(index, 1);
            else parent[index] = patch.value;
        } else if (patch.op === 'remove') {
            delete parent[last];
        } else {
            parent[last] = patch.value;
        }
    }
    return root;
}

/** gzip + Base64 的 ActionRecord[]；客戶端無 pako 時會送未壓縮的 UTF-8，兩種都接受。 */
export function decodeCompressedActions(base64: string): ActionRecord[] {
    const raw = Buffer.from(base64, 'base64');
    const isGzip = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;
    const json = (isGzip ? zlib.gunzipSync(raw) : raw).toString('utf8');
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
        throw new Error('actionRecordsCompressed must decode to an array');
    }
    return parsed as ActionRecord[];
}

function rotateSecret(player: PlayerRecord, newHash: string): string {
    const newSecret = CryptoJS.lib.WordArray.random(16).toString();
    player.Session_Secret = newSecret;
    player.Last_Sync_Hash = newHash;
    return newSecret;
}

function endpointError(res: Response, status: number, message: string): Response {
    const body: SyncEndpointResponse = { success: false, message, serverTime: Date.now() };
    return res.status(status).json(body);
}

type AuthResult = { player: PlayerRecord } | { status: number; message: string };

function authenticate(store: PlayerStore, playerId: string | undefined, token: string | undefined): AuthResult {
    const player = playerId ? store[playerId] : undefined;
    if (!player) {
        return { status: 404, message: 'Player not found.' };
    }
    if (token !== player.Session_Secret) {
        return { status: 403, message: 'Invalid session token.' };
    }
    return { player };
}

export interface SyncRouteOptions {
    log?: (message: string) => void;
}

export function registerSyncRoutes(app: Express, store: PlayerStore, options: SyncRouteOptions = {}): void {
    const log = options.log ?? ((message: string) => console.log(message));

    /**
     * 核心同步驗證 API (防篡改驗證與邏輯重演)
     * Endpoint: POST /sync
     */
    app.post('/sync', (req: Request, res: Response) => {
        const syncReq: SyncRequest = req.body ?? {};
        const player = store[syncReq.Player_ID];

        if (!player) {
            return res.status(404).json({ Success: false, Message: 'Player not found.', Server_Time: Date.now() });
        }
        if (syncReq.Session_Secret !== player.Session_Secret) {
            return res.status(403).json({ Success: false, Message: 'Invalid Session Secret (Security Breach).', Server_Time: Date.now() });
        }
        if (syncReq.Previous_Hash !== player.Last_Sync_Hash) {
            return res.status(409).json({ Success: false, Message: 'Previous_Hash does not match server anchor.', Server_Time: Date.now() });
        }

        const records = Array.isArray(syncReq.Action_Records) ? syncReq.Action_Records : [];
        const chain = verifyActionChain(records, syncReq.Previous_Hash, player.Session_Secret);
        if (chain.ok === false) {
            log(`[Server] Security Violation at Sequence #${chain.seq}! Hash Mismatch.`);
            return res.status(400).json({ Success: false, Message: `Hash chain broken at Seq #${chain.seq}. Sync rejected.`, Server_Time: Date.now() });
        }

        replayActions(player, records);
        const newSecret = rotateSecret(player, chain.lastHash);
        const response: SyncResponse = {
            Success: true,
            New_Session_Secret: newSecret,
            New_Hash: chain.lastHash,
            Server_Time: Date.now()
        };
        log(`[Server] Sync success for ${syncReq.Player_ID}: ${records.length} records, Gold=${player.Assets.Gold}`);
        res.json(response);
    });

    /** POST /sync/delta：存檔差異 + 行動紀錄 */
    app.post('/sync/delta', (req: Request, res: Response) => {
        const body: DeltaSyncRequest = req.body ?? {};
        const auth = authenticate(store, body.playerId, body.sessionToken);
        if ('status' in auth) return endpointError(res, auth.status, auth.message);
        const { player } = auth;

        if (body.baseHash !== player.Last_Sync_Hash) {
            return endpointError(res, 409, 'baseHash does not match server anchor; full sync required.');
        }

        const records = Array.isArray(body.actionRecords) ? body.actionRecords : [];
        const patches = Array.isArray(body.patches) ? body.patches : [];
        const chain = verifyActionChain(records, body.baseHash, player.Session_Secret);
        if (chain.ok === false) {
            return endpointError(res, 400, `Hash chain broken at Seq #${chain.seq}.`);
        }

        let nextSnapshot: unknown;
        try {
            nextSnapshot = applyJsonPatches(player.Save_Snapshot, patches);
        } catch (error) {
            return endpointError(res, 400, error instanceof Error ? error.message : String(error));
        }

        replayActions(player, records);
        player.Save_Snapshot = nextSnapshot;
        const newHash = patches.length > 0
            ? computeTxHash('SAVE_DELTA', patches, player.Session_Secret, chain.lastHash)
            : chain.lastHash;
        const newSessionSecret = rotateSecret(player, newHash);
        log(`[Server] Delta sync for ${body.playerId}: ${patches.length} patches, ${records.length} records`);

        const response: SyncEndpointResponse = { success: true, newHash, newSessionSecret, serverTime: Date.now() };
        res.json(response);
    });

    /** POST /sync/full：完整存檔覆蓋（delta 衝突時的 fallback） */
    app.post('/sync/full', (req: Request, res: Response) => {
        const body: FullSyncRequest = req.body ?? {};
        const auth = authenticate(store, body.playerId, body.sessionToken);
        if ('status' in auth) return endpointError(res, auth.status, auth.message);
        const { player } = auth;

        if (body.saveData === null || typeof body.saveData !== 'object') {
            return endpointError(res, 400, 'saveData must be an object.');
        }

        player.Save_Snapshot = JSON.parse(JSON.stringify(body.saveData));
        const newHash = computeTxHash('SAVE_FULL', body.saveData, player.Session_Secret, player.Last_Sync_Hash);
        const newSessionSecret = rotateSecret(player, newHash);
        log(`[Server] Full sync for ${body.playerId}`);

        const response: SyncEndpointResponse = { success: true, newHash, newSessionSecret, serverTime: Date.now() };
        res.json(response);
    });

    /** POST /sync/actions：壓縮的行動紀錄批次上傳 */
    app.post('/sync/actions', (req: Request, res: Response) => {
        const body: CompressedActionsSyncRequest = req.body ?? {};
        const auth = authenticate(store, body.playerId, body.sessionToken);
        if ('status' in auth) return endpointError(res, auth.status, auth.message);
        const { player } = auth;

        if (body.baseHash !== player.Last_Sync_Hash) {
            return endpointError(res, 409, 'baseHash does not match server anchor.');
        }

        let records: ActionRecord[];
        try {
            records = decodeCompressedActions(String(body.actionRecordsCompressed ?? ''));
        } catch (error) {
            return endpointError(res, 400, `Cannot decode actionRecordsCompressed: ${error instanceof Error ? error.message : String(error)}`);
        }
        if (typeof body.count === 'number' && body.count !== records.length) {
            return endpointError(res, 400, `count mismatch: declared ${body.count}, decoded ${records.length}.`);
        }

        const chain = verifyActionChain(records, body.baseHash, player.Session_Secret);
        if (chain.ok === false) {
            return endpointError(res, 400, `Hash chain broken at Seq #${chain.seq}.`);
        }

        replayActions(player, records);
        const newSessionSecret = rotateSecret(player, chain.lastHash);
        log(`[Server] Compressed actions sync for ${body.playerId}: ${records.length} records`);

        const response: SyncEndpointResponse = { success: true, newHash: chain.lastHash, newSessionSecret, serverTime: Date.now() };
        res.json(response);
    });
}

/** 建立只含同步路由的 app（測試與 index.ts 共用）。 */
export function createSyncApp(store: PlayerStore = createDefaultPlayerStore(), options: SyncRouteOptions = {}): Express {
    const app = express();
    app.use(express.json({ limit: '5mb' }));
    registerSyncRoutes(app, store, options);
    return app;
}
