// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（點武將聊天）；Issue #2135；PROG-2-2251
/**
 * HallChatLines — 大廳武將聊天台詞的資料結構、挑選與離線快取，純 TS，不依賴 cc。
 *
 * 設計前提（使用者 2026-11-15）：
 *   - 平常不連線：遊戲內建一份台詞（data/hall-map/hall-chat-lines.json）當離線底稿。
 *   - 連線時才向伺服器同步最新台詞，存進本機快取；下次離線就用「內建＋快取」合併後的版本。
 *   - 台詞跟武將的友誼（發展）有關：每句可標 minFriendship，友誼夠了才會說到。
 *   - 每位擁有的武將至少三句自己的台詞；台詞可以等擁有那位武將時再補進來，缺的用通用台詞墊底。
 * 伺服器介面目前不存在，所以同步只留「注入取資料函式」的接口，不寫死網址。
 *
 * Unity 對照：像 ScriptableObject 當離線底稿＋一個 PlayerPrefs 快取，連線時用 JSON 覆蓋更新。
 */

/** 每位擁有的武將至少要有幾句自己的台詞（友誼 0 就能說到的那些） */
export const HALL_CHAT_MIN_LINES = 3;
/** 本機快取的鍵；由呼叫端的儲存轉接器決定實際放哪（localStorage 等） */
export const HALL_CHAT_CACHE_KEY = 'hall-chat-lines.v1';

export interface ChatLine {
    /** 台詞編號：同一位武將內唯一；同步下載時用來覆蓋同編號的舊句 */
    id: string;
    text: string;
    /** 友誼至少多少才會說到；不填視為 0（一開始就會說） */
    minFriendship?: number;
    /** 限定時段才說（morning/day/evening/night）；不填＝任何時段 */
    periods?: string[];
    /** 限定觸發事件（tap＝點聊天、volunteer＝自薦提案）；不填視為只有 tap */
    events?: string[];
}

export interface ChatBook {
    /** 台詞包版本：下載到較新的才覆蓋快取 */
    version: number;
    /** 通用台詞：武將自己的台詞還不夠時墊底，也當沒有專屬台詞的武將的聊天內容 */
    generic: ChatLine[];
    /** 武將 id → 專屬台詞 */
    generals: Record<string, ChatLine[]>;
}

export interface ChatStorage {
    get(key: string): string | null;
    set(key: string, value: string): void;
}

export interface ChatPick {
    line: ChatLine;
    /** true＝這句是通用台詞（該武將還沒有可用的專屬台詞） */
    generic: boolean;
}

function parseLines(raw: unknown): ChatLine[] {
    if (!Array.isArray(raw)) return [];
    const out: ChatLine[] = [];
    const seen = new Set<string>();
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Partial<ChatLine>;
        if (typeof r.id !== 'string' || r.id.length === 0 || typeof r.text !== 'string' || r.text.trim().length === 0) continue;
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        const min = typeof r.minFriendship === 'number' && Number.isFinite(r.minFriendship) && r.minFriendship > 0 ? r.minFriendship : 0;
        const line: ChatLine = { id: r.id, text: r.text };
        if (min > 0) line.minFriendship = min;
        if (Array.isArray(r.periods)) line.periods = r.periods.filter((p): p is string => typeof p === 'string');
        if (Array.isArray(r.events)) line.events = r.events.filter((e): e is string => typeof e === 'string');
        out.push(line);
    }
    return out;
}

/** 解析台詞包；格式不對回 null（呼叫端沿用舊版）。壞掉的單句會被略過，不會讓整包失敗。 */
export function parseChatBook(raw: unknown): ChatBook | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Partial<ChatBook>;
    if (typeof r.version !== 'number' || !Number.isFinite(r.version)) return null;
    const generals: Record<string, ChatLine[]> = {};
    if (r.generals && typeof r.generals === 'object') {
        for (const [id, lines] of Object.entries(r.generals)) {
            const parsed = parseLines(lines);
            if (parsed.length > 0) generals[id] = parsed;
        }
    }
    return { version: r.version, generic: parseLines(r.generic), generals };
}

function mergeLines(base: readonly ChatLine[], extra: readonly ChatLine[]): ChatLine[] {
    const out = base.slice();
    for (const line of extra) {
        const i = out.findIndex(l => l.id === line.id);
        if (i >= 0) out[i] = line;
        else out.push(line);
    }
    return out;
}

