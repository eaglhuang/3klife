// @spec-source → 奧義系統 §F-6 SpecialRuleResolver 場勢切換 FIELD_SHIFT（ULT-10，PROG-2-1977）
/**
 * SpecialFieldShiftRule — USPECIAL 場勢切換接到 BattleState。
 * 場勢＝BattleState.battleTactic（場景戰法）；切換只改場勢欄位，回傳前一個場勢供還原或演出。
 * 白名單外的場勢值一律拒絕。暫定：持續時間與還原時機另卡（目前切換後持續到戰鬥結束）。
 */
import { BattleTactic } from '../../../core/config/Constants';
import type { BattleState } from '../../models/BattleState';

export type SpecialFieldShiftOutcome = 'APPLIED' | 'NO_EFFECT' | 'REJECTED';

export interface SpecialFieldShiftResult {
    outcome: SpecialFieldShiftOutcome;
    previous: BattleTactic;
}

export function isBattleTactic(value: string): value is BattleTactic {
    return (Object.values(BattleTactic) as string[]).includes(value);
}

export function applySpecialFieldShift(state: BattleState, fieldStateId: string): SpecialFieldShiftResult {
    const previous = state.battleTactic;
    if (!isBattleTactic(fieldStateId)) return { outcome: 'REJECTED', previous };
    if (previous === fieldStateId) return { outcome: 'NO_EFFECT', previous };
    state.battleTactic = fieldStateId;
    return { outcome: 'APPLIED', previous };
}
