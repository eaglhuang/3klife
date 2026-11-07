// @spec-source → 奧義系統 §F-6 SpecialRuleResolver 死亡觸發 DEATH_TRIGGER（ULT-10，PROG-2-1976）
/**
 * SpecialDeathTriggerRule — USPECIAL 死亡觸發接到 BattleState。
 * 掛勾存在 BattleState.deathTriggers（unitId → 效果 id 清單）；單位陣亡後取出並清掉，交給上層依資料表結算。
 * 暫定：同一效果不重複掛；每個掛勾只觸發一次。
 */
import type { BattleState } from '../../models/BattleState';

/** 掛上死亡觸發，回傳實際被掛上的單位 id（已陣亡或已有同 id 者略過）。 */
export function attachDeathTrigger(state: BattleState, targetIds: readonly string[], triggerId: string): string[] {
    if (!triggerId) return [];
    const affected: string[] = [];
    for (const id of targetIds) {
        const unit = state.units.get(id);
        if (!unit || unit.isDead()) continue;
        const list = state.deathTriggers.get(id) ?? [];
        if (list.includes(triggerId)) continue;
        state.deathTriggers.set(id, [...list, triggerId]);
        affected.push(id);
    }
    return affected;
}

/** 單位陣亡（或已移出戰場）時取出它的死亡觸發並清除；仍存活回空陣列。 */
export function takeDeathTriggers(state: BattleState, unitId: string): string[] {
    const unit = state.units.get(unitId);
    if (unit && !unit.isDead()) return [];
    const list = state.deathTriggers.get(unitId) ?? [];
    state.deathTriggers.delete(unitId);
    return list;
}
