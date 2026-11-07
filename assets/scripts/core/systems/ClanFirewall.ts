// @spec-source → 英靈世家系統 §H-1 近親衰減、§H-2 同宗不相殘、§H-3 質重於量（SPI-10，PROG-2-1963）
/**
 * ClanFirewall — 家族積分反膨脹防火牆（純邏輯，不依賴 cc）。
 *
 * - 同宗不相殘：交戰雙方同姓時，功勳分減半（討論來源 doc_spec_0050「戰場功勛積分減半」）。
 * - 近親衰減：近親後代的家族積分效率隨血脈疲勞 h（BloodFatigue）逐階下降。
 * - 質重於量：每人回向依品質加權；低品質成員的合計回向封頂，不能靠人數蓋過高品質線。
 *
 * 暫定：近親每階衰減量與下限、品質權重表、低品質封頂比例規格未給，由呼叫端傳入。
 * Unity 對照：像在加分前套一層 Modifier 管線，每條規則各乘一個係數。
 */
import { normalizeBloodFatigue } from './BloodFatigue';

/** 同宗互戰的功勳倍率。 */
export const SAME_CLAN_MERIT_MULTIPLIER = 0.5;

function nonNegative(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function clamp01(value: number): number {
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

/** 功勳分：交戰雙方同姓時打折；任一方無姓不打折。 */
export function battleMeritForClan(merit: number, ownClan: string | null, enemyClan: string | null): number {
    const base = nonNegative(merit);
    return ownClan && ownClan === enemyClan ? base * SAME_CLAN_MERIT_MULTIPLIER : base;
}

/** 近親積分效率：1 − 每階衰減 × h，不低於下限。 */
export function kinshipScoreEfficiency(bloodFatigue: unknown, decayPerLevel: number, floor: number): number {
    const h = normalizeBloodFatigue(bloodFatigue);
    return Math.max(clamp01(floor), 1 - nonNegative(decayPerLevel) * h);
}

export interface QualityReturnMember {
    /** 品質權重（呼叫端依稀有度／EP 查表）。 */
    qualityWeight: number;
    /** 是否屬於低品質。 */
    lowQuality: boolean;
}

/**
 * 質重於量：高品質成員全額計入；低品質成員合計不超過高品質合計 × 封頂比例。
 * 沒有高品質成員時，低品質照常計入（避免整條線歸零）。
 */
export function qualityWeightedReturn(members: readonly QualityReturnMember[], lowQualityCapRatio: number): number {
    let high = 0;
    let low = 0;
    for (const m of members) {
        if (m.lowQuality) low += nonNegative(m.qualityWeight);
        else high += nonNegative(m.qualityWeight);
    }
    if (high === 0) return low;
    return high + Math.min(low, high * nonNegative(lowQualityCapRatio));
}
