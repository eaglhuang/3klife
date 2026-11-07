// @spec-source → 奧義系統 §F-6 SpecialRuleResolver 行動條重置 RESET_ACTION（ULT-10，PROG-2-1975）
/**
 * SpecialActionResetRule — USPECIAL 行動條重置接到 BattleState。
 * 回合制戰場沒有連續行動條，重置＝讓目標本回合再行動 N 次，寫進既有的 actionResets 表（與再動戰法共用）。
 * 暫定：預設再行動 1 次；首擊倍率 1（不加傷）；已有再動狀態時取次數較大者。
 */
import type { BattleState } from '../../models/BattleState';

export interface SpecialActionResetParams {
    /** 再行動次數，預設 1（暫定） */
    extraActions?: number;
    /** 來源奧義 id，寫入 actionResets 供追蹤 */
    sourceSkillId: string;
}

export const DEFAULT_SPECIAL_EXTRA_ACTIONS = 1;

/** 回傳實際被重置的單位 id。 */
export function applySpecialActionReset(state: BattleState, targetIds: readonly string[], params: Readonly<SpecialActionResetParams>): string[] {
    const extra = Number.isFinite(params.extraActions) ? Math.max(0, Math.floor(params.extraActions as number)) : DEFAULT_SPECIAL_EXTRA_ACTIONS;
    if (extra <= 0) return [];
    const affected: string[] = [];
    for (const id of targetIds) {
        const unit = state.units.get(id);
        if (!unit || unit.isDead()) continue;
        const current = state.getActionReset(id);
        if (current && current.remainingExtraActions >= extra) continue;
        state.setActionReset({
            unitUid: id,
            battleSkillId: current?.battleSkillId ?? params.sourceSkillId,
            firstHitMultiplier: current?.firstHitMultiplier ?? 1,
            firstHitPending: current?.firstHitPending ?? false,
            remainingExtraActions: extra,
        });
        affected.push(id);
    }
    return affected;
}
