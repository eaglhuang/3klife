/**
 * 漢室餘暉（劉備 4，ULT-10 特殊規則）：立即重置 1 名友軍行動條，多回合真實施放流程測試
 *
 * 覆蓋：奧義從派發器進入 ResetSkillResolver，行動條重置寫入戰場狀態；
 * 奧義一場限用一次（第 2 回合被擋、不再重置）；沒有存活友軍時不扣資源、不重置。
 * 規格未給首擊倍率與再行動次數，取重置預設值（×1、再行動 1），PR 內已註明。
 */
import { assert, TestSuite } from './TestRunner';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleSkillDispatcher } from '../assets/scripts/battle/runtime/BattleSkillDispatcher';
import { BattleSkillExecutor } from '../assets/scripts/battle/skills/BattleSkillExecutor';
import { ResetSkillResolver } from '../assets/scripts/battle/skills/resolvers/ResetSkillResolver';
import { Faction } from '../assets/scripts/core/config/Constants';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { createTestUnit } from './BattleSkillTestUtils';

function setup(allyAlive: boolean, costPct: number | undefined, casterAlive = true) {
    const state = new BattleState();
    state.playerGeneral = new GeneralUnit({ id: 'liu-general', name: '劉備', faction: Faction.Player, hp: 100, gender: 'male', vitality: 120, maxVitality: 120 } as never);
    const caster = createTestUnit('liu-unit', Faction.Player, 0, 0, { hp: 200 });
    if (!casterAlive) caster.currentHp = 0;
    state.units.set('liu-unit', caster);
    const ally = createTestUnit('ally-unit', Faction.Player, 1, 0, { hp: 100 });
    if (!allyAlive) ally.currentHp = 0;
    state.units.set('ally-unit', ally);
    const combatResolver = { getFactionUnits: (faction: Faction) => [...state.units.values()].filter((u) => u.faction === faction && !u.isDead()) };
    const dispatcher = new BattleSkillDispatcher({ state, combatResolver, getUltimateVitalityCostPct: () => costPct } as never, {} as never);
    const ctx = { ...dispatcher.buildBattleSkillExecutionContext(), emitSkillEffect: () => undefined };
    const executor = new BattleSkillExecutor([new ResetSkillResolver()]);
    (dispatcher as unknown as { skillExecutor: unknown }).skillExecutor = {
        execute: (request: unknown) => executor.execute(request as never, ctx),
    };
    return { state, dispatcher };
}

function rallyRequest() {
    return {
        sourceType: SkillSourceType.Ultimate,
        ownerUid: 'liu-unit',
        battleSkillId: 'liu-bei-reset',
        ultimateId: 'ult-liu-bei-4',
        targetMode: 'ally-single',
        targetUnitUid: 'ally-unit',
        timing: 'active-cast',
    } as never;
}

export function createLiuBeiRallyResetSuite(): TestSuite {
    const suite = new TestSuite('LiuBeiRallyReset (漢室餘暉重置行動條多回合)');

    suite.test('第 1 回合施放：友軍行動條被重置，再行動 1 次', () => {
        const { state, dispatcher } = setup(true, undefined);
        const result = dispatcher.executeBattleSkillRequest(rallyRequest());
        assert.isTrue(result.applied);
        const reset = state.getActionReset('ally-unit');
        assert.isTrue(reset !== null, '友軍行動條應被重置');
        assert.equals(1, reset!.remainingExtraActions);
    });

    suite.test('多回合：第 2 回合同一奧義被擋，行動條紀錄不再寫入', () => {
        const { state, dispatcher } = setup(true, 0.08);
        assert.isTrue(dispatcher.executeBattleSkillRequest(rallyRequest()).applied);
        state.removeActionReset('ally-unit');
        const round2 = dispatcher.executeBattleSkillRequest(rallyRequest());
        assert.isFalse(round2.applied);
        assert.equals('ultimate-used', round2.blockedReason);
        assert.isTrue(state.getActionReset('ally-unit') === null);
    });

    suite.test('全隊陣亡：不重置、不扣精力', () => {
        const { state, dispatcher } = setup(false, 0.08, false);
        const result = dispatcher.executeBattleSkillRequest(rallyRequest());
        assert.isFalse(result.applied);
        assert.equals('no-target', result.blockedReason);
        assert.equals(120, state.getGeneral(Faction.Player)!.vitality);
    });

    return suite;
}
