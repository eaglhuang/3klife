// @spec-source → 主戰場UI規格書 §4.2 結算窗；PROG-2-9132（戰後非同步結算列早於結算窗掛載完成時不可被丟掉）
/**
 * ResultDetailsBuffer — 結算窗細項的暫存區（純邏輯，不依賴 cc）。
 *
 * 結算窗 show() 要等範本掛載完成才算「已顯示」，但戰後結算（recordBattle）的非同步結果常常更早回來；
 * 這段空窗期追加的列若直接丟掉，玩家就看不到（單挑名聲、虎符產出等）。這裡先存起來，顯示完成時一次吐出。
 *
 * Unity 對照：像 UI 還沒 Awake 時先把訊息丟進佇列，OnEnable 再統一 flush。
 */
export class ResultDetailsBuffer {
    private pending: string[] = [];
    private shown = false;

    /** 追加列：已顯示就回傳可立刻寫入畫面的列；尚未顯示就暫存並回傳空陣列 */
    public push(lines: readonly string[]): string[] {
        if (lines.length === 0) return [];
        if (this.shown) return [...lines];
        this.pending.push(...lines);
        return [];
    }

    /** 結算窗顯示完成：標記已顯示，回傳暫存的列（只吐一次） */
    public markShown(): string[] {
        this.shown = true;
        const flushed = this.pending;
        this.pending = [];
        return flushed;
    }

    /** 結算窗關閉：清空暫存並回到未顯示 */
    public reset(): void {
        this.shown = false;
        this.pending = [];
    }
}
