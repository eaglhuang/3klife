/**
 * 延遲插槽切換的序列化（純流程，不依賴 cc）。
 *
 * 同一個插槽一次只跑一個切換：前一次「清舊內容 → 載入 → 建新內容」做完，下一次才開始，
 * 避免兩份片段同時掛在同一插槽（PROG-2-9037，轉蛋右側面板疊字）。
 * 排隊期間若又有新請求，過期的請求直接略過，只有最後一次會真正執行。
 *
 * Unity 對照：同一個 ContentHost 一次只 Instantiate 一個 SubView，切換期間鎖住它。
 */
export class LazySlotSerialQueue<K extends object> {
    private readonly _tail = new WeakMap<K, Promise<void>>();
    private readonly _latest = new WeakMap<K, number>();
    private _ticket = 0;

    /** 排入一次切換；回傳的 Promise 在該次真正執行完（或因過期被略過）時 resolve。 */
    public run(key: K, job: () => Promise<void>): Promise<void> {
        const ticket = ++this._ticket;
        this._latest.set(key, ticket);
        const previous = this._tail.get(key) ?? Promise.resolve();
        const next = previous.then(() => {
            if (this._latest.get(key) !== ticket) return undefined;
            return job();
        });
        // 前一個失敗不應卡住後面的切換
        this._tail.set(key, next.catch(() => undefined));
        return next;
    }
}