/** 合併：extra 的同編號句子覆蓋 base，新編號附加在後；版本取較大者。不改輸入。 */
export function mergeChatBooks(base: Readonly<ChatBook>, extra: Readonly<ChatBook>): ChatBook {
    const generals: Record<string, ChatLine[]> = {};
    for (const id of Object.keys(base.generals)) generals[id] = base.generals[id].slice();
    for (const id of Object.keys(extra.generals)) generals[id] = mergeLines(generals[id] ?? [], extra.generals[id]);
    return { version: Math.max(base.version, extra.version), generic: mergeLines(base.generic, extra.generic), generals };
}

/** 友誼夠了就能說到的句子（只看專屬台詞） */
export function unlockedLines(book: Readonly<ChatBook>, generalId: string, friendship: number): ChatLine[] {
    const f = Number.isFinite(friendship) ? friendship : 0;
    return (book.generals[generalId] ?? []).filter(l => (l.minFriendship ?? 0) <= f);
}

/**
 * 挑一句：先在該武將專屬台詞（友誼夠的）裡挑，沒有才用通用台詞。
 * 有第二句可選時避開 lastLineId，避免連點同一個人講同一句。沒有任何可用台詞回 null。
 */
export function pickChatLine(
    book: Readonly<ChatBook>,
    generalId: string,
    friendship: number,
    lastLineId: string | null,
    random: () => number,
): ChatPick | null {
    const own = unlockedLines(book, generalId, friendship);
    const pool = own.length > 0 ? own : book.generic.filter(l => (l.minFriendship ?? 0) <= (Number.isFinite(friendship) ? friendship : 0));
    if (pool.length === 0) return null;
    const options = pool.length > 1 && lastLineId ? pool.filter(l => l.id !== lastLineId) : pool;
    const index = Math.min(options.length - 1, Math.floor(random() * options.length));
    return { line: options[index], generic: own.length === 0 };
}

/** 哪些擁有的武將專屬台詞（友誼 0 就說得到的）還不到最低句數：台詞包要補寫的清單 */
export function generalsMissingLines(book: Readonly<ChatBook>, ownedIds: readonly string[]): string[] {
    return ownedIds.filter(id => unlockedLines(book, id, 0).length < HALL_CHAT_MIN_LINES);
}

/**
 * 台詞庫：內建底稿＋本機快取＋（連線時）伺服器同步。
 * 儲存與下載都由外面注入，這裡不碰網路與 cc。
 */
export class HallChatStore {
    private _book: ChatBook;

    constructor(bundled: Readonly<ChatBook>, private readonly _storage: ChatStorage | null = null) {
        this._book = { version: bundled.version, generic: bundled.generic.slice(), generals: { ...bundled.generals } };
        const cached = this._readCache();
        if (cached) this._book = mergeChatBooks(this._book, cached);
    }

    public get book(): Readonly<ChatBook> {
        return this._book;
    }

    /**
     * 套用下載到的台詞包：格式正確且版本比目前新才合併並寫入快取。
     * 回傳是否真的更新；格式錯誤或沒有比較新都回 false，不影響目前台詞。
     */
    public applyDownloaded(raw: unknown): boolean {
        const incoming = parseChatBook(raw);
        if (!incoming || incoming.version <= this._book.version) return false;
        this._book = mergeChatBooks(this._book, incoming);
        this._writeCache(incoming);
        return true;
    }

    /**
     * 連線時同步一次：fetcher 由外面接（沒有伺服器就傳 null，什麼都不做）。
     * 任何錯誤都吞掉並回 false —— 離線是常態，不該讓聊天壞掉。
     */
    public async sync(fetcher: (() => Promise<unknown>) | null): Promise<boolean> {
        if (!fetcher) return false;
        try {
            return this.applyDownloaded(await fetcher());
        } catch {
            return false;
        }
    }

    private _readCache(): ChatBook | null {
        if (!this._storage) return null;
        try {
            const text = this._storage.get(HALL_CHAT_CACHE_KEY);
            return text ? parseChatBook(JSON.parse(text)) : null;
        } catch {
            return null;
        }
    }

    /** 快取存的是「下載到的那份」，下次啟動再與內建底稿合併，內建更新時不會被舊快取蓋掉 */
    private _writeCache(incoming: Readonly<ChatBook>): void {
        if (!this._storage) return;
        try {
            const cached = this._readCache();
            const merged = cached ? mergeChatBooks(cached, incoming) : incoming;
            this._storage.set(HALL_CHAT_CACHE_KEY, JSON.stringify(merged));
        } catch {
            // 儲存失敗（空間滿、被停用）：這次仍用記憶體裡的版本，下次連線會再同步
        }
    }
}
