// @spec-source → AI武將強度系統.md F-1「AI 戰力評估公式」與難度匹配 ±20%；WBS AIS-09
/**
 * AiPowerMatch — AI 武將戰力評估（F-1 evaluateAIPower）與 ±20% 縮放匹配（純邏輯，不依賴 cc）
 *
 * 命名區分（PM 裁定）：本檔的 evaluateAiPower 只給 AI 匹配用；出征預測的戰力沿用 BattlePowerRating.calculateBattlePowerRating，兩者用途不同。
 *
 * 規則：
 * - 戰力 = 六維屬性總和 + 虎符兵種戰力 + 戰法（計謀點 × 10 相加）+ 轉生 × 2000 + 年齡修正 × 1000。
 * - AI 總戰力與玩家戰力的差超過 20% 時，把縮放倍率往 ±20% 邊界拉回，並夾在 0.7 ~ 2.5 內。
 *
 * 暫定（可逆）：
 * - 虎符兵種戰力目前模板資料沒有 equippedTally，呼叫端不傳就是 0。
 * - 縮放調整以「目前縮放後的 AI 戰力」為基準，把 AI 戰力拉到玩家 ×1.2 或 ×0.8 的邊界。
 * - 縮放以整體戰力乘算近似（連同轉生與年齡常數項一起乘），實際上只有屬性會被縮放；精確做法待 PM 確認。
 *
 * Unity 對照：像比較兩個角色的 CombatPower 數值，超出容許範圍就調整敵方 StatMultiplier，再夾在設計師設定的上下限內。
 */
import { AI_AGE_MODIFIER, type AiAgeStage } from './AiStatScaling';

export const AI_POWER_MATCH_TOLERANCE = 0.2;
export const AI_POWER_TACTIC_COST_WEIGHT = 10;
export const AI_POWER_REINCARNATION_WEIGHT = 2000;
export const AI_POWER_AGE_WEIGHT = 1000;
export const AI_SCALE_MIN = 0.7;
export const AI_SCALE_MAX = 2.5;

export interface AiPowerInput {
    str: number;
    int: number;
    lea: number;
    pol: number;
    cha: number;
    luk: number;
    ageStage: AiAgeStage;
    /** 每個戰法的計謀點成本（沒有戰法就是空陣列） */
    tacticTpCosts: readonly number[];
    reincarnation: number;
    /** 虎符兵種戰力（攻擊＋防禦）；沒有虎符時傳 0 */
    tallyPower?: number;
}

/** F-1 evaluateAIPower：AI 的總戰力（匹配用） */
export function evaluateAiPower(input: AiPowerInput): number {
    const statSum = input.str + input.int + input.lea + input.pol + input.cha + input.luk;
    const tacticBonus = input.tacticTpCosts.reduce((sum, cost) => sum + cost * AI_POWER_TACTIC_COST_WEIGHT, 0);
    const reincarnationBonus = input.reincarnation * AI_POWER_REINCARNATION_WEIGHT;
    const ageBonus = AI_AGE_MODIFIER[input.ageStage] * AI_POWER_AGE_WEIGHT;
    return statSum + (input.tallyPower ?? 0) + tacticBonus + reincarnationBonus + ageBonus;
}

/**
 * 難度匹配（F-1）：AI 戰力與玩家戰力差在 ±20% 內時維持原縮放；超出時把 AI 戰力拉回邊界，
 * 回傳新的縮放倍率（夾在 0.7 ~ 2.5）。aiBasePower 為未縮放的模板戰力，currentScale 為縮放倍率。
 */
export function matchAiScaleToPlayerPower(aiBasePower: number, currentScale: number, playerPower: number): number {
    if (aiBasePower <= 0 || playerPower <= 0) return currentScale;
    const aiPower = aiBasePower * currentScale;
    const diff = Math.abs(aiPower - playerPower) / playerPower;
    if (diff <= AI_POWER_MATCH_TOLERANCE) return currentScale;

    const bound = aiPower > playerPower
        ? playerPower * (1 + AI_POWER_MATCH_TOLERANCE)
        : playerPower * (1 - AI_POWER_MATCH_TOLERANCE);
    const adjusted = currentScale * (bound / aiPower);
    return Math.min(AI_SCALE_MAX, Math.max(AI_SCALE_MIN, adjusted));
}
