// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（點武將聊天）；PROG-2-2252
/**
 * LobbyDialogueProvider — 大廳小人台詞的統一接口，純 TS，不依賴 cc。
 *
 * 規則：大廳任何小人的台詞一律經由 getLines() 取得，元件裡不寫死字串。
 *   - LocalLobbyDialogueProvider：內建 JSON 底稿（＋本機快取），離線永遠可用。
 *   - CloudLobbyDialogueProvider：雲端 server 殼。預設關閉；開啟時在背景同步台詞包，
 *     任何失敗（沒有端點、逾時、格式錯）都退回本地，且 getLines 永不等待網路。
 * 友誼目前由呼叫端給預設值 0（友誼系統尚未建立），欄位保留。
 *
 * Unity 對照：一個 ILobbyDialogue 介面，兩個實作（ScriptableObject 本地表／WebRequest 遠端表），遠端失敗就走本地。
 */
import { ChatBook, ChatLine, HallChatStore } from './HallChatLines';

export type LobbyPeriod = 'morning' | 'day' | 'evening' | 'night';
export type LobbyDialogueEvent = 'tap' | 'volunteer';

export interface LobbyDialogueContext {
    /** 武將對主公的友誼值；友誼系統未建立前由呼叫端給 0 */
    friendship: number;
    /** 當地時段 */
    period: LobbyPeriod;
    /** 觸發事件：點聊天（tap）或自薦提案（volunteer） */
    event: LobbyDialogueEvent;
}

export interface LobbyDialogueProvider {
    /** 來源標記（除錯與測試用） */
    readonly source: 'local' | 'cloud';
    /**
     * 取得這位武將在此情境下可說的台詞候選。武將自己的專屬台詞不夠時回傳通用台詞；
     * 完全沒有可用台詞時回傳空陣列（呼叫端就不開泡泡）。
     */
    getLines(generalId: string, context: LobbyDialogueContext): ChatLine[];
}

/** 當地小時 → 時段：5–9 晨、10–16 日、17–19 夕、其餘夜 */
export function periodOfHour(hour: number): LobbyPeriod {
    if (!Number.isFinite(hour)) return 'day';
    if (hour >= 5 && hour < 10) return 'morning';
    if (hour >= 10 && hour < 17) return 'day';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'night';
}

/** 依友誼、時段、事件過濾；沒寫 events 的句子只在點聊天時說 */
export function eligibleLines(lines: readonly ChatLine[], context: LobbyDialogueContext): ChatLine[] {
    const friendship = Number.isFinite(context.friendship) ? context.friendship : 0;
    return lines.filter(line => {
        if ((line.minFriendship ?? 0) > friendship) return false;
        if (line.periods && !line.periods.includes(context.period)) return false;
        const events = line.events ?? ['tap'];
        return events.includes(context.event);
    });
}

/** 從候選中挑一句：有第二句可選時避開上一句，避免連點同一人講同一句。候選為空回 null。 */
export function pickDialogueLine(lines: readonly ChatLine[], lastLineId: string | null, random: () => number): ChatLine | null {
    if (lines.length === 0) return null;
    const options = lines.length > 1 && lastLineId ? lines.filter(l => l.id !== lastLineId) : lines.slice();
    const index = Math.min(options.length - 1, Math.floor(random() * options.length));
    return options[index];
}

/** 本地實作：內建底稿＋本機快取（HallChatStore）。武將專屬台詞優先，沒有才用通用台詞。 */
export class LocalLobbyDialogueProvider implements LobbyDialogueProvider {
    public readonly source = 'local' as const;

    constructor(private readonly _store: HallChatStore) {}

    public getLines(generalId: string, context: LobbyDialogueContext): ChatLine[] {
        return lobbyLinesFromBook(this._store.book, generalId, context);
    }
}

/** 共用：專屬台詞有可用的就用專屬，否則通用台詞。純函式，供本地與雲端實作共用。 */
export function lobbyLinesFromBook(book: Readonly<ChatBook>, generalId: string, context: LobbyDialogueContext): ChatLine[] {
    const own = eligibleLines(book.generals[generalId] ?? [], context);
    if (own.length > 0) return own;
    return eligibleLines(book.generic, context);
}

export interface CloudDialogueConfig {
    /** 總開關：預設 false，關閉時完全不連線 */
    enabled: boolean;
    /** 台詞包 GET 端點；空字串＝沒有伺服器，等同關閉 */
    endpoint: string;
    /** 單次請求逾時（毫秒） */
    timeoutMs: number;
    /** 同步成功後多久才再同步（秒） */
    refreshSec: number;
}

export const DEFAULT_CLOUD_DIALOGUE_CONFIG: CloudDialogueConfig = {
    enabled: false,
    endpoint: '',
    timeoutMs: 4000,
    refreshSec: 600,
};

