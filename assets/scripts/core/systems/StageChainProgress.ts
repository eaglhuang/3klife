// @spec-source → 關卡設計系統.md §C-1 連環破主鏈（PROG-2-0214，WBS LVL-02 純邏輯部分）
/**
 * StageChainProgress — 連環破主鏈的順序解鎖判定（純邏輯，不依賴 cc）
 *
 * 規格：挑戰關卡可由多個子關卡串接成連環破主鏈，玩家需按正式順序完成前置關卡，才能解鎖後續 Boss 關卡。
 * 判定只讀「已通關集合」，不改存檔或場景。持久化與關卡資料的 chain 欄位留待後續卡。
 *
 * Unity 對照：像一條依序解鎖的 Level Gate，輸入通關清單，輸出每關是否可進入。
 */

export interface ChainStage {
    id: string;
    /** 所屬主鏈；沒有 chainId 的關卡是獨立關卡 */
    chainId?: string;
    /** 主鏈內的順序，越小越前面 */
    order?: number;
}

/**
 * 某關卡是否可進入。
 * - 找不到的關卡：不解鎖。
 * - 獨立關卡（沒有 chainId）：永遠解鎖。
 * - 主鏈第一關（同鏈 order 最小）：永遠解鎖。
 * - 其他：同鏈中 order 前一關已通關才解鎖；跳關通關不算。
 */
export function isStageUnlocked(stageId: string, stages: readonly ChainStage[], cleared: ReadonlySet<string>): boolean {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return false;
    if (!stage.chainId) return true;
    const chain = stages.filter((s) => s.chainId === stage.chainId);
    const order = stage.order ?? 0;
    const previous = chain.filter((s) => (s.order ?? 0) < order).sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];
    if (!previous) return true;
    return cleared.has(previous.id);
}

/** 標記通關，回傳新集合；不改原集合 */
export function markStageCleared(cleared: ReadonlySet<string>, stageId: string): Set<string> {
    const next = new Set(cleared);
    next.add(stageId);
    return next;
}
