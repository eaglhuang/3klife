// @spec-source → 兵種（虎符）系統 §功能清單 #11 虎符圖鑑（P2：收集與展示所有已獲虎符）（TRP-20，PROG-2-1934）
/**
 * EliteTroopCodexCollection — 虎符圖鑑「已獲」狀態（純邏輯，不依賴 cc）。
 *
 * - 名錄（EliteTroopCodex）是靜態 34 筆；本模組只記玩家已獲得哪些 id、何時首獲。
 * - 名錄外的 id 不收錄（避免存檔被未知 id 污染）；重複獲得只保留首獲時間。
 * - progress 回傳已獲／總數，供圖鑑頁與「收藏家」成就使用。
 *
 * 暫定：委任 AI 依智力／糧草決定出展時機，門檻細節歸 doc_spec_0040 尚未給，另卡。
 * Unity 對照：像一個 HashSet<string> 收藏表，搭配一份唯讀名錄做白名單。
 */

export interface EliteTroopCodexSave {
    /** id → 首獲時間（毫秒） */
    acquired: Record<string, number>;
}

export interface EliteTroopCodexProgress {
    acquired: number;
    total: number;
    complete: boolean;
}

export class EliteTroopCodexCollection {
    private readonly _catalog: ReadonlySet<string>;
    private readonly _acquired = new Map<string, number>();

    constructor(catalogIds: readonly string[], save?: Readonly<EliteTroopCodexSave>) {
        this._catalog = new Set(catalogIds);
        for (const [id, at] of Object.entries(save?.acquired ?? {})) {
            if (this._catalog.has(id) && Number.isFinite(at)) this._acquired.set(id, at);
        }
    }

    /** 記錄獲得；回傳 true 代表首次獲得。名錄外 id 回傳 false。 */
    public markAcquired(id: string, nowMs: number): boolean {
        if (!this._catalog.has(id) || this._acquired.has(id)) return false;
        this._acquired.set(id, nowMs);
        return true;
    }

    public isAcquired(id: string): boolean {
        return this._acquired.has(id);
    }

    public firstAcquiredAt(id: string): number | null {
        return this._acquired.get(id) ?? null;
    }

    public progress(): EliteTroopCodexProgress {
        const total = this._catalog.size;
        const acquired = this._acquired.size;
        return { acquired, total, complete: total > 0 && acquired === total };
    }

    public toSave(): EliteTroopCodexSave {
        return { acquired: Object.fromEntries(this._acquired) };
    }
}
