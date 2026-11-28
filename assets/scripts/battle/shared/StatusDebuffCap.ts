// @spec-source → 減益持續視覺規格書 (doc_spec_1361) §7.2「單位減益上限 6」（11/28 裁決）
/**
 * StatusDebuffCap — 同一單位身上的減益種類上限（純邏輯，不依賴 cc）。
 *
 * 規則：同一單位同時存在的減益最多 MAX_DEBUFFS_PER_UNIT 個；同名減益視為刷新（不占新名額）；
 * 已滿時，新減益回合比現有最短者長就取代最短者，否則忽略。增益不受此上限限制。
 *
 * Unity 對照：像 BuffContainer 裡的 debuff slot 數量上限檢查。
 */
import { StatusEffect } from '../../core/config/Constants';

export const MAX_DEBUFFS_PER_UNIT = 6;

/** BuffSystem 內屬於減益（含控制）的狀態 */
export const DEBUFF_STATUS_EFFECTS: ReadonlySet<StatusEffect> = new Set<StatusEffect>([
  StatusEffect.Stun, StatusEffect.Rooted, StatusEffect.Slow, StatusEffect.Weak, StatusEffect.NoShoot, StatusEffect.Fear,
]);

export function isDebuffStatus(effect: StatusEffect | string): boolean {
  return DEBUFF_STATUS_EFFECTS.has(effect as StatusEffect);
}

export interface DebuffAdmission {
  /** 是否接受這次施加 */
  admit: boolean;
  /** 需先移除的既有減益索引；-1 代表不用移除 */
  evictIndex: number;
}

/** 判定一個新減益能不能上身。list 為該單位目前所有狀態（增益減益混合）。 */
export function planDebuffAdmission(
  list: ReadonlyArray<{ effect: StatusEffect | string; remainingTurns: number }>,
  incoming: StatusEffect | string,
  turns: number,
  max = MAX_DEBUFFS_PER_UNIT,
): DebuffAdmission {
  if (!isDebuffStatus(incoming)) return { admit: true, evictIndex: -1 };
  if (list.some((b) => b.effect === incoming)) return { admit: true, evictIndex: -1 }; // 刷新
  let count = 0;
  let shortest = -1;
  for (let i = 0; i < list.length; i++) {
    if (!isDebuffStatus(list[i].effect)) continue;
    count++;
    if (shortest < 0 || list[i].remainingTurns < list[shortest].remainingTurns) shortest = i;
  }
  if (count < max) return { admit: true, evictIndex: -1 };
  if (shortest >= 0 && turns > list[shortest].remainingTurns) return { admit: true, evictIndex: shortest };
  return { admit: false, evictIndex: -1 };
}
