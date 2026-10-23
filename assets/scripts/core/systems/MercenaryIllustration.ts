// @spec-source → 傭兵系統（試用）.md §H 插畫進度（Illustration_Stage 1~5）、§F 6 日數值（Bond_Max = 60）；PROG-2-0968（MERC-08）
/**
 * MercenaryIllustration — 傭兵插畫進度（純邏輯，不依賴 cc）
 *
 * 好感度 0~60（6 日滿）分成五段，每段 12 點，對應插畫階段 1~5。
 * 規格範例：Bond 30 → Illustration_Stage 3，與此分段一致。
 *
 * 暫定：五段等分 12 點是依規格範例推出的分段，規格沒有寫明門檻；待企劃定案後改常數即可。
 * 插畫資產與 D3/D4 文案不在本卡，只回傳階段數。
 *
 * Unity 對照：像 Animator 的狀態機，好感度決定目前播到第幾張插圖，不回退。
 */

export const ILLUSTRATION_STAGE_MIN = 1;
export const ILLUSTRATION_STAGE_MAX = 5;
/** 好感度滿值（Bond_Max，規格 F 節 6 日滿） */
export const ILLUSTRATION_BOND_MAX = 60;
/** 每階段需要的好感度（暫定：60 ÷ 5） */
export const ILLUSTRATION_BOND_PER_STAGE = ILLUSTRATION_BOND_MAX / ILLUSTRATION_STAGE_MAX;

/** 好感度 → 插畫階段（1~5）；好感度為負、非有限時視為 1，超過滿值視為 5 */
export function illustrationStageOf(bond: number): number {
    if (!Number.isFinite(bond) || bond < 0) return ILLUSTRATION_STAGE_MIN;
    const stage = Math.floor(bond / ILLUSTRATION_BOND_PER_STAGE) + 1;
    return Math.min(ILLUSTRATION_STAGE_MAX, stage);
}

/**
 * 插畫階段只進不退：取目前已解鎖階段與好感度推出的階段中較大者。
 * 例如結義後好感度不會下降，但若存檔的階段已大於好感度推出的階段，仍保留較大值。
 */
export function advanceIllustrationStage(current: number, bond: number): number {
    const safeCurrent = Number.isFinite(current) ? Math.min(ILLUSTRATION_STAGE_MAX, Math.max(ILLUSTRATION_STAGE_MIN, Math.floor(current))) : ILLUSTRATION_STAGE_MIN;
    return Math.max(safeCurrent, illustrationStageOf(bond));
}
