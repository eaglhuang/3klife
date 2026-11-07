/**
 * SpecialRuleResolver — USPECIAL 白名單特殊規則（ULT-10；PROG-2-1935）
 */
import { assert, TestSuite } from './TestRunner';
import {
    collectDeathTriggers, resolveSpecialRule, SpecialRuleState, SpecialRuleUnit,
} from '../assets/scripts/core/systems/SpecialRuleResolver';

function unit(id: string, extra: Partial<SpecialRuleUnit> = {}): SpecialRuleUnit {
    return { id, hp: 100, maxHp: 100, alive: true, actionGauge: 0.5, buffIds: [], deathTriggerIds: [], ...extra };
}

function state(units: SpecialRuleUnit[]): SpecialRuleState {
    return { units, fieldStateId: null };
}

export function createSpecialRuleResolverSuite(): TestSuite {
    const suite = new TestSuite('SpecialRuleResolver (USPECIAL ULT-10 PROG-2-1935)');

    suite.test('白名單外拒絕；復活只救陣亡者且不改輸入', () => {
        const s = state([unit('a'), unit('b', { alive: false, hp: 0 })]);
        assert.equals('REJECTED', resolveSpecialRule(s, { kind: 'NUKE', casterId: 'a', targetIds: ['b'], params: {} }).outcome);
        const r = resolveSpecialRule(s, { kind: 'REVIVE', casterId: 'a', targetIds: ['a', 'b'], params: { reviveHpRatio: 0.3 } });
        assert.equals('APPLIED', r.outcome);
        assert.equals(30, r.state.units[1].hp);
        assert.isTrue(r.state.units[1].alive);
        assert.isFalse(s.units[1].alive);
        assert.equals('NO_EFFECT', resolveSpecialRule(s, { kind: 'REVIVE', casterId: 'a', targetIds: ['b'], params: {} }).outcome);
    });

    suite.test('增益轉移依上限搬給存活隊友；無接收者時退回', () => {
        const s = state([unit('a', { buffIds: ['atk', 'def', 'spd'] }), unit('b'), unit('c', { alive: false })]);
        const r = resolveSpecialRule(s, { kind: 'TRANSFER_BUFFS', casterId: 'a', targetIds: ['b', 'c'], params: { maxBuffs: 2 } });
        assert.equals('atk,def', r.state.units[1].buffIds.join(','));
        assert.equals('spd', r.state.units[0].buffIds.join(','));
        assert.equals(0, r.state.units[2].buffIds.length);
        const none = resolveSpecialRule(s, { kind: 'TRANSFER_BUFFS', casterId: 'a', targetIds: ['c'], params: {} });
        assert.equals('NO_EFFECT', none.outcome);
        assert.equals(3, none.state.units[0].buffIds.length);
    });

    suite.test('行動條重置、死亡觸發掛勾與場勢切換', () => {
        const s = state([unit('a'), unit('b')]);
        const reset = resolveSpecialRule(s, { kind: 'RESET_ACTION', casterId: 'a', targetIds: ['b'], params: { actionGauge: 2 } });
        assert.equals(1, reset.state.units[1].actionGauge);
        const hook = resolveSpecialRule(s, { kind: 'DEATH_TRIGGER', casterId: 'a', targetIds: ['a'], params: { triggerId: 'last-stand' } });
        const dead = { ...hook.state.units[0], alive: false };
        assert.equals('last-stand', collectDeathTriggers(dead).join(','));
        assert.equals(0, collectDeathTriggers(hook.state.units[0]).length);
        const field = resolveSpecialRule(s, { kind: 'FIELD_SHIFT', casterId: 'a', targetIds: [], params: { fieldStateId: 'east-wind' } });
        assert.equals('east-wind', field.state.fieldStateId);
        assert.equals('NO_EFFECT', resolveSpecialRule(field.state, { kind: 'FIELD_SHIFT', casterId: 'a', targetIds: [], params: { fieldStateId: 'east-wind' } }).outcome);
    });

    return suite;
}
