// @spec-source → AI武將強度系統.md F-3 AI SP 充能（公平修正）；數值系統.md SP_PER_KILL（PROG-2-0920）
/**
 * AiSpCharge — AI 武將擊殺充能的難度倍率（純邏輯，不依賴 cc）
 *
 * 規格：AI_SP_Gain_Per_Kill = SP_PER_KILL × Difficulty_SP_Mod。
 * 玩家擊殺仍是固定 SP_PER_KILL，不套用這裡的倍率。
 *
 * Unity 對照：像 Difficulty ScriptableObject 只對 AI 的 Charge 欄位乘一個係數，玩家的 Charge 不動。
 */
import { SP_PER_KILL } from '../config/Constants';

export type AiDifficulty = 'easy' | 'normal' | 'hard' | 'nightmare' | 'hell';

/** 規格 F-3：各難度的 SP 充能倍率 */
export const AI_DIFFICULTY_SP_MOD: Readonly<Record<AiDifficulty, number>> = {
    easy: 0.8,
    normal: 1.0,
    hard: 1.2,
    nightmare: 1.3,
    hell: 1.5,
};

/** AI 每次擊殺獲得的 SP；小數無條件捨去，避免 SP 出現小數 */
export function aiSpGainPerKill(difficulty: AiDifficulty = 'normal'): number {
    return Math.floor(SP_PER_KILL * AI_DIFFICULTY_SP_MOD[difficulty]);
}
