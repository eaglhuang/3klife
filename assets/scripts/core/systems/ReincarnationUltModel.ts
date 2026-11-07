// @spec-source → 轉生屬性上限突破與奧義傷害數值模型規格書.md (doc_spec_0341) §1 轉生上限、§3 奧義精力階梯（PROG-2-2026）
/**
 * ReincarnationUltModel — 轉生後的五維上限與施放奧義的精力消耗。純函式，數值集中在下方表格。
 * 奧義傷害本身見 UltimateDamage.ts。
 */

export const REINCARNATION_TUNING = { baseCap: 100, perLevel: 5, maxLevel: 5, statCount: 5 } as const;

function clampLevel(reincarnationLevel: number): number {
    if (!Number.isFinite(reincarnationLevel)) return 0;
    return Math.max(0, Math.min(REINCARNATION_TUNING.maxLevel, Math.floor(reincarnationLevel)));
}

/** §1.1：單項屬性上限 = 100 + 轉生次數 × 5，0～5 轉，封頂 125 */
export function reincarnationStatCap(reincarnationLevel: number): number {
    return REINCARNATION_TUNING.baseCap + clampLevel(reincarnationLevel) * REINCARNATION_TUNING.perLevel;
}

/** §1.1：五維總量理論上限 */
export function reincarnationTotalCap(reincarnationLevel: number): number {
    return reincarnationStatCap(reincarnationLevel) * REINCARNATION_TUNING.statCount;
}

/** 把一項屬性夾到該轉生階數的上限內 */
export function clampStatToReincarnationCap(value: number, reincarnationLevel: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(reincarnationStatCap(reincarnationLevel), value));
}

export type UltimateVitalityTier = 'minor' | 'mid' | 'major';

export interface UltimateVitalityTierRule {
    readonly tier: UltimateVitalityTier;
    /** 基礎威力上界（含） */
    readonly maxBasePower: number;
    readonly baseCost: number;
    readonly minVitality: number;
}

/** §3：依基礎威力分三階 */
export const ULTIMATE_VITALITY_TIERS: readonly UltimateVitalityTierRule[] = [
    { tier: 'minor', maxBasePower: 350, baseCost: 30, minVitality: 35 },
    { tier: 'mid', maxBasePower: 500, baseCost: 50, minVitality: 55 },
    { tier: 'major', maxBasePower: 700, baseCost: 70, minVitality: 75 },
];

/** §3 特殊減免 */
export const ULTIMATE_VITALITY_DISCOUNTS = { greenGene: 0.20, resonance: 0.15, inherited: 0.20 } as const;

export interface UltimateVitalityModifiers {
    hasGreenGene?: boolean;
    inResonance?: boolean;
    isInherited?: boolean;
}

/** 依基礎威力找精力階；超過 700 仍算大奧義 */
export function ultimateVitalityTierOf(basePower: number): UltimateVitalityTierRule {
    const power = Number.isFinite(basePower) ? basePower : 0;
    return ULTIMATE_VITALITY_TIERS.find((t) => power <= t.maxBasePower) ?? ULTIMATE_VITALITY_TIERS[ULTIMATE_VITALITY_TIERS.length - 1];
}

/** 減免不疊加，取符合條件中最大的一項；消耗四捨五入為整數 */
export function ultimateVitalityCost(basePower: number, mods: UltimateVitalityModifiers = {}): number {
    const d = ULTIMATE_VITALITY_DISCOUNTS;
    const discount = Math.max(mods.hasGreenGene ? d.greenGene : 0, mods.inResonance ? d.resonance : 0, mods.isInherited ? d.inherited : 0);
    return Math.round(ultimateVitalityTierOf(basePower).baseCost * (1 - discount));
}

/** §3：精力未達該階門檻禁止施放 */
export function canCastUltimate(currentVitality: number, basePower: number): boolean {
    return Number.isFinite(currentVitality) && currentVitality >= ultimateVitalityTierOf(basePower).minVitality;
}
