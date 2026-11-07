// @spec-source → 奧義系統 §F-6 SpecialRuleResolver（USPECIAL）派發層接線（ULT-10，PROG-2-1978）
/**
 * SpecialRuleDispatch — 奧義施放成功後，依奧義定義的 specialRule 呼叫五條 USPECIAL 規則。
 * 只認 core 白名單五項；白名單外或沒填 specialRule 的奧義一律不生效（NOT_SPECIAL／REJECTED）。
 * 目標預設：復活＝施放方陣亡兵；增益轉移＝施放方武將單位 → 指定目標或全體友軍；
 * 行動條重置／死亡觸發＝指定目標或全體存活友軍；場勢切換＝全場。
 * 暫定：目標規則為派發層預設，奧義資料目前沒有個別目標欄位。
 */
import { Faction } from '../../../core/config/Constants';
import { isWhitelistedSpecialRule, type SpecialRuleKind } from '../../../core/systems/SpecialRuleResolver';
import type { UltimateSpecialRuleDef } from '../../../shared/SkillRuntimeContract';
import type { BattleState } from '../../models/BattleState';
import { applySpecialActionReset } from './SpecialActionResetRule';
import { applySpecialBuffTransfer } from './SpecialBuffTransferRule';
import { attachDeathTrigger, takeDeathTriggers } from './SpecialDeathTriggerRule';
import { applySpecialFieldShift } from './SpecialFieldShiftRule';
import { applySpecialRevive } from './SpecialReviveRule';

export type SpecialRuleDispatchOutcome = 'APPLIED' | 'NO_EFFECT' | 'REJECTED' | 'NOT_SPECIAL';

export interface SpecialRuleDispatchInput {
    state: BattleState;
    casterFaction: Faction;
    /** 施放方武將化身的單位 id（增益轉移的來源）；沒有出陣時為 null */
    casterUnitId: string | null;
    /** 玩家點選的單一目標；null 代表用預設目標 */
    targetUnitUid: string | null;
    ultimateId: string;
}

export interface SpecialRuleDispatchResult {
    outcome: SpecialRuleDispatchOutcome;
    kind: SpecialRuleKind | null;
    affectedIds: string[];
}

function num(params: UltimateSpecialRuleDef['params'], key: string): number | undefined {
    const v = params?.[key];
    return typeof v === 'number' ? v : undefined;
}

function str(params: UltimateSpecialRuleDef['params'], key: string): string | undefined {
    const v = params?.[key];
    return typeof v === 'string' ? v : undefined;
}

function alliedTargets(input: SpecialRuleDispatchInput): string[] {
    if (input.targetUnitUid) return [input.targetUnitUid];
    return Array.from(input.state.units.values())
        .filter((u) => u.faction === input.casterFaction && !u.isDead())
        .map((u) => u.id);
}

export function dispatchSpecialRule(def: Readonly<UltimateSpecialRuleDef> | null | undefined, input: SpecialRuleDispatchInput): SpecialRuleDispatchResult {
    if (!def) return { outcome: 'NOT_SPECIAL', kind: null, affectedIds: [] };
    if (!isWhitelistedSpecialRule(def.kind)) return { outcome: 'REJECTED', kind: null, affectedIds: [] };
    const p = def.params;
    let affected: string[] = [];
    switch (def.kind) {
        case 'REVIVE':
            affected = applySpecialRevive(input.state, input.casterFaction, { reviveHpRatio: num(p, 'reviveHpRatio'), maxCount: num(p, 'maxCount') }).map((u) => u.id);
            break;
        case 'TRANSFER_BUFFS':
            if (input.casterUnitId) {
                affected = applySpecialBuffTransfer(input.state, input.casterUnitId, alliedTargets(input), { maxBuffs: num(p, 'maxBuffs') }).receiverIds;
            }
            break;
        case 'RESET_ACTION':
            affected = applySpecialActionReset(input.state, alliedTargets(input), { extraActions: num(p, 'extraActions'), sourceSkillId: input.ultimateId });
            break;
        case 'DEATH_TRIGGER': {
            const triggerId = str(p, 'triggerId');
            if (triggerId) affected = attachDeathTrigger(input.state, alliedTargets(input), triggerId);
            break;
        }
        case 'FIELD_SHIFT': {
            const fieldStateId = str(p, 'fieldStateId');
            if (!fieldStateId) break;
            const shifted = applySpecialFieldShift(input.state, fieldStateId);
            if (shifted.outcome === 'REJECTED') return { outcome: 'REJECTED', kind: def.kind, affectedIds: [] };
            if (shifted.outcome === 'APPLIED') affected = [input.ultimateId];
            break;
        }
    }
    return { outcome: affected.length > 0 ? 'APPLIED' : 'NO_EFFECT', kind: def.kind, affectedIds: affected };
}

export interface DeathTriggerSettlement {
    triggerId: string;
    result: SpecialRuleDispatchResult;
}

/**
 * 單位陣亡後結算它身上的死亡觸發（PROG-2-1979）。
 * 掛勾 id 指向一個帶 specialRule 的奧義定義，以陣亡者陣營為施放方套用；取出即清，每個掛勾只觸發一次。
 * 暫定：結算時沒有施放者單位（增益轉移因此不生效）；查不到定義的掛勾回 NOT_SPECIAL。
 */
export function settleDeathTriggers(
    state: BattleState,
    deadUnitId: string,
    deadFaction: Faction,
    lookup: (triggerId: string) => Readonly<UltimateSpecialRuleDef> | null | undefined,
): DeathTriggerSettlement[] {
    return takeDeathTriggers(state, deadUnitId).map((triggerId) => ({
        triggerId,
        result: dispatchSpecialRule(lookup(triggerId), {
            state, casterFaction: deadFaction, casterUnitId: null, targetUnitUid: null, ultimateId: triggerId,
        }),
    }));
}
