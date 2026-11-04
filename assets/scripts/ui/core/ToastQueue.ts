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

    clear(): void {
        this._current = null;
        this._pending = [];
    }
}
