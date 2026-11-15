// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（點武將聊天泡泡）；PROG-2-2252
/**
 * HallBubbleState — 大廳聊天泡泡的開關狀態機，純 TS，不依賴 cc。
 *
 * 只有一個泡泡節點，所以同一時間最多一個泡泡：
 *   - open(actorId)：開新泡泡或換人；回傳被擠掉的上一位武將，呼叫端要替他放行（停住的武將繼續走）。
 *   - 連點同一位：不疊，只刷新內容與計時（回傳的 previous 等於自己，呼叫端不必放行）。
 *   - expire(token)：計時到期。只有最後一次 open 發出的計時有效，舊計時晚到不會關掉新泡泡。
 *   - close()：手動關閉（點泡泡、開其他面板、離開大廳）。
 */
export interface BubbleOpenResult {
    /** 原本開著泡泡的武將（可能與本次相同，呼叫端需判斷；沒有則為 null）；換人時呼叫端要放行它 */
    previous: string | null;
    /** 本次開啟的計時代號，計時到期時回傳給 expire() */
    token: number;
}

export class HallBubbleState {
    private _actorId: string | null = null;
    private _token = 0;

    /** 目前開著泡泡的武將；沒開為 null */
    public get actorId(): string | null {
        return this._actorId;
    }

    public get isOpen(): boolean {
        return this._actorId !== null;
    }

    public open(actorId: string): BubbleOpenResult {
        const previous = this._actorId;
        this._actorId = actorId;
        this._token += 1;
        return { previous, token: this._token };
    }

    /** 手動關閉：回傳原本開著泡泡的武將（要放行）；沒開就回 null */
    public close(): string | null {
        const actor = this._actorId;
        this._actorId = null;
        this._token += 1;
        return actor;
    }

    /** 計時到期：代號對不上（已被新泡泡取代或已關）就不動，回 null；對得上才關閉並回傳武將 */
    public expire(token: number): string | null {
        if (token !== this._token || this._actorId === null) return null;
        return this.close();
    }
}
