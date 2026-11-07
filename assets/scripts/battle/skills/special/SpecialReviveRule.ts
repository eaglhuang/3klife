// @spec-source → 奧義系統 §F-6 SpecialRuleResolver 復活 REVIVE（ULT-10，PROG-2-1973）
/**
 * SpecialReviveRule — USPECIAL 復活接到 BattleState。
 * 沿用 BattleState.reviveFallenUnit（依陣亡先後、放回原格或最近空格），一次可復活多名。
 * 暫定：預設只復活 1 名、血量比例由奧義資料給（缺值不生效）。
 */
import type { Faction } from '../../../core/config/Constants';
import type { TroopUnit } from '../../../core/models/TroopUnit';
import type { BattleState } from '../../models/BattleState';

export interface SpecialReviveParams {
    /** 復活後血量比例 (0,1]；缺值或 ≤0 不生效 */
    reviveHpRatio?: number;
    /** 最多復活幾名，預設 1（暫定） */
    maxCount?: number;
}

export const DEFAULT_SPECIAL_REVIVE_COUNT = 1;

/** 復活指定陣營的陣亡兵，回傳實際復活的單位（沒有可復活者回空陣列）。 */
export function applySpecialRevive(state: BattleState, faction: Faction, params: Readonly<SpecialReviveParams>): TroopUnit[] {
    const ratio = Number.isFinite(params.reviveHpRatio) ? Math.min(1, params.reviveHpRatio as number) : 0;
    if (ratio <= 0) return [];
    const count = Number.isFinite(params.maxCount) ? Math.max(0, Math.floor(params.maxCount as number)) : DEFAULT_SPECIAL_REVIVE_COUNT;
    const revived: TroopUnit[] = [];
    for (let i = 0; i < count; i++) {
        const unit = state.reviveFallenUnit(faction, ratio);
        if (!unit) break;
        revived.push(unit);
    }
    return revived;
}
