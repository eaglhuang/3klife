// @spec-source → 大廳系統 F-5（任務情報度與委任狀態）；WBS HALL-05；PROG-2-0465
/**
 * HallTaskIntel — 任務情報度與委任狀態的判斷（純邏輯，不依賴 cc）。
 *
 * - 情報度預設 50，夾在 0~100（F-5）。
 * - 100 才能看完整內容、獎勵與耗費；未滿 100 才能再探。
 * - 委任（AI_Assign_Enabled）由任務資料決定，只回答「是否開啟」。
 * - Required_Intel（可見性）與 Intel_Reveal_Percent（內容揭露）是兩件事，這裡不混用。
 *
 * Unity 對照：像一組 static 工具函式，UI 只問「可不可以按」，不自己算數。
 */

export const HALL_INTEL_DEFAULT_PERCENT = 50;
export const HALL_INTEL_FULL_PERCENT = 100;

export interface HallTaskIntelInput {
    Intel_Reveal_Percent?: number;
    AI_Assign_Enabled?: boolean;
}

/** 情報度：缺值或非數字時用預設 50，超出範圍夾回 0~100。 */
export function getHallTaskIntelRevealPercent(task: Readonly<HallTaskIntelInput>): number {
    const value = task.Intel_Reveal_Percent;
    if (typeof value !== 'number' || !Number.isFinite(value)) return HALL_INTEL_DEFAULT_PERCENT;
    return Math.max(0, Math.min(value, HALL_INTEL_FULL_PERCENT));
}

/** 完整內容、完整獎勵與耗費只在情報度 100 時開放。 */
export function canRevealFullHallTask(task: Readonly<HallTaskIntelInput>): boolean {
    return getHallTaskIntelRevealPercent(task) >= HALL_INTEL_FULL_PERCENT;
}

/** 再探只在情報未滿 100 時可用。 */
export function canUseReconAction(task: Readonly<HallTaskIntelInput>): boolean {
    return getHallTaskIntelRevealPercent(task) < HALL_INTEL_FULL_PERCENT;
}

/** 委任開關：只有明確為 true 才開啟。 */
export function isAutoAssignEnabled(task: Readonly<HallTaskIntelInput>): boolean {
    return task.AI_Assign_Enabled === true;
}
