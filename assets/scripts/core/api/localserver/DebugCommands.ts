// @spec-source → 學府修業畫面與接線設計.md (doc_spec_1179) §9.4 QA 快進入口 debug.fastForward；PROG-2-9192；測試工具 2.0 debug.* 指令 PROG-2-9858
/**
 * DebugCommands — 偵錯命令（debug.*）在本機 adapter 的處理器。
 *
 * 只由本機 adapter 掛上，而且要宿主綁定才生效（沒綁定一律 E107）；網路 adapter 不掛處理器，等於一律拒絕，避免變成外掛入口。
 * 宿主只在「測試工具開啟」（網址 ?dev=1 或設定頁連點版本號）或網址帶 qa* 參數時才綁。
 *
 * 測試工具 2.0 原則：畫面上的數字不直接改，一律走這裡的命令寫進存檔：
 * - debug.grant：資源加減。錢包幣別（金、銀兩、鑽石、召喚券）走 WalletAuthority 的 credit／spend，
 *   兵與糧走宿主的 adjustMilitary；玉尚無權威儲存，回 E107 說明。
 * - debug.setStat：直接設定數值（白名單）。
 * - debug.setRank：把官職設為 1～5 階（經驗同步設為該階門檻），太守府（階 3）、招賢館（階 2）等依官職鎖定的設施隨之開放或重新上鎖；
 *   debug.unlockAll：官職拉滿，一次開放所有依官職鎖定的大廳設施。皆寫入存檔（PROG-2-9860）。
 * - debug.advanceTime、debug.resetGame、debug.importSave 的後續動作：命令佇列是串行的，處理器裡不能等宿主跑完
 *   （宿主推進時要呼叫 save.* 等命令，會排在自己後面造成死結），所以只啟動並回 ack，進度由宿主公布。
 * - debug.exportSave（查詢）：回整份存檔快照 JSON。debug.importSave：驗證後經 save.full 寫入，再請宿主套用。
 */
import {
    DEBUG_ADVANCE_MAX_SEASONS,
    DEBUG_GRANT_MAX_ABS,
    DEBUG_GRANT_RESOURCES,
    DEBUG_RANK_MAX,
    DEBUG_RANK_MIN,
    DEBUG_STAT_KEYS,
    type DebugAdvanceAck,
    type DebugExportSaveResult,
    type DebugFastForwardAck,
    type DebugFastForwardResult,
    type DebugGrantResource,
    type DebugGrantResult,
    type DebugImportSaveResult,
    type DebugSetRankResult,
    type DebugSetStatResult,
    type DebugUnlockAllResult,
} from '../../../shared/api/ApiCommands';
import { ApiError } from '../../../shared/api/ApiErrors';
import { validatePlayerSaveSnapshot } from '../../services/PlayerSaveService';
import type { LocalApiAdapter } from './LocalApiAdapter';
import type { WalletAuthority } from './WalletCommands';

/** 偵錯宿主：單機由場景與測試工具提供；每個能力都是選填，沒提供的命令回 E107 */
export interface DebugHost {
    /** 學府快進到「已完成 turns 回合」 */
    fastForwardAcademy?(turns: number): Promise<DebugFastForwardResult>;
    /** 調整城市兵源或糧草（夾在 0～上限）；同步回傳實際變動，存檔由宿主在命令結束後排程 */
    adjustMilitary?(field: 'food' | 'cityTroops', delta: number): { applied: number; value: number };
    /** 直接設定數值，回設定後的值 */
    setStat?(key: string, value: number): number;
    /** 官職設為指定階位（同步；存檔由宿主排程），回設定後的階位、經驗與已開放的大廳項目 */
    setRank?(tier: number): DebugSetRankResult;
    /** 推進季數（呼叫端不 await；進度由宿主公布） */
    advanceTime?(seasons: number): Promise<void>;
    /** 開新局並存檔（呼叫端不 await） */
    resetGame?(): Promise<void>;
    /** 目前記憶體狀態的存檔快照（同步） */
    exportSnapshot?(): unknown;
    /** 存檔已由 save.full 寫入，請宿主重新讀檔套用並刷新畫面（呼叫端不 await） */
    applyImportedSave?(): Promise<void>;
}

const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const NOT_ENABLED = '偵錯入口未啟用（網址需帶 dev=1，或在設定頁連點版本號開啟測試工具）';

