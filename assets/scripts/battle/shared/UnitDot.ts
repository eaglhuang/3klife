// @spec-source → 戰法系統.md (doc_spec_0038)；PROG-2-1429 依建檔紀錄補標出處
/**
 * 單位持續傷害（毒箭，PROG-2-0766）。
 *
 * 每回合在所屬陣營的戰術階段扣目標最大 HP 的比例，扣完 remainingTurns 回合即移除。
 * 規格：目標中毒 2 回合；每回合扣最大 HP 5%、移動 -1（doc_spec_0359 §3，PROG-2-9720 取代原 10%）。
 */
export interface UnitDot {
  unitId: string;
  ratio: number;
  remainingTurns: number;
}

import { poisonTickDamage } from "./BuffStackHeal";

/** 中毒每回合傷害（走 BuffStackHeal.poisonTickDamage，至少 1） */
export function poisonDotTick(maxHp: number): number {
  return Math.max(1, poisonTickDamage(maxHp).damage);
}

/** 每回合傷害：最大 HP × 比例，至少 1 */
export function dotTickAmount(maxHp: number, ratio: number): number {
  return Math.max(1, Math.floor(maxHp * ratio));
}

/** 推進一次結算後回傳是否仍需保留 */
export function advanceUnitDot(dot: UnitDot): boolean {
  dot.remainingTurns -= 1;
  return dot.remainingTurns > 0;
}
