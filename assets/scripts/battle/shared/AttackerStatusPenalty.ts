// @spec-source → 戰鬥增益減益效果堆疊與治療結算規格書 (doc_spec_0359)；減益持續視覺規格書 (doc_spec_1361) §7.1
/**
 * AttackerStatusPenalty — 攻擊端的減益傷害倍率（純邏輯，不依賴 cc）。
 *
 * 虛弱 ×0.7、恐懼 ×0.8（PROG-2-10253）；兩者同時存在時相乘。以前三處結算各自寫「有虛弱就 ×0.7」，
 * 新增恐懼後集中成這一個函式，之後再加攻擊端減益只改這裡。
 *
 * Unity 對照：像 DamageModifier 管線裡「攻擊者身上的減益」那一段。
 */
import { FEAR_ATTACK_MULTIPLIER, StatusEffect, WEAK_ATTACK_MULTIPLIER } from '../../core/config/Constants';

/** 只需要查詢是否帶某狀態（BuffSystem 的子集），方便單測傳假物件 */
export interface BuffQuery {
  hasBuff(unitId: string, effect: StatusEffect): boolean;
}

/** 攻擊端減益後的傷害（至少 1）；沒有任何攻擊端減益時原值不動 */
export function applyAttackerStatusPenalty(buff: BuffQuery, attackerId: string, damage: number): number {
  let out = damage;
  if (buff.hasBuff(attackerId, StatusEffect.Weak)) out = Math.max(1, Math.floor(out * WEAK_ATTACK_MULTIPLIER));
  if (buff.hasBuff(attackerId, StatusEffect.Fear)) out = Math.max(1, Math.floor(out * FEAR_ATTACK_MULTIPLIER));
  return out;
}
