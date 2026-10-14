/**
 * 精力一條龍（LIFE-10 整合）：名冊武將 → 戰場武將 → 精力閘門／奧義扣精力 → 戰後結算
 *
 * 缺口：各段單元測試都假設戰場武將已有 vitality / maxVitality；實際上名冊武將可能沒有這兩個欄位
 * （男性精力上限 120，女性 100），戰場端若用自己的預設 100 會讓閘門與結算基準偏離名冊。
 */
import { assert, TestSuite } from './TestRunner';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleSkillDispatcher } from '../assets/scripts/battle/runtime/BattleSkillDispatcher';
import { Faction } from '../assets/scripts/core/config/Constants';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { BATTLE_VITALITY_COST, buildBattleConfig, settleBattle } from '../assets/scripts/core/systems/BattleRoster';

function rosterGeneral(over: Record<string, unknown>): never {
    return { id: 'hero', name: '測試', faction: 'player', hp: 100, gender: 'male', ...over } as never;
}

/** 戰場：玩家武將 + 一個施放者單位；執行器換成永遠成功的替身，只驗證派發器的閘門與扣精力 */
function setup(general: GeneralUnit, costPct: number | undefined) {
    const state = new BattleState();
    state.playerGeneral = general;
    state.units.set('player-unit', { id: 'player-unit', faction: Faction.Player, lane: 0, depth: 0, type: 'infantry', currentHp: 10 } as never);
    const dispatcher = new BattleSkillDispatcher({ state, getUltimateVitalityCostPct: () => costPct } as never, {} as never);
    let executed = 0;
    (dispatcher as unknown as { skillExecutor: unknown }).skillExecutor = {
        execute: () => { executed += 1; return { applied: true, battleLogLines: [], deltas: [] }; },
    };
    return { state, dispatcher, executedCount: () => executed };
}

function ultimateRequest() {
    return {
        sourceType: SkillSourceType.Ultimate,
        ownerUid: 'player-unit',
        battleSkillId: 'zhou-yu-inferno',
        ultimateId: 'ult-1',
        targetMode: 'tile',
        timing: 'active-cast',
    } as never;
}

export function createVitalityBattleChainSuite(): TestSuite {
    const suite = new TestSuite('VitalityBattleChain (精力一條龍：名冊→戰場→奧義→結算)');

    suite.test('名冊男性武將沒有精力欄位：戰場武將取名冊的性別預設（120），不是戰場自己的 100', () => {
        const config = buildBattleConfig(rosterGeneral({}), Faction.Player as never);
        const unit = new GeneralUnit(config);
        assert.equals(120, unit.maxVitality);
        assert.equals(120, unit.vitality);
    });

    suite.test('名冊女性武將沒有精力欄位：100', () => {
        const unit = new GeneralUnit(buildBattleConfig(rosterGeneral({ gender: 'female' }), Faction.Player as never));
        assert.equals(100, unit.maxVitality);
        assert.equals(100, unit.vitality);
    });

    suite.test('名冊有精力值時原樣帶進戰場', () => {
        const unit = new GeneralUnit(buildBattleConfig(rosterGeneral({ vitality: 45, maxVitality: 110 }), Faction.Player as never));
        assert.equals(45, unit.vitality);
        assert.equals(110, unit.maxVitality);
    });

    suite.test('一條龍：滿精力男將放奧義（扣 5%）→ 戰後以戰場精力為基準再扣 30', () => {
        const roster = rosterGeneral({});
        const unit = new GeneralUnit(buildBattleConfig(roster, Faction.Player as never));
        const { dispatcher, executedCount } = setup(unit, 0.05);
        const result = dispatcher.executeBattleSkillRequest(ultimateRequest());
        assert.isTrue(result.applied);
        assert.equals(1, executedCount());
        assert.equals(114, unit.vitality, '120 × 5% = 6');
        const settlement = settleBattle([roster], {
            deployedIds: ['hero'],
            result: 'player-win' as never,
            vitalityAfterBattle: { hero: unit.vitality },
        });
        assert.equals(114, settlement.entries[0].vitalityBefore);
        assert.equals(114 - BATTLE_VITALITY_COST, settlement.entries[0].vitalityAfter);
    });

    suite.test('沒放奧義時，戰場基準與名冊一致：男將 120 → 戰後 90（不會被當成 100 → 70）', () => {
        const roster = rosterGeneral({});
        const unit = new GeneralUnit(buildBattleConfig(roster, Faction.Player as never));
        const settlement = settleBattle([roster], {
            deployedIds: ['hero'],
            result: 'player-win' as never,
            vitalityAfterBattle: { hero: unit.vitality },
        });
        assert.equals(120 - BATTLE_VITALITY_COST, settlement.entries[0].vitalityAfter);
    });

    suite.test('精力低迷（中段）：奧義被擋、執行器沒被呼叫、精力不變', () => {
        const unit = new GeneralUnit(buildBattleConfig(rosterGeneral({ vitality: 40, maxVitality: 100 }), Faction.Player as never));
        const { dispatcher, executedCount } = setup(unit, 0.05);
        const result = dispatcher.executeBattleSkillRequest(ultimateRequest());
        assert.isFalse(result.applied);
        assert.equals(0, executedCount());
        assert.equals(40, unit.vitality);
    });

    suite.test('查不到奧義成本時不扣精力', () => {
        const unit = new GeneralUnit(buildBattleConfig(rosterGeneral({}), Faction.Player as never));
        const { dispatcher } = setup(unit, undefined);
        dispatcher.executeBattleSkillRequest(ultimateRequest());
        assert.equals(120, unit.vitality);
    });

    return suite;
}
