// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.7 存檔即 API；同步 API 規格書 (doc_tech_0010) /sync/delta、/sync/full；PROG-2-9201
/**
 * SaveCommands — 存檔命令（save.load／save.rev／save.commit／save.full）在本機 adapter 的處理器。
 *
 * - save.load：讀進度，回快照與雜湊，並把持久化的 saveRev 併進 adapter。
 * - save.rev：只回 saveRev 與雜湊（輕量對帳）。
 * - save.commit：clientOwned 欄位的 RFC 6902 補丁，帶 baseHash；critical 欄位一律 E002；baseHash 不符 E011。
 * - save.full：全量寫入。單機階段 0 由 GameSession 以它存檔（本機 adapter 為權威）；連線後換成伺服器的 /sync/full。
 * 寫檔都在 adapter 內原子完成（port.save），玩法程式不碰存檔後端。
 */
import {
    SAVE_CLIENT_OWNED_ROOTS,
    type SaveCommitResult, type SaveFullResult, type SaveLoadResult, type SaveRevResult,
} from '../../../shared/api/ApiCommands';
import { ApiError } from '../../../shared/api/ApiErrors';
import { applyPatch, parsePointer, type PatchOp } from '../../../shared/api/ApiPatch';
import type { PlayerSaveSnapshot } from '../../services/PlayerSaveService';
import type { HandlerContext, LocalApiAdapter } from './LocalApiAdapter';
import { hashSnapshot } from './SaveHash';

/** 伺服器側存檔 port：單機由 PlayerSaveService 實作 */
export interface LocalSaveStore {
    load(): Promise<PlayerSaveSnapshot | null>;
    save(snapshot: PlayerSaveSnapshot, saveRev?: number): Promise<void>;
    loadRev(): Promise<number>;
    lastLoadRecoveredFromBackup(): boolean;
}

const MAX_PATCH_OPS = 200;

/** 寫檔前先把持久化的 saveRev 併進 adapter（還沒讀檔就存檔時不會把版本戳倒退）；回傳併入後的版本戳 */
async function syncedRev(store: LocalSaveStore, ctx: HandlerContext): Promise<number> {
    const persisted = await store.loadRev();
    ctx.syncRev(persisted);
    return Math.max(ctx.saveRev, persisted);
}

export function registerSaveCommands(adapter: LocalApiAdapter, store: LocalSaveStore): void {
    adapter.register('save.load', async (_args, ctx) => {
        let snapshot: PlayerSaveSnapshot | null;
        try {
            snapshot = await store.load();
        } catch (error) {
            throw new ApiError('SAVE_FAILED', error instanceof Error ? error.message : String(error));
        }
        ctx.syncRev(await store.loadRev());
        const result: SaveLoadResult = {
            snapshot,
            hash: snapshot ? hashSnapshot(snapshot) : null,
            recoveredFromBackup: store.lastLoadRecoveredFromBackup(),
        };
        return { result };
    });

    adapter.register('save.rev', async (_args, ctx) => {
        let snapshot: PlayerSaveSnapshot | null = null;
        try { snapshot = await store.load(); } catch { snapshot = null; }
        ctx.syncRev(await store.loadRev());
        const result: SaveRevResult = { saveRev: ctx.saveRev, hash: snapshot ? hashSnapshot(snapshot) : null };
        return { result };
    });

    adapter.register('save.full', async (args, ctx) => {
        if (!args.snapshot || typeof args.snapshot !== 'object') throw new ApiError('INVALID_SCHEMA', 'snapshot 必須是物件');
        const base = await syncedRev(store, ctx);
        try {
            await store.save(args.snapshot as PlayerSaveSnapshot, base + 1);
        } catch (error) {
            throw new ApiError('SAVE_FAILED', error instanceof Error ? error.message : String(error));
        }
        // 雜湊要把整份快照序列化，頻繁存檔時太貴；需要對帳時用 save.rev 取
        const result: SaveFullResult = { hash: null };
        return { result, events: [{ evt: 'save.rev' }] };
    });

    adapter.register('save.commit', async (args, ctx) => {
        const patch = args.patch;
        if (typeof args.baseHash !== 'string' || !Array.isArray(patch)) throw new ApiError('INVALID_SCHEMA', 'save.commit 需要 baseHash 與 patch 陣列');
        if (patch.length === 0 || patch.length > MAX_PATCH_OPS) throw new ApiError('INVALID_SCHEMA', `patch 筆數需在 1～${MAX_PATCH_OPS}`);
        const ops = patch as PatchOp[];
        for (const op of ops) {
            if (!op || (op.op !== 'add' && op.op !== 'replace' && op.op !== 'remove')) throw new ApiError('PATCH_PATH_FORBIDDEN', '只接受 add／replace／remove');
            const segments = parsePointer(op.path);
            if (!segments || SAVE_CLIENT_OWNED_ROOTS.indexOf(segments[0]) < 0) {
                throw new ApiError('PATCH_PATH_FORBIDDEN', `補丁路徑不在 clientOwned 白名單：${String(op.path)}`);
            }
        }
        const current = await store.load();
        if (!current) throw new ApiError('SAVE_NOT_FOUND', '沒有存檔可補丁');
        if (hashSnapshot(current) !== args.baseHash) throw new ApiError('BASE_HASH_MISMATCH', 'baseHash 與權威端存檔不一致，請改走 save.full');
        let next: unknown;
        try {
            next = applyPatch(current, ops);
        } catch (error) {
            throw new ApiError('INVALID_SCHEMA', error instanceof Error ? error.message : String(error));
        }
        const base = await syncedRev(store, ctx);
        try {
            await store.save(next as PlayerSaveSnapshot, base + 1);
        } catch (error) {
            throw new ApiError('SAVE_FAILED', error instanceof Error ? error.message : String(error));
        }
        const saved = await store.load();
        const result: SaveCommitResult = { hash: hashSnapshot(saved), applied: ops.length };
        return { result, events: [{ evt: 'save.rev' }] };
    });
}
