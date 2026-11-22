import type { TroopUnit } from "../../core/models/TroopUnit";

/**
 * 主將出陣全軍攻擊加倍（PROG-2-9719，使用者 11/22 裁決 Q5=A）。
 * 出陣時每個己方單位加上一次自身基礎攻擊，並記在 generalSortieAttackBoost；
 * 主將倒下時用同一筆紀錄扣回，不做撤回、不會重複扣或扣到其他來源的加成。
 */
export function applyGeneralSortieBoost(unit: TroopUnit): void {
  if (unit.generalSortieAttackBoost > 0) return;
  unit.generalSortieAttackBoost = unit.attack;
  unit.attackBonus += unit.attack;
}

/** 移除單一單位的出陣加倍；回傳扣掉的量。 */
export function removeGeneralSortieBoost(unit: TroopUnit): number {
  const boost = unit.generalSortieAttackBoost;
  if (boost <= 0) return 0;
  unit.attackBonus -= boost;
  unit.generalSortieAttackBoost = 0;
  return boost;
}

/** 主將倒下：移除該陣營全部單位的出陣加倍。 */
export function clearGeneralSortieBoost(units: Iterable<TroopUnit>, faction: string | number): number {
  let removed = 0;
  for (const unit of units) {
    if (unit.faction === faction && removeGeneralSortieBoost(unit) > 0) removed++;
  }
  return removed;
}

/** 主將出陣只能放出兵口（depth 0）（PROG-2-9719，使用者 11/22 裁決 Q4=A）。 */
export const GENERAL_SORTIE_DEPTH = 0;
export function isGeneralSortieDepth(depth: number): boolean {
  return depth === GENERAL_SORTIE_DEPTH;
}
