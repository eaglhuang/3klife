/**
 * TacticCondition — 戰法 TCOND 條件評估（TAC-07，PROG-2-0569）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import { TroopType, Weather } from '../assets/scripts/core/config/Constants';
import {
    evaluateCasterTacticConditions,
    evaluateTacticConditions,
    type TacticConditionContext,
} from '../assets/scripts/core/systems/TacticCondition';

function ctx(over: Partial<TacticConditionContext> = {}): TacticConditionContext {
    return {
        casterTroopType: TroopType.Cavalry,
        weather: Weather.Clear,
        adjacentAllies: 0,
        adjacentEnemies: 0,
        ...over,
    };
}

export function createTacticConditionSuite(): TestSuite {
    const suite = new TestSuite('TacticCondition (戰法 TCOND 條件 TAC-07)');

    suite.test('沒有條件時可發動', () => {
        assert.isTrue(evaluateTacticConditions(undefined, ctx()).ok);
        assert.isTrue(evaluateTacticConditions([], ctx()).ok);
    });

    suite.test('騎兵限定戰法：騎兵可發動，步兵帶不了', () => {
        const conds = [{ kind: 'troopType' as const, allowed: [TroopType.Cavalry] }];
        assert.isTrue(evaluateTacticConditions(conds, ctx({ casterTroopType: TroopType.Cavalry })).ok);
        const infantry = evaluateTacticConditions(conds, ctx({ casterTroopType: TroopType.Infantry }));
        assert.isFalse(infantry.ok);
    });

    suite.test('天氣條件：天氣不符時不可發動', () => {
        const conds = [{ kind: 'weather' as const, allowed: [Weather.Rain] }];
        assert.isFalse(evaluateTacticConditions(conds, ctx({ weather: Weather.Clear })).ok);
        assert.isTrue(evaluateTacticConditions(conds, ctx({ weather: Weather.Rain })).ok);
    });

    suite.test('鄰格條件：敵軍數量不足門檻不可發動，達到門檻可發動', () => {
        const conds = [{ kind: 'adjacentCount' as const, side: 'enemy' as const, min: 2 }];
        assert.isFalse(evaluateTacticConditions(conds, ctx({ adjacentEnemies: 1 })).ok);
        assert.isTrue(evaluateTacticConditions(conds, ctx({ adjacentEnemies: 2 })).ok);
    });

    suite.test('多個條件需全部成立，失敗時回報第一個不成立的條件', () => {
        const weatherCond = { kind: 'weather' as const, allowed: [Weather.Rain] };
        const allyCond = { kind: 'adjacentCount' as const, side: 'ally' as const, min: 1 };
        const result = evaluateTacticConditions([weatherCond, allyCond], ctx({ weather: Weather.Clear, adjacentAllies: 0 }));
        assert.isFalse(result.ok);
        if (!result.ok) assert.equals(weatherCond, result.failed);
        assert.isTrue(evaluateTacticConditions([weatherCond, allyCond], ctx({ weather: Weather.Rain, adjacentAllies: 1 })).ok);
    });

    suite.test('施放者是武將（沒有兵種）時兵種條件略過，天氣條件照常檢查', () => {
        const conds = [{ kind: 'troopType', allowed: [TroopType.Cavalry] }, { kind: 'weather', allowed: [Weather.Windy] }] as const;
        assert.isTrue(evaluateCasterTacticConditions(conds, { casterTroopType: null, weather: Weather.Windy, adjacentAllies: 0, adjacentEnemies: 0 }).ok);
        assert.isFalse(evaluateCasterTacticConditions(conds, { casterTroopType: null, weather: Weather.Clear, adjacentAllies: 0, adjacentEnemies: 0 }).ok);
    });

    suite.test('施放者是兵種單位時兵種條件照常檢查', () => {
        const conds = [{ kind: 'troopType', allowed: [TroopType.Cavalry] }] as const;
        assert.isTrue(evaluateCasterTacticConditions(conds, { casterTroopType: TroopType.Cavalry, weather: Weather.Clear, adjacentAllies: 0, adjacentEnemies: 0 }).ok);
        assert.isFalse(evaluateCasterTacticConditions(conds, { casterTroopType: TroopType.Infantry, weather: Weather.Clear, adjacentAllies: 0, adjacentEnemies: 0 }).ok);
    });

    return suite;
}
