// @spec-source → AI武將強度系統.md「奧義使用決策」AI_UseUltimate；WBS AIS-07
/**
 * AiUltimateDecision — AI 武將是否施放奧義（純邏輯，不依賴 cc）
 *
 * 規則（規格偽碼）：
 * - 低 IQ（LOW）：不主動施放。
 * - 中 IQ（MEDIUM）：精力 > 50 且場上敵方 > 3 時施放。
 * - 高 IQ（HIGH 以上）：可擊殺 ≥ 2 支，或處於劣勢且精力 > 30 時施放。
 *
 * PM 暫定（可逆）：
 * - ai.vitality 以武將目前精力（general.vitality）計算，奧義實際扣的也是精力。
 * - IQ 由難度表 aiIq 決定；EXTREME、PERFECT 暫與 HIGH 同規則。
 * - estimatedKills（規格未定義 estimateUltKills）由呼叫端估算後傳入。
 * - isLosing＝我方總兵力低於敵方總兵力，由呼叫端判定。
 *
 * Unity 對照：像 AI 的 Ability 決策節點，依難度 ScriptableObject 的 IQ 選不同分支，條件不成立就不 Cast。
 */
import type { AiIqLevel } from './AiDifficultyTable';

export interface AiUltimateDecisionInput {
    iq: AiIqLevel;
    /** 武將目前精力（ai.vitality） */
    vitality: number;
    /** 場上敵方（玩家方）單位數 */
    enemyCount: number;
    /** 奧義預估可擊殺數（呼叫端估算） */
    estimatedKills: number;
    /** 我方總兵力是否低於敵方 */
    isLosing: boolean;
}

/** 規格：中 IQ 的精力門檻與敵方數門檻 */
export const ULTIMATE_MEDIUM_VITALITY = 50;
export const ULTIMATE_MEDIUM_ENEMY_COUNT = 3;
/** 規格：高 IQ 的擊殺門檻與落後時的精力門檻 */
export const ULTIMATE_HIGH_KILL_COUNT = 2;
export const ULTIMATE_HIGH_LOSING_VITALITY = 30;

export function aiShouldUseUltimate(input: AiUltimateDecisionInput): boolean {
    if (input.iq === 'LOW') return false;
    if (input.iq === 'MEDIUM') {
        return input.vitality > ULTIMATE_MEDIUM_VITALITY && input.enemyCount > ULTIMATE_MEDIUM_ENEMY_COUNT;
    }
    return input.estimatedKills >= ULTIMATE_HIGH_KILL_COUNT
        || (input.isLosing && input.vitality > ULTIMATE_HIGH_LOSING_VITALITY);
}
