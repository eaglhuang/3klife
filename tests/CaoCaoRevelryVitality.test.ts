/**
 * 對酒當歌（曹操 4，ULT-08 補缺）：全軍精力回復 20%，多回合戰場流程測試
 *
 * 覆蓋：精力回復走派發器 → 執行器 → VitalityRestoreSkillResolver，回復量為精力上限 20%、封頂上限；
 * 奧義一場只能用一次（第二回合被擋，精力不變）；敵方施放只回復敵方武將。
 * 攻速提升規格未給幅度，本測試不涵蓋。emitSkillEffect 換成空函式，避免測試環境需要事件服務。
 */
import { assert, TestSuite } from './TestRunner';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleSkillDispatcher } from '../assets/scripts/battle/runtime/BattleSkillDispatcher';
import { BattleSkillExecutor } from '../assets/scripts/battle/skills/BattleSkillExecutor';
import { VitalityRestoreSkillResolver } from '../assets/scripts/battle/skills/resolvers/VitalityRestoreSkillResolver';
import { Faction } from '../assets/scripts/core/config/Constants';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { spendUltimateVitality } from '../assets/scripts/core/systems/VitalityBattleGate';

const REVELRY_COST_PCT = 0.08;

function generalOf(faction: Faction, vitality: number): GeneralUnit {
    return new GeneralUnit({ id: `${faction}-general`, name: '測試武將', faction, hp: 100, gender: 'male', vitality, maxVitality: 120 } as never);
}

/** 雙方各一位武將與一個單位；執行器只放行對酒當歌，確保測試只驗證這條路徑 */
function setup(playerVitality: number, enemyVitality: number, costPct: number | undefined) {
    const state = new BattleState();
    state.playerGeneral = generalOf(Faction.Player, playerVitality);
    state.enemyGeneral = generalOf(Faction.Enemy, enemyVitality);
    state.units.set('player-unit', { id: 'player-unit', faction: Faction.Player, lane: 0, depth: 0, type: 'infantry', currentHp: 10 } as never);
    const dispatcher = new BattleSkillDispatcher({ state, getUltimateVitalityCostPct: () => costPct } as never, {} as never);
    const ctx = { ...dispatcher.buildBattleSkillExecutionContext(), emitSkillEffect: () => undefined };
    const executor = new BattleSkillExecutor([new VitalityRestoreSkillResolver()]);
    (dispatcher as unknown as { skillExecutor: unknown }).skillExecutor = {
        execute: (request: unknown) => executor.execute(request as never, ctx),
    };
    return { state, dispatcher };
}

function revelryRequest(ownerUid: string) {
    return {
        sourceType: SkillSourceType.Ultimate,
        ownerUid,
        battleSkillId: 'cao-cao-revelry',
        ultimateId: 'ult-cao-cao-4',
        targetMode: 'ally-all',
        timing: 'active-cast',
    } as never;
}

export function createCaoCaoRevelryVitalitySuite(): TestSuite {
    const suite = new TestSuite('CaoCaoRevelryVitality (對酒當歌精力回復多回合)');

    suite.test('第 1 回合施放：玩家武將精力 70 → 94（上限 120 的 20%），敵方不動', () => {
        const { state, dispatcher } = setup(70, 100, undefined);
        const result = dispatcher.executeBattleSkillRequest(revelryRequest('player-unit'));
        assert.isTrue(result.applied);
        assert.equals(94, state.getGeneral(Faction.Player)!.vitality, '70 + 24');
        assert.equals(100, state.getGeneral(Faction.Enemy)!.vitality);
    });

    suite.test('多回合：第 1 回合施放後扣奧義精力；第 2 回合同一奧義被擋，精力不再變動', () => {
        const { state, dispatcher } = setup(70, 100, REVELRY_COST_PCT);
        const round1 = dispatcher.executeBattleSkillRequest(revelryRequest('player-unit'));
        assert.isTrue(round1.applied);
        const afterRound1 = spendUltimateVitality(94, 120, REVELRY_COST_PCT);
        assert.equals(afterRound1, state.getGeneral(Faction.Player)!.vitality, '回復 +24 後再扣 8%');

        const round2 = dispatcher.executeBattleSkillRequest(revelryRequest('player-unit'));
        assert.isFalse(round2.applied);
        assert.equals('ultimate-used', round2.blockedReason);
        assert.equals(afterRound1, state.getGeneral(Faction.Player)!.vitality, '被擋時不回復也不扣');
    });

    suite.test('封頂：精力 110 施放，回復後不超過上限 120', () => {
        const { state, dispatcher } = setup(110, 100, undefined);
        dispatcher.executeBattleSkillRequest(revelryRequest('player-unit'));
        assert.equals(120, state.getGeneral(Faction.Player)!.vitality);
    });

    suite.test('敵方施放：只回復敵方武將，玩家武將精力不變', () => {
        const { state, dispatcher } = setup(70, 70, undefined);
        state.units.set('enemy-unit', { id: 'enemy-unit', faction: Faction.Enemy, lane: 0, depth: 0, type: 'infantry', currentHp: 10 } as never);
        const result = dispatcher.executeBattleSkillRequest(revelryRequest('enemy-unit'));
        assert.isTrue(result.applied);
        assert.equals(94, state.getGeneral(Faction.Enemy)!.vitality, '70 + 24');
        assert.equals(70, state.getGeneral(Faction.Player)!.vitality);
    });

    return suite;
}
