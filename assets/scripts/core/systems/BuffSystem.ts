// @spec-source → 見 docs/cross-reference-index.md
import { StatusEffect } from "../config/Constants";
import { applyBuffStack } from "../../battle/shared/BuffStackHeal";
import { planDebuffAdmission } from "../../battle/shared/StatusDebuffCap";

interface BuffEntry {
  effect: StatusEffect;
  remainingTurns: number;
  /** 層數（doc_spec_0359 §1，PROG-2-9720）：同名狀態最多 3 層；目前只記錄，數值效果仍是單層 */
  stacks: number;
}

/**
 * BuffSystem — 管理所有單位的狀態效果。
 * 
 * 使用方式：
 *   services().buff.applyBuff("unit-001", StatusEffect.Stun, 1);
 *   services().buff.hasBuff("unit-001", StatusEffect.Stun); // true
 *   services().buff.tickBuff(); // 每回合結束後呼叫，倒計時並清除過期效果
 */
export class BuffSystem {
  /** key = unitId，value = 該單位身上的所有狀態效果列表 */
  private readonly buffs = new Map<string, BuffEntry[]>();

  /**
   * 對指定單位施加狀態效果。
   * 同名效果再次施加：層數 +1（上限 3 層）、持續回合取 max 不相加（doc_spec_0359 §1，走 applyBuffStack）。
   */
  public applyBuff(unitId: string, effect: StatusEffect, turns: number): void {
    if (!this.buffs.has(unitId)) {
      this.buffs.set(unitId, []);
    }

    const list = this.buffs.get(unitId)!;
    // PROG-2-10253：同一單位減益最多 6 個（doc_spec_1361 §7.2）；已滿時取代回合最短者，否則忽略
    const admission = planDebuffAdmission(list, effect, turns);
    if (!admission.admit) { if (list.length === 0) this.buffs.delete(unitId); return; }
    if (admission.evictIndex >= 0) list.splice(admission.evictIndex, 1);
    const existing = list.find(b => b.effect === effect);

    const next = applyBuffStack(existing ?? null, turns);
    if (existing) {
      existing.stacks = next.stacks;
      existing.remainingTurns = next.remainingTurns;
    } else {
      list.push({ effect, remainingTurns: next.remainingTurns, stacks: next.stacks });
    }
  }

  /** 查詢同名狀態目前層數；沒有該狀態回傳 0 */
  public getStacks(unitId: string, effect: StatusEffect): number {
    return this.buffs.get(unitId)?.find(b => b.effect === effect)?.stacks ?? 0;
  }

  /**
   * 查詢指定單位是否患有某種狀態效果。
   */
  public hasBuff(unitId: string, effect: StatusEffect): boolean {
    const list = this.buffs.get(unitId);
    if (!list) return false;
    return list.some(b => b.effect === effect);
  }

  /** 移除指定單位的某個狀態（淨化用，SYS-SKILL-ULT-0003）；沒有時不動作 */
  public removeBuff(unitId: string, effect: StatusEffect): void {
    const list = this.buffs.get(unitId);
    if (!list) return;
    const index = list.findIndex(b => b.effect === effect);
    if (index >= 0) list.splice(index, 1);
  }

  /**
   * 獲取某個單位身上所有列表（只讀）。
   */
  public getBuffs(unitId: string): Readonly<BuffEntry[]> {
    return this.buffs.get(unitId) ?? [];
  }

  /**
   * 每回合結束後呼叫：遞減所有 remainingTurns，移除已過期的效果。
   */
  public tickBuff(): void {
    for (const [unitId, list] of this.buffs) {
      for (const b of list) {
        b.remainingTurns -= 1;
      }

      // 清除過期（remainingTurns <= 0）的效果
      const active = list.filter(b => b.remainingTurns > 0);
      if (active.length === 0) {
        this.buffs.delete(unitId);
      } else {
        this.buffs.set(unitId, active);
      }
    }
  }

  /**
   * 清除指定單位的所有狀態效果（例如陣亡時）。
   */
  public clearUnit(unitId: string): void {
    this.buffs.delete(unitId);
  }

  /**
   * 清除所有狀態效果（戰鬥結束/重置時）。
   */
  public clearAll(): void {
    this.buffs.clear();
  }
}
