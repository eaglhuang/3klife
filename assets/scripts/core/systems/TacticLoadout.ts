/**
 * 戰法槽位（NUR-10 部分）。純邏輯，不依賴 cc。
 *
 * 規格：docs/遊戲規格文件/系統規格書/培育系統.md §F-7 戰法槽位
 *   表格：智力 1–29 → 1 槽；30–59 → 2 槽；60–89 → 3 槽；90–99 → 4 槽（目前上限）
 *   §F-7 公式寫 max(1, floor(INT / 30))，與表格不一致；本檔採表格：1 + floor(INT / 30)，見卡 PROG-2-0532。
 *
 * Unity 對照：像一個 Lookup Table，依 INT 輸出可裝備的 Slot 數。
 */

/** 目前上限（規格：4 槽） */
export const TACTIC_LOADOUT_MAX = 4;

/** 每 30 點智力多一槽，起始 1 槽 */
const INT_PER_SLOT = 30;

/**
 * 武將可裝備的戰法槽位數。
 * 非有限值、負數視為 0 智力（1 槽）；超過上限的智力以上限計。
 */
export function tacticLoadoutCapacity(intelligence: number): number {
    const int = Number.isFinite(intelligence) && intelligence > 0 ? intelligence : 0;
    const slots = 1 + Math.floor(int / INT_PER_SLOT);
    return Math.min(slots, TACTIC_LOADOUT_MAX);
}
