// @spec-source → AI武將強度系統.md (doc_data_0002) E-2b「AI_SpecialTroopPower」、F-1「evaluateAIPower」（PROG-2-1471）
/**
 * AiPowerEvaluation — AI 特殊兵種戰力與 AI 武將總戰力評估（純邏輯，不依賴 cc）
 *
 * 規格公式：
 * - 特殊兵種攻 = 兵種攻 × 品質 × (1 + 星 × 0.08) × (1 + 屬性修正) × 適性 × 共鳴；防禦的屬性修正取一半。
 * - 屬性修正 = (主屬性 × 0.7 + 副屬性 × 0.3) / 1000，主副屬性依兵種對照（STAT_MAPPING）。
 * - AI 總戰力 = 六圍總和 + (特殊兵種攻 + 防) × 2 + 戰法 TP × 10 + 轉生 × 2000 + 年齡修正 × 1000。
 * - 難度匹配：|AI − 玩家| / 玩家 ≤ 0.2（NORMAL）。
 *
 * 常數（品質、星級、適性、共鳴、年齡）一律讀 BATTLE_POWER_CONSTANTS，與玩家戰力同一來源。
 *
 * 暫定（可逆）：適性缺值視為 B；玩家戰力 ≤ 0 時差距視為 Infinity。
 *
 * Unity 對照：像 AI 的 PowerEvaluator，給匹配系統與回合結算排序用的單一分數。
 */
import { BATTLE_POWER_CONSTANTS, type AgePhase, type AptitudeGrade, type TallyQuality } from './BattlePowerRating';
import type { AiTroopCode } from './AiProfiles';

export type AiStatKey = 'STR' | 'INT' | 'LEA' | 'POL' | 'CHA' | 'LUK';
export type AiGeneralStats = Readonly<Record<AiStatKey, number>>;

/** 規格 E-2b：兵種 → [主屬性, 副屬性] */
export const AI_TROOP_STAT_MAPPING: Readonly<Record<AiTroopCode, readonly [AiStatKey, AiStatKey]>> = Object.freeze({
    CAVALRY: ['STR', 'LEA'],
    INFANTRY: ['STR', 'LEA'],
    SHIELD: ['LEA', 'STR'],
    PIKE: ['STR', 'LEA'],
    ARCHER: ['INT', 'LEA'],
    SIEGE: ['INT', 'LEA'],
    NAVY: ['LEA', 'CHA'],
});

export const AI_STAT_BONUS_PRIMARY_WEIGHT = 0.7;
export const AI_STAT_BONUS_SECONDARY_WEIGHT = 0.3;
export const AI_STAT_BONUS_DIVISOR = 1000;
/** 防禦只吃一半屬性修正 */
export const AI_DEFENSE_STAT_BONUS_RATE = 0.5;

export const AI_POWER_TROOP_WEIGHT = 2;
export const AI_POWER_TACTIC_TP_WEIGHT = 10;
export const AI_POWER_REINCARNATION_WEIGHT = 2000;
export const AI_POWER_AGE_WEIGHT = 1000;
/** NORMAL 難度匹配容許差距 */
export const AI_POWER_MATCH_TOLERANCE = 0.2;

/** 暫定：缺適性時的預設等級（與 AiTallySelection 一致） */
export const AI_POWER_DEFAULT_APTITUDE: AptitudeGrade = 'B';

export function aiGeneralStatBonus(stats: AiGeneralStats, baseType: AiTroopCode): number {
    const [primary, secondary] = AI_TROOP_STAT_MAPPING[baseType] ?? AI_TROOP_STAT_MAPPING.CAVALRY;
    return (stats[primary] * AI_STAT_BONUS_PRIMARY_WEIGHT + stats[secondary] * AI_STAT_BONUS_SECONDARY_WEIGHT)
        / AI_STAT_BONUS_DIVISOR;
}

export interface AiSpecialTroopInput {
    stats: AiGeneralStats;
    baseType: AiTroopCode;
    /** 武將對此兵種的適性；缺值視為 B */
    aptitude?: AptitudeGrade | null;
    troopAttack: number;
    troopDefense: number;
    quality: TallyQuality;
    star: number;
    /** 裝備者與虎符原名將有血脈／史實羈絆 */
    resonance: boolean;
}

export interface AiTroopPower {
    attack: number;
    defense: number;
}

export function aiSpecialTroopPower(input: AiSpecialTroopInput): AiTroopPower {
    const C = BATTLE_POWER_CONSTANTS;
    const qualityMod = C.TALLY_QUALITY_MOD[input.quality];
    const starMod = 1 + input.star * C.TALLY_STAR_MOD_PER_STAR;
    const statBonus = aiGeneralStatBonus(input.stats, input.baseType);
    const aptitude = C.APTITUDE_EFFICIENCY[input.aptitude ?? AI_POWER_DEFAULT_APTITUDE];
    const resonanceMod = input.resonance ? C.TALLY_RESONANCE_MOD : 1;
    const common = qualityMod * starMod * aptitude * resonanceMod;
    return {
        attack: Math.floor(input.troopAttack * common * (1 + statBonus)),
        defense: Math.floor(input.troopDefense * common * (1 + statBonus * AI_DEFENSE_STAT_BONUS_RATE)),
    };
}

export interface AiPowerInput {
    stats: AiGeneralStats;
    /** 已裝備虎符的特殊兵種戰力；沒裝備為 null */
    specialTroop: AiTroopPower | null;
    /** 已裝備戰法的 TP 消耗 */
    tacticTpCosts: readonly number[];
    reincarnation: number;
    agePhase: AgePhase;
}

export function evaluateAiPower(input: AiPowerInput): number {
    const s = input.stats;
    const statSum = s.STR + s.INT + s.LEA + s.POL + s.CHA + s.LUK;
    const troopBonus = input.specialTroop
        ? (input.specialTroop.attack + input.specialTroop.defense) * AI_POWER_TROOP_WEIGHT
        : 0;
    const tacticBonus = input.tacticTpCosts.reduce((sum, tp) => sum + tp * AI_POWER_TACTIC_TP_WEIGHT, 0);
    const reincarnationBonus = input.reincarnation * AI_POWER_REINCARNATION_WEIGHT;
    const ageBonus = BATTLE_POWER_CONSTANTS.AGE_MODIFIER[input.agePhase] * AI_POWER_AGE_WEIGHT;
    return statSum + troopBonus + tacticBonus + reincarnationBonus + ageBonus;
}

/** AI 與玩家戰力的相對差距；玩家戰力 ≤ 0 時回傳 Infinity */
export function aiPowerMatchDiff(aiPower: number, playerPower: number): number {
    if (playerPower <= 0) return Infinity;
    return Math.abs(aiPower - playerPower) / playerPower;
}

/** 是否落在匹配容許範圍內（預設 NORMAL ±20%） */
export function isAiPowerMatched(aiPower: number, playerPower: number, tolerance = AI_POWER_MATCH_TOLERANCE): boolean {
    return aiPowerMatchDiff(aiPower, playerPower) <= tolerance;
}
