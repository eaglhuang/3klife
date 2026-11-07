// @spec-source → 戰法TP點數消耗模型與綠色因子折半減免規格書.md（doc_spec_0344）；PROG-2-2030
/**
 * TacticCastTpCost — 戰場「施放」戰法的 TP 消耗（純邏輯，不依賴 cc）
 *
 * 規則（§2.1）：持有對應系別綠色因子時 TP 減半並向下取整，最終不得低於 10 TP。
 * 學習戰法的 TP 成本（ceil、無保底）另見 FactorTacticLinkage.learnTpCost，兩者用途不同。
 * 基礎消耗沿用 SortieDeploy.getTacticTpCost（數值系統.md E-9 的 28 招表）。
 */

/** 戰場 TP 上限（§1） */
export const TACTIC_TP_MAX = 100;
/** 施放消耗下限，防止零消耗連續施放（§2.1） */
export const TACTIC_CAST_TP_FLOOR = 10;
/** 持有對應綠色因子時的減免係數 M_green（§2.1） */
export const GREEN_CAST_TP_DISCOUNT = 0.5;

export type TacticTpTier = 1 | 2 | 3 | 4;

/** §1 四階梯的基礎消耗區間上限；超過 Tier 3 上限一律歸 Tier 4 */
export const TACTIC_TP_TIER_MAX: Readonly<Record<1 | 2 | 3, number>> = { 1: 20, 2: 35, 3: 50 };

export interface TacticCostInput {
    tacticId: string;
    baseTp: number;
    hasGreenGene: boolean;
}

/** §4 施放消耗：TP_final = max(10, floor(TP_base × (1 − M_green)))；無綠色因子時原值不變 */
export function calculateTacticTpCost(input: TacticCostInput): number {
    const base = Math.max(0, Math.floor(input.baseTp));
    if (!input.hasGreenGene) return base;
    return Math.max(TACTIC_CAST_TP_FLOOR, Math.floor(base * (1 - GREEN_CAST_TP_DISCOUNT)));
}

/** 依基礎消耗判斷戰法位階（§1） */
export function tacticTpTier(baseTp: number): TacticTpTier {
    if (baseTp <= TACTIC_TP_TIER_MAX[1]) return 1;
    if (baseTp <= TACTIC_TP_TIER_MAX[2]) return 2;
    if (baseTp <= TACTIC_TP_TIER_MAX[3]) return 3;
    return 4;
}
