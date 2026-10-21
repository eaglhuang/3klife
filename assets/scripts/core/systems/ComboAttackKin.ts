// @spec-source → 家族關係（史實相性）系統（KIN-09）；KinRelation.ts comboAttackRateMod（義兄弟 1.3）；WBS KIN-09（PROG-2-1063）
/**
 * ComboAttackKin — 相鄰格有義兄弟時，合攻觸發率的計算（純邏輯，不依賴 cc）
 *
 * 規則：相鄰格有史實關係帶 comboAttackRateMod 時，觸發率乘上倍率（義兄弟 1.3，即 +30%）。
 * 多個相鄰關係不疊乘，只取最大的一個倍率；結果夾在 0~1 之間。
 *
 * 暫定：合攻的基礎觸發率由呼叫端傳入（規格未定基礎值，待 PM 裁定）。
 *
 * Unity 對照：像 Buff 的 Modifier，同一類 Modifier 不疊加，只取最大值（Max 而非 Sum）。
 */
import type { HistoricalRelation } from './KinRelation';

export function comboAttackChanceWithKin(baseChance: number, adjacentRelations: readonly HistoricalRelation[]): number {
    const mods = adjacentRelations
        .map((relation) => relation.extraEffects.comboAttackRateMod)
        .filter((mod): mod is number => typeof mod === 'number' && mod > 1);
    const mod = mods.length > 0 ? Math.max(...mods) : 1;
    return Math.min(1, Math.max(0, baseChance * mod));
}