/** 讀台詞包檔裡的 cloud 區段；缺欄位或格式錯就用預設（預設關閉） */
export function parseCloudDialogueConfig(raw: unknown): CloudDialogueConfig {
    const r = raw && typeof raw === 'object' ? (raw as { cloud?: Partial<CloudDialogueConfig> }).cloud : undefined;
    if (!r || typeof r !== 'object') return { ...DEFAULT_CLOUD_DIALOGUE_CONFIG };
    const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);
    return {
        enabled: r.enabled === true,
        endpoint: typeof r.endpoint === 'string' ? r.endpoint.trim() : '',
        timeoutMs: num(r.timeoutMs, DEFAULT_CLOUD_DIALOGUE_CONFIG.timeoutMs),
        refreshSec: num(r.refreshSec, DEFAULT_CLOUD_DIALOGUE_CONFIG.refreshSec),
    };
}

/** 取台詞包的函式（注入）：回傳原始 JSON，由 parseChatBook 驗證 */
export type ChatBookFetcher = () => Promise<unknown>;

/** 有 fetch 且有端點時才回傳 fetcher；沒有就回 null（雲端實作等同關閉） */
export function createHttpChatBookFetcher(endpoint: string): ChatBookFetcher | null {
    if (!endpoint) return null;
    const g = globalThis as { fetch?: (url: string, init?: { method?: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }> };
    if (typeof g.fetch !== 'function') return null;
    const doFetch = g.fetch.bind(globalThis);
    return async () => {
        const res = await doFetch(endpoint, { method: 'GET' });
        if (!res.ok) throw new Error(`hall chat fetch HTTP ${res.status}`);
        return res.json();
    };
}

const FAILURE_BACKOFF_MS = 60_000;

/**
 * 雲端實作（server 殼）：getLines 永遠同步回傳（本地先行），需要時在背景 refresh。
 * 同步結果寫進 HallChatStore（store 會同時寫本機快取），所以離線後仍是「內建＋最近一次同步」。
 * 關閉、沒端點、逾時、失敗、格式錯 → 都只是不更新，台詞照常由本地給。
 */
export class CloudLobbyDialogueProvider implements LobbyDialogueProvider {
    public readonly source = 'cloud' as const;
    private _lastSyncAt = 0;
    private _retryAt = 0;
    private _inFlight: Promise<boolean> | null = null;

    constructor(
        private readonly _local: LocalLobbyDialogueProvider,
        private readonly _store: HallChatStore,
        private readonly _config: CloudDialogueConfig,
        private readonly _fetcher: ChatBookFetcher | null,
        private readonly _now: () => number = () => Date.now(),
    ) {}

    /** 真正會連線的條件：開關開、有 fetcher */
    public get active(): boolean {
        return this._config.enabled && this._fetcher !== null;
    }

    public getLines(generalId: string, context: LobbyDialogueContext): ChatLine[] {
        if (this.active) this._kickSync();
        return this._local.getLines(generalId, context);
    }

    /** 立即同步一次（測試或手動呼叫）；回傳是否真的套用了新台詞。永不拋錯。 */
    public refresh(): Promise<boolean> {
        if (!this.active) return Promise.resolve(false);
        if (this._inFlight) return this._inFlight;
        const fetcher = this._fetcher as ChatBookFetcher;
        const run = this._withTimeout(fetcher()).then(
            (raw) => {
                const applied = this._store.applyDownloaded(raw);
                this._lastSyncAt = this._now();
                this._retryAt = 0;
                return applied;
            },
            () => {
                this._retryAt = this._now() + FAILURE_BACKOFF_MS;
                return false;
            },
        ).finally(() => { this._inFlight = null; });
        this._inFlight = run;
        return run;
    }

    private _kickSync(): void {
        const now = this._now();
        if (this._inFlight) return;
        if (this._retryAt > now) return;
        if (this._lastSyncAt > 0 && now - this._lastSyncAt < this._config.refreshSec * 1000) return;
        void this.refresh();
    }

    private _withTimeout<T>(promise: Promise<T>): Promise<T> {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const timeout = new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => reject(new Error('hall chat sync timeout')), this._config.timeoutMs);
        });
        return Promise.race([promise, timeout]).finally(() => { if (timer) clearTimeout(timer); });
    }
}

/** 組好整套：本地實作＋雲端殼。呼叫端只拿 LobbyDialogueProvider 介面用。 */
export function createLobbyDialogueProvider(
    chatRaw: unknown,
    store: HallChatStore,
    options: { fetcher?: ChatBookFetcher | null; now?: () => number } = {},
): LobbyDialogueProvider {
    const config = parseCloudDialogueConfig(chatRaw);
    const local = new LocalLobbyDialogueProvider(store);
    const fetcher = options.fetcher !== undefined ? options.fetcher : createHttpChatBookFetcher(config.endpoint);
    return new CloudLobbyDialogueProvider(local, store, config, config.enabled ? fetcher : null, options.now);
}

