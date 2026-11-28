// @spec-source → 家族關係（史實相性）系統（KIN-09）；KinRelation.ts comboAttackRateMod（義兄弟 1.3）；WBS KIN-09（PROG-2-1063）
/**
 * ComboAttackKin — 相鄰格有義兄弟時，合攻觸發率的計算（純邏輯，不依賴 cc）
 *
 * 規則：相鄰格有史實關係帶 comboAttackRateMod 時，觸發率乘上倍率（義兄弟 1.3，即 +30%）。
 * 多個相鄰關係不疊乘，只取最大的一個倍率；結果夾在 0~1 之間。
 *
 * 合攻基礎觸發率與各等級倍率來自 kin-battle-effects.json（doc_spec_1358）。
 *
 * Unity 對照：像 Buff 的 Modifier，同一類 Modifier 不疊加，只取最大值（Max 而非 Sum）。
 */
import type { HistoricalRelation } from './KinRelation';
import type { KinLevel } from './KinBattleEffects';
import { KIN_BATTLE_CONFIG } from './KinBattleConfig';

/** 合攻基礎觸發率（戰友 20%） */
export const COMBO_ATTACK_BASE_CHANCE = KIN_BATTLE_CONFIG.combo.baseChance;

export function comboAttackChanceWithKin(baseChance: number, adjacentRelations: readonly HistoricalRelation[]): number {
    const mods = adjacentRelations
        .map((relation) => relation.extraEffects.comboAttackRateMod)
        .filter((mod): mod is number => typeof mod === 'number' && mod > 1);
    const mod = mods.length > 0 ? Math.max(...mods) : 1;
    return Math.min(1, Math.max(0, baseChance * mod));
}

/**
 * 依羈絆等級算合攻觸發率（doc_spec_1358 §2.2）：義兄弟 20%×1.3＝26%、戰友 20%、夫妻與其餘關係 0。
 * 多位相鄰羈絆取最高倍率（由呼叫端挑出最高等級），不累乘。
 */
export function comboChanceOfLevel(level: KinLevel): number {
    const combo = KIN_BATTLE_CONFIG.combo;
    if (level === 'SWORN') return Math.min(1, combo.baseChance * combo.swornMod);
    if (level === 'COMRADE') return Math.min(1, combo.baseChance * combo.comradeMod);
    return 0;
}
