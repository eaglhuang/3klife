// @spec-source → 奧義系統 §F-6 SpecialRuleResolver 增益轉移 TRANSFER_BUFFS（ULT-10，PROG-2-1974）
/**
 * SpecialBuffTransferRule — USPECIAL 增益轉移接到 BattleState。
 * 兵身上可轉移的增益為護盾 shield 與士氣 morale（連同剩餘回合 moraleTurns）。
 * 施放者的增益整份交給每一名存活的友軍目標，施放者自身清零。
 * 暫定：多名目標各得一份（不平分）；目標原有值取較大者，不疊加。
 */
import type { BattleState } from '../../models/BattleState';

export type TransferableBuff = 'shield' | 'morale';

export const TRANSFERABLE_BUFFS: readonly TransferableBuff[] = ['shield', 'morale'];

export interface SpecialBuffTransferParams {
    /** 最多轉移幾種增益（依 TRANSFERABLE_BUFFS 順序），缺值＝全部 */
    maxBuffs?: number;
}

export interface SpecialBuffTransferResult {
    moved: TransferableBuff[];
    receiverIds: string[];
}

export function applySpecialBuffTransfer(
    state: BattleState, casterId: string, targetIds: readonly string[], params: Readonly<SpecialBuffTransferParams>,
): SpecialBuffTransferResult {
    const none: SpecialBuffTransferResult = { moved: [], receiverIds: [] };
    const caster = state.units.get(casterId);
    if (!caster) return none;
    const receivers = targetIds
        .filter((id) => id !== casterId)
        .map((id) => state.units.get(id))
        .filter((u): u is NonNullable<typeof u> => !!u && !u.isDead() && u.faction === caster.faction);
    if (receivers.length === 0) return none;
    const limit = Number.isFinite(params.maxBuffs) ? Math.max(0, Math.floor(params.maxBuffs as number)) : TRANSFERABLE_BUFFS.length;
    const held = TRANSFERABLE_BUFFS.filter((b) => (b === 'shield' ? caster.shield > 0 : caster.morale > 0 && caster.moraleTurns > 0));
    const moved = held.slice(0, limit);
    for (const buff of moved) {
        for (const u of receivers) {
            if (buff === 'shield') u.shield = Math.max(u.shield, caster.shield);
            else {
                u.morale = Math.max(u.morale, caster.morale);
                u.moraleTurns = Math.max(u.moraleTurns, caster.moraleTurns);
            }
        }
        if (buff === 'shield') caster.shield = 0;
        else { caster.morale = 0; caster.moraleTurns = 0; }
    }
    return moved.length > 0 ? { moved, receiverIds: receivers.map((u) => u.id) } : none;
}
