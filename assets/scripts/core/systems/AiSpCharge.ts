// @spec-source → AI武將強度系統.md F-3 AI SP 充能（公平修正）；數值系統.md SP_PER_KILL（PROG-2-0920）；AIS-12 改讀難度表
/**
 * AiSpCharge — AI 武將擊殺充能（純邏輯，不依賴 cc）
 *
 * 規格：AI_SP_Gain_Per_Kill = SP_PER_KILL × Difficulty_SP_Mod。
 * 倍率來自難度表 ai-difficulty.json 的 spGainModifier（PROG-2-1327 之後的 AIS-12 起不再於程式寫死）。
 * 玩家擊殺仍是固定 SP_PER_KILL，不套用這裡的倍率。
 *
 * Unity 對照：像 Difficulty ScriptableObject 只對 AI 的 Charge 欄位乘一個係數，玩家的 Charge 不動。
 */
import { SP_PER_KILL } from '../config/Constants';
import { AI_DIFFICULTY_IDS } from './AiDifficultyTable';

export type AiDifficulty = 'easy' | 'normal' | 'hard' | 'nightmare' | 'hell';

/**
 * 戰鬥入口難度解析（PROG-2-0921）：依序取第一個合法值（入口參數 → 遭遇資料），都沒有則 NORMAL。
 * 不合法的字串（例如拼錯）會略過，不會讓戰鬥以未知倍率開打。
 */
export function resolveAiDifficulty(...sources: Array<string | null | undefined>): AiDifficulty {
    for (const source of sources) {
        if (source && (AI_DIFFICULTY_IDS as readonly string[]).includes(source)) return source as AiDifficulty;
    }
    return 'normal';
}

/** AI 每次擊殺獲得的 SP（spGainModifier 來自難度表）；小數無條件捨去，避免 SP 出現小數 */
export function aiSpGainPerKill(spGainModifier: number): number {
    return Math.floor(SP_PER_KILL * spGainModifier);
}
