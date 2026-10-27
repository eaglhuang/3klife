// @spec-source → 留存系統.md §F 插畫解鎖條件（1 見面 / 2 交手 1場戰鬥 / 3 認同 戰勝3場 / 4 信任 Bond≥40 / 5 結義 轉永久）；傭兵系統（試用）.md §H；PROG-2-0968（MERC-08）；PROG-2-1215（RET-01）
/**
 * MercenaryIllustration — 傭兵插畫五階段（純邏輯，不依賴 cc）
 *
 * 依規格表的觸發條件推進階段，單一標準：
 * - 階段 1 見面：傭兵獲得即達成。
 * - 階段 2 交手：參與過 1 場戰鬥。
 * - 階段 3 認同：戰勝 3 場。
 * - 階段 4 信任：好感（規格的 Bond）≥ 40。
 * - 階段 5 結義：轉為永久（status = Bonded）。
 *
 * 暫定：
 * - 各階段的條件獨立判斷，取達成條件中最高的階段（規格表沒有寫先後依賴，所以不要求逐階達成）。
 * - 好感度沿用 MercenaryAffection 的 0~60，規格寫的 Bond 指的就是這個值。
 * - 戰鬥次數與勝場目前由呼叫端傳入，傭兵狀態尚未記錄，需另卡接戰鬥結算。
 *
 * Unity 對照：像 Animator 的狀態機，每個條件是一條 Transition，條件滿足才往下跳，不回退。
 */

export const ILLUSTRATION_STAGE_MIN = 1;
export const ILLUSTRATION_STAGE_MAX = 5;
/** 好感度滿值（Bond_Max，規格 F 節 6 日滿） */
export const ILLUSTRATION_BOND_MAX = 60;

/** 規格門檻 */
export const ILLUSTRATION_BATTLES_FOR_STAGE_2 = 1;
export const ILLUSTRATION_WINS_FOR_STAGE_3 = 3;
export const ILLUSTRATION_AFFECTION_FOR_STAGE_4 = 40;

export interface IllustrationProgress {
    /** 參與過的戰鬥場數 */
    battles: number;
    /** 戰勝場數 */
    wins: number;
    /** 好感度（Bond）0~60 */
    affection: number;
    /** 是否已轉為永久（結義） */
    bonded: boolean;
}

/** 由目前進度推出的插畫階段（1~5）：取各階段條件達成者中最高的一階 */
export function illustrationStageOf(progress: Readonly<IllustrationProgress>): number {
    if (progress.bonded) return 5;
    if (progress.affection >= ILLUSTRATION_AFFECTION_FOR_STAGE_4) return 4;
    if (progress.wins >= ILLUSTRATION_WINS_FOR_STAGE_3) return 3;
    if (progress.battles >= ILLUSTRATION_BATTLES_FOR_STAGE_2) return 2;
    return ILLUSTRATION_STAGE_MIN;
}

/**
 * 插畫階段只進不退：取目前已解鎖階段與進度推出的階段中較大者。
 * 舊存檔的階段依舊有效；進度不足時不會被降階。
 */
export function advanceIllustrationStage(current: number, progress: Readonly<IllustrationProgress>): number {
    const safeCurrent = Number.isFinite(current) ? Math.min(ILLUSTRATION_STAGE_MAX, Math.max(ILLUSTRATION_STAGE_MIN, Math.floor(current))) : ILLUSTRATION_STAGE_MIN;
    return Math.max(safeCurrent, illustrationStageOf(progress));
}
