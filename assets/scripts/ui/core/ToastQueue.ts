// @spec-source → 見 docs/cross-reference-index.md；PROG-2-1775
/**
 * ToastQueue — 決定新 toast 要立刻顯示還是排隊（純邏輯，不依賴 cc）。
 *
 * 同一時間連發多句時，後一句不可蓋掉玩家還沒讀的前一句；
 * 目前這句已顯示超過 MIN_READ_SECONDS 且沒有排隊時才直接取代，保留快速點擊的即時回饋。
 *
 * Unity 對照：像通知系統的 Queue<Notification>，顯示元件只負責把 Dequeue 的內容畫出來。
 */
export const MIN_READ_SECONDS = 1.5;
export const MAX_PENDING = 6;
/** 後面還有人排隊時，每句最多停留這麼久，免得提示落後操作太多（PROG-2-9343）。30 個字的長句約需 1.8 秒讀完。 */
export const QUEUED_MAX_HOLD_SECONDS = 1.8;

/** 這一句要停留幾秒：沒人排隊照原本的長度，有人排隊就套上限 */
export function toastHoldSeconds(requestedSeconds: number, pendingCount: number): number {
    return pendingCount > 0 ? Math.min(requestedSeconds, QUEUED_MAX_HOLD_SECONDS) : requestedSeconds;
}

export class ToastQueue<T extends { message: string }> {
    private _current: T | null = null;
    private _shownAt = 0;
    private _pending: T[] = [];

    /** 回傳 true 表示呼叫端要立刻顯示；false 表示已排隊或重複被略過 */
    offer(toast: T, nowSeconds: number): boolean {
        const canReplace = nowSeconds - this._shownAt >= MIN_READ_SECONDS && this._pending.length === 0;
        if (!this._current || canReplace) {
            this._current = toast;
            this._shownAt = nowSeconds;
            return true;
        }
        const duplicated = this._current.message === toast.message
            || this._pending.some((item) => item.message === toast.message);
        if (duplicated) return false;
        this._pending.push(toast);
        if (this._pending.length > MAX_PENDING) this._pending.shift();
        return false;
    }

    /** 目前這句播完時呼叫；回傳下一句，沒有則回傳 null */
    next(nowSeconds: number): T | null {
        this._current = this._pending.shift() ?? null;
        this._shownAt = nowSeconds;
        return this._current;
    }

    /** 還在排隊、尚未顯示的句數 */
    get pendingCount(): number {
        return this._pending.length;
    }

    clear(): void {
        this._current = null;
        this._pending = [];
    }

    /** 取出目前這句（可能還沒讀完）與排隊中的全部，依顯示順序回傳並清空（PROG-2-9416：回合橫幅期間先收起） */
    drain(): T[] {
        const out = this._current ? [this._current, ...this._pending] : [...this._pending];
        this.clear();
        return out;
    }
}

/**
 * 回合橫幅期間暫停的提示：把「被收起的（較早）」與「暫停期間新來的」依先後合併，
 * 同一句只留第一次，最多保留 MAX_PENDING 句（丟掉最舊的）。純函式（PROG-2-9416）。
 */
export function mergeHeldToasts<T extends { message: string }>(earlier: readonly T[], later: readonly T[]): T[] {
    const out: T[] = [];
    for (const toast of [...earlier, ...later]) {
        if (!out.some((item) => item.message === toast.message)) out.push(toast);
    }
    return out.length > MAX_PENDING ? out.slice(out.length - MAX_PENDING) : out;
}

/**
 * 戰場提示條（QA 11/25）：長提示條停在棋盤中央好幾回合，壓住單位與血條。
 * 兩道限制（數值集中在這裡，改這兩個常數即可調整）：
 * - 單句最長停留 BATTLE_TOAST_MAX_HOLD_SEC（呼叫端傳 5 秒也只停這麼久）。
 * - 排隊或被回合橫幅暫存的提示超過 BATTLE_TOAST_STALE_SEC 還沒播，就視為過期丟掉：
 *   過了好幾秒的提示講的是上一回合的事，補播只會讓玩家以為提示一直在。
 */
export const BATTLE_TOAST_MAX_HOLD_SEC = 3.5;
export const BATTLE_TOAST_STALE_SEC = 4;
/** 戰場提示實際停留秒數：先套排隊縮短規則，再套單句上限 */
export function battleToastHoldSeconds(requestedSeconds: number, pendingCount: number): number {
    return Math.min(toastHoldSeconds(requestedSeconds, pendingCount), BATTLE_TOAST_MAX_HOLD_SEC);
}

/** 這句提示從排進去到現在是否已過期 */
export function isToastStale(queuedAtMs: number, nowMs: number, staleSec: number = BATTLE_TOAST_STALE_SEC): boolean {
    return nowMs - queuedAtMs > staleSec * 1000;
}

/** 濾掉過期的提示（保留順序）；queuedAtMs 缺值的視為剛排進去 */
export function dropStaleToasts<T extends { queuedAtMs?: number }>(toasts: readonly T[], nowMs: number, staleSec: number = BATTLE_TOAST_STALE_SEC): T[] {
    return toasts.filter((toast) => toast.queuedAtMs === undefined || !isToastStale(toast.queuedAtMs, nowMs, staleSec));
}