function requireHost<K extends keyof DebugHost>(host: DebugHost | null, key: K, what: string): NonNullable<DebugHost[K]> {
    if (!host) throw new ApiError('DEBUG_UNAVAILABLE', NOT_ENABLED);
    const fn = host[key];
    if (typeof fn !== 'function') throw new ApiError('DEBUG_UNAVAILABLE', `目前場景沒有提供「${what}」`);
    return (fn as (...a: never[]) => unknown).bind(host) as NonNullable<DebugHost[K]>;
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export function registerDebugCommands(adapter: LocalApiAdapter, getHost: () => DebugHost | null, getWallet: () => WalletAuthority | null = () => null): void {
    adapter.register('debug.fastForward', async (args) => {
        const host = getHost();
        if (!host) throw new ApiError('DEBUG_UNAVAILABLE', '偵錯入口未啟用（網址未帶 qa 參數）');
        if (args.target !== 'academy') throw new ApiError('INVALID_SCHEMA', 'target 目前只支援 academy');
        const turns = args.turns;
        if (typeof turns !== 'number' || !Number.isInteger(turns) || turns < 1 || turns > 36) {
            throw new ApiError('INVALID_SCHEMA', 'turns 必須是 1~36 的整數');
        }
        const fastForward = requireHost(host, 'fastForwardAcademy', '學府快進');
        const ack: DebugFastForwardAck = { accepted: true, turns };
        // 不 await：讓出佇列，快進才能呼叫其他命令；失敗由宿主自己回報，這裡只防止未處理的 Promise 拒絕
        void fastForward(turns).catch(() => undefined);
        return { result: ack };
    });

    adapter.register('debug.grant', (args) => {
        const host = getHost();
        if (!host) throw new ApiError('DEBUG_UNAVAILABLE', NOT_ENABLED);
        const resource = args.resource;
        if (typeof resource !== 'string' || !Object.prototype.hasOwnProperty.call(DEBUG_GRANT_RESOURCES, resource)) {
            throw new ApiError('INVALID_SCHEMA', `未知資源 ${String(resource)}`);
        }
        const amount = args.amount;
        if (!isIntInRange(amount, -DEBUG_GRANT_MAX_ABS, DEBUG_GRANT_MAX_ABS) || amount === 0) {
            throw new ApiError('INVALID_SCHEMA', `amount 必須是非 0 整數，絕對值不超過 ${DEBUG_GRANT_MAX_ABS}`);
        }
        const def = DEBUG_GRANT_RESOURCES[resource as DebugGrantResource];
        if (def.via === 'pending') {
            throw new ApiError('DEBUG_UNAVAILABLE', `${resource} 尚無權威儲存（待物品庫存框架定義資源 id），暫不能調整`);
        }
        if (def.via === 'military') {
            const adjust = requireHost(host, 'adjustMilitary', '兵糧調整');
            const out = adjust(def.key as 'food' | 'cityTroops', amount);
            const result: DebugGrantResult = { resource, applied: out.applied, balance: out.value };
            return { result, delta: [{ path: `/military/${def.key}`, op: 'replace', value: out.value }] };
        }
        const wallet = getWallet();
        if (!wallet) throw new ApiError('WALLET_UNAVAILABLE', '錢包尚未就緒（此畫面沒有綁定錢包）');
        const before = wallet.balance(def.key);
        if (amount > 0) {
            if (!wallet.credit) throw new ApiError('WALLET_UNAVAILABLE', '此錢包不接受入帳');
            wallet.credit(def.key, amount);
        } else {
            // 扣到 0 為止：測試時多扣不該報錯
            const take = Math.min(-amount, before);
            if (take > 0 && !wallet.spend(def.key, take)) throw new ApiError('INSUFFICIENT_BALANCE', `${resource} 扣款失敗`);
        }
        const balance = wallet.balance(def.key);
        const result: DebugGrantResult = { resource, applied: balance - before, balance };
        return {
            result,
            delta: [{ path: def.key === 'silver' ? '/family/silver' : `/gachaWallet/${def.key}`, op: 'replace', value: balance }],
            events: [{ evt: 'inventory.changed', data: { currency: def.key, balance, reason: 'debug.grant' } }],
        };
    });

    adapter.register('debug.setStat', (args) => {
        const key = args.key;
        if (typeof key !== 'string' || DEBUG_STAT_KEYS.indexOf(key) < 0) throw new ApiError('INVALID_SCHEMA', `key 必須是 ${DEBUG_STAT_KEYS.join('／')}`);
        const value = args.value;
        if (!isIntInRange(value, 0, DEBUG_GRANT_MAX_ABS)) throw new ApiError('INVALID_SCHEMA', 'value 必須是 0 以上的整數');
        const set = requireHost(getHost(), 'setStat', '數值設定');
        const applied = set(key, value);
        const result: DebugSetStatResult = { key, value: applied };
        return { result };
    });

    adapter.register('debug.setRank', (args) => {
        const tier = args.tier;
        if (!isIntInRange(tier, DEBUG_RANK_MIN, DEBUG_RANK_MAX)) throw new ApiError('INVALID_SCHEMA', `tier 必須是 ${DEBUG_RANK_MIN}～${DEBUG_RANK_MAX} 的整數`);
        const setRank = requireHost(getHost(), 'setRank', '官職設定');
        const result: DebugSetRankResult = setRank(tier);
        return { result, delta: [{ path: '/officerState/currentTier', op: 'replace', value: result.tier }] };
    });

    adapter.register('debug.unlockAll', () => {
        const setRank = requireHost(getHost(), 'setRank', '全部解鎖');
        const result: DebugUnlockAllResult = setRank(DEBUG_RANK_MAX);
        return { result, delta: [{ path: '/officerState/currentTier', op: 'replace', value: result.tier }] };
    });

    adapter.register('debug.advanceTime', (args) => {
        const unit = args.unit;
        const count = args.count;
        if (unit !== 'season' && unit !== 'year') throw new ApiError('INVALID_SCHEMA', 'unit 必須是 season 或 year');
        if (!isIntInRange(count, 1, DEBUG_ADVANCE_MAX_SEASONS)) throw new ApiError('INVALID_SCHEMA', `count 必須是 1～${DEBUG_ADVANCE_MAX_SEASONS} 的整數`);
        const seasons = unit === 'year' ? count * 4 : count;
        if (seasons > DEBUG_ADVANCE_MAX_SEASONS) throw new ApiError('INVALID_SCHEMA', `推進量不得超過 ${DEBUG_ADVANCE_MAX_SEASONS} 季（一年 4 季）`);
        const advance = requireHost(getHost(), 'advanceTime', '時間推進');
        const ack: DebugAdvanceAck = { accepted: true, seasons };
        void advance(seasons).catch(() => undefined);
        return { result: ack };
    });

    adapter.register('debug.resetGame', () => {
        const reset = requireHost(getHost(), 'resetGame', '開新局');
        void reset().catch(() => undefined);
        return { result: { accepted: true } };
    });

    adapter.register('debug.exportSave', () => {
        const snapshot = requireHost(getHost(), 'exportSnapshot', '存檔匯出')();
        const json = JSON.stringify(snapshot);
        const result: DebugExportSaveResult = { json, bytes: json.length };
        return { result };
    });

    adapter.register('debug.importSave', async (args) => {
        const apply = requireHost(getHost(), 'applyImportedSave', '存檔匯入');
        const text = args.json;
        if (typeof text !== 'string' || text.length === 0) throw new ApiError('INVALID_SCHEMA', 'json 必須是非空字串');
        if (text.length > MAX_IMPORT_BYTES) throw new ApiError('INVALID_SCHEMA', `存檔超過 ${MAX_IMPORT_BYTES} 位元組`);
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch (error) {
            throw new ApiError('INVALID_SCHEMA', `不是合法 JSON：${error instanceof Error ? error.message : String(error)}`);
        }
        let snapshot;
        try {
            snapshot = validatePlayerSaveSnapshot(parsed);
        } catch (error) {
            throw new ApiError('INVALID_SCHEMA', error instanceof Error ? error.message : String(error));
        }
        // 命令層互相呼叫：直接走 save.full 處理器寫入（已在佇列內，不能再 cmd）
        await adapter.invoke('save.full', { snapshot });
        void apply().catch(() => undefined);
        const result: DebugImportSaveResult = { accepted: true, bytes: text.length };
        return { result };
    });
}
