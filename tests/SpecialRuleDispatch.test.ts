import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleSkillDispatcher } from '../assets/scripts/battle/runtime/BattleSkillDispatcher';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { BattleTactic, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import type { UltimateSpecialRuleDef } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

function troop(id: string, faction = Faction.Player, lane = 0, depth = 0): TroopUnit {
    const u = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 30, defense: 10 });
    u.moveTo(lane, depth);
    return u;
}

function setup(rules: Record<string, UltimateSpecialRuleDef>) {
    const state = new BattleState();
    const gen = troop('gen', Faction.Player, 0); gen.shield = 30;
    state.addUnit(gen); state.addUnit(troop('a', Faction.Player, 1)); state.addUnit(troop('e', Faction.Enemy, 2, 5));
    const dispatcher = new BattleSkillDispatcher({
        state,
        getPlayerGeneralUnitId: () => 'gen',
        getEnemyGeneralUnitId: () => null,
        getUltimateSpecialRule: (id: string) => rules[id],
    } as never, {} as never);
    return { state, dispatcher };
}

export function createSpecialRuleDispatchSuite(): TestSuite {
    const suite = new TestSuite('SpecialRuleDispatch（ULT-10 USPECIAL 派發層 PROG-2-1978）');
    suite.test('復活：從派發器施放，陣亡兵回到戰場', () => {
        const { state, dispatcher } = setup({ u: { kind: 'REVIVE', params: { reviveHpRatio: 0.5 } } });
        const a = state.units.get('a')!; a.currentHp = 0; state.removeUnit('a');
        const r = dispatcher.applyUltimateSpecialRule(Faction.Player, 'u');
        assert.equals('APPLIED', r.outcome);
        assert.equals(50, state.units.get('a')!.currentHp);
    });
    suite.test('增益轉移：武將護盾轉給友軍', () => {
        const { state, dispatcher } = setup({ u: { kind: 'TRANSFER_BUFFS' } });
        assert.equals('APPLIED', dispatcher.applyUltimateSpecialRule(Faction.Player, 'u').outcome);
        assert.equals(30, state.units.get('a')!.shield);
        assert.equals(0, state.units.get('gen')!.shield);
        assert.equals(0, state.units.get('e')!.shield);
    });
    suite.test('行動條重置：指定目標得到再行動', () => {
        const { state, dispatcher } = setup({ u: { kind: 'RESET_ACTION', params: { extraActions: 2 } } });
        dispatcher.applyUltimateSpecialRule(Faction.Player, 'u', 'a');
        assert.equals(2, state.getActionReset('a')!.remainingExtraActions);
        assert.equals(null, state.getActionReset('gen'));
    });
    suite.test('死亡觸發：友軍全體掛上，敵軍不掛', () => {
        const { state, dispatcher } = setup({ u: { kind: 'DEATH_TRIGGER', params: { triggerId: 'boom' } } });
        assert.equals(2, dispatcher.applyUltimateSpecialRule(Faction.Player, 'u').affectedIds.length);
        assert.equals('boom', state.deathTriggers.get('a')!.join());
        assert.isFalse(state.deathTriggers.has('e'));
    });
    suite.test('場勢切換：battleTactic 改變；非法場勢 REJECTED', () => {
        const { state, dispatcher } = setup({ u: { kind: 'FIELD_SHIFT', params: { fieldStateId: BattleTactic.FloodAttack } }, bad: { kind: 'FIELD_SHIFT', params: { fieldStateId: 'meteor' } } });
        assert.equals('APPLIED', dispatcher.applyUltimateSpecialRule(Faction.Player, 'u').outcome);
        assert.equals(BattleTactic.FloodAttack, state.battleTactic);
        assert.equals('REJECTED', dispatcher.applyUltimateSpecialRule(Faction.Player, 'bad').outcome);
    });
    suite.test('白名單外 REJECTED、沒填 specialRule NOT_SPECIAL，狀態不變', () => {
        const { state, dispatcher } = setup({ u: { kind: 'TIME_STOP' } });
        assert.equals('REJECTED', dispatcher.applyUltimateSpecialRule(Faction.Player, 'u').outcome);
        assert.equals('NOT_SPECIAL', dispatcher.applyUltimateSpecialRule(Faction.Player, 'none').outcome);
        assert.equals(30, state.units.get('gen')!.shield);
        assert.equals(BattleTactic.Normal, state.battleTactic);
    });
    return suite;
}
