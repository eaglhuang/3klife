// @spec-source → PROG-2-2236（issue #2086 第 3 項：換人時殘留上一位立繪／佔位剪影）
/**
 * 立繪框換人時的顯示守衛：每個框記住「目前畫面上是誰」。
 * 換成另一位時，新圖載完前先把框藏起來，不讓上一位或版面預設的剪影冒充新武將；
 * 同一位重刷（例如台詞逐字浮現）則不藏，避免閃爍。
 */
export class PortraitSwapGuard {
    private readonly _shown = new Map<string, string>();

    /** 開始載入 slot 的 key；回傳 true 表示畫面上不是這一位，載完前要先藏起來。 */
    public begin(slot: string, key: string): boolean {
        return this._shown.get(slot) !== key;
    }

    /** 新圖已套上，記下目前顯示的是誰。 */
    public shown(slot: string, key: string): void {
        this._shown.set(slot, key);
    }

    /** 換人後還沒載到圖（載入失敗或被更新的請求取代）時，框維持隱藏，下次要重新判斷。 */
    public clear(slot: string): void {
        this._shown.delete(slot);
    }
}
