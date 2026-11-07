import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { attachDeathTrigger } from '../assets/scripts/battle/skills/special/SpecialDeathTriggerRule';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleTactic, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import type { UltimateSpecialRuleDef } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

function troop(id: string, faction = Faction.Player, lane = 0, depth = 0): TroopUnit {
    const u = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 30, defense: 10 });
    u.moveTo(lane, depth);
    return u;
}

const RULES: Record<string, UltimateSpecialRuleDef> = {
    'ult-flood': { kind: 'FIELD_SHIFT', params: { fieldStateId: BattleTactic.FloodAttack } },
    'ult-rally': { kind: 'RESET_ACTION', params: { extraActions: 1 } },
};

function setup(withLookup = true) {
    services().initialize();
    const state = new BattleState();
    state.addUnit(troop('gen', Faction.Player, 0)); state.addUnit(troop('a', Faction.Player, 1));
    const resolver = new BattleCombatResolver({
        state,
        getPlayerGeneralUnitId: () => 'gen', getEnemyGeneralUnitId: () => null,
        setPlayerGeneralUnitId: () => undefined, setEnemyGeneralUnitId: () => undefined,
        ...(withLookup ? { getUltimateSpecialRule: (id: string) => RULES[id] } : {}),
    });
    return { state, resolver };
}

function kill(resolver: BattleCombatResolver, state: BattleState, id: string): void {
    const unit = state.units.get(id)!;
    unit.currentHp = 0;
    resolver.onUnitKilled(unit, null, services());
}

export function createSpecialDeathTriggerSettleSuite(): TestSuite {
    const suite = new TestSuite('SpecialDeathTriggerSettle（ULT-10 死亡觸發結算 PROG-2-1979）');
    suite.test('武將單位陣亡 → 結算場勢切換，BattleState 改變', () => {
        const { state, resolver } = setup();
        attachDeathTrigger(state, ['gen'], 'ult-flood');
        kill(resolver, state, 'gen');
        assert.equals(BattleTactic.FloodAttack, state.battleTactic);
        assert.isFalse(state.deathTriggers.has('gen'));
    });
    suite.test('陣亡結算以陣亡者陣營為施放方：存活友軍得到再行動', () => {
        const { state, resolver } = setup();
        attachDeathTrigger(state, ['gen'], 'ult-rally');
        kill(resolver, state, 'gen');
        assert.equals(1, state.getActionReset('a')!.remainingExtraActions);
    });
    suite.test('每個掛勾只觸發一次：重複陣亡處理不再結算', () => {
        const { state, resolver } = setup();
        attachDeathTrigger(state, ['gen'], 'ult-rally');
        const gen = state.units.get('gen')!;
        kill(resolver, state, 'gen');
        state.removeActionReset('a');
        resolver.onUnitKilled(gen, null, services());
        assert.equals(null, state.getActionReset('a'));
    });
    suite.test('沒提供規則查詢時只清掛勾、狀態不變', () => {
        const { state, resolver } = setup(false);
        attachDeathTrigger(state, ['gen'], 'ult-flood');
        kill(resolver, state, 'gen');
        assert.equals(BattleTactic.Normal, state.battleTactic);
        assert.isFalse(state.deathTriggers.has('gen'));
    });
    return suite;
}
