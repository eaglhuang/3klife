// @spec-source → AI武將強度系統.md「奧義使用決策」AI_UseUltimate；WBS AIS-07；PROG-2-9723（總PM 11/22 裁決：精力門檻改比例）
/**
 * AiUltimateDecision — 武將是否施放奧義（純邏輯，不依賴 cc）。敵方 AI 與委任代打共用同一套。
 *
 * 規則（規格偽碼）：
 * - 低 IQ（LOW）：不主動施放。
 * - 中 IQ（MEDIUM）：精力 > 最大精力 × mediumVitalityRatio（預設 50%）且場上敵方 > 3 時施放。
 * - 高 IQ（HIGH 以上）：可擊殺 ≥ 2 支，或處於劣勢且精力 > 最大精力 × highLosingVitalityRatio（預設 30%）時施放。
 *
 * 精力門檻用比例：男將精力上限 120、女將 100，用絕對值會讓女將較早達標，改比例後同比例判斷一致。
 * 比例值放在 assets/resources/data/ai-difficulty.json 的 ultimateRules，這裡不寫死。
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

/** 奧義精力門檻比例（ai-difficulty.json ultimateRules）；值域 0~1 */
export interface AiUltimateRules {
    /** 中 IQ：精力需大於最大精力的這個比例 */
    mediumVitalityRatio: number;
    /** 高 IQ 落後時：精力需大於最大精力的這個比例 */
    highLosingVitalityRatio: number;
}

export interface AiUltimateDecisionInput {
    iq: AiIqLevel;
    /** 武將目前精力（general.vitality） */
    vitality: number;
    /** 武將精力上限（general.maxVitality），門檻以它換算 */
    maxVitality: number;
    /** 場上敵方（施放者的對手）單位數 */
    enemyCount: number;
    /** 奧義預估可擊殺數（呼叫端估算） */
    estimatedKills: number;
    /** 我方總兵力是否低於敵方 */
    isLosing: boolean;
    /** 精力門檻比例（來自難度表） */
    rules: AiUltimateRules;
}

/** 規格：中 IQ 的敵方數門檻 */
export const ULTIMATE_MEDIUM_ENEMY_COUNT = 3;
/** 規格：高 IQ 的擊殺門檻 */
export const ULTIMATE_HIGH_KILL_COUNT = 2;

/** 解析 ai-difficulty.json 的 ultimateRules；缺欄位或超出 0~1 回傳 null */
export function parseAiUltimateRules(raw: unknown): AiUltimateRules | null {
    const rules = (raw as { ultimateRules?: Partial<AiUltimateRules> } | null)?.ultimateRules;
    if (!rules) return null;
    const inUnit = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
    if (!inUnit(rules.mediumVitalityRatio) || !inUnit(rules.highLosingVitalityRatio)) return null;
    return { mediumVitalityRatio: rules.mediumVitalityRatio, highLosingVitalityRatio: rules.highLosingVitalityRatio };
}

export function aiShouldUseUltimate(input: AiUltimateDecisionInput): boolean {
    if (input.iq === 'LOW') return false;
    if (input.iq === 'MEDIUM') {
        return input.vitality > input.maxVitality * input.rules.mediumVitalityRatio && input.enemyCount > ULTIMATE_MEDIUM_ENEMY_COUNT;
    }
    return input.estimatedKills >= ULTIMATE_HIGH_KILL_COUNT
        || (input.isLosing && input.vitality > input.maxVitality * input.rules.highLosingVitalityRatio);
}
