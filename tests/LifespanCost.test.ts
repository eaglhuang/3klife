import { assert, TestSuite } from './TestRunner';
import { applyLifespanCost, monthsToSeasons, MONTHS_PER_SEASON } from '../assets/scripts/core/systems/LifespanCost';

export function createLifespanCostSuite(): TestSuite {
    const suite = new TestSuite('LifespanCost (LIFE-09 主動指令壽命)');
    for (const [command, cost] of [['nurture', 1], ['siege', 3], ['breeding', 6]] as const) {
        suite.test(`${command} 消耗 ${cost} 月且不修改輸入`, () => {
            const source = Object.freeze({ id: 'hero', remainingMonths: 12 });
            const result = applyLifespanCost(source, command);
            assert.equals(12 - cost, result.state.remainingMonths);
            assert.equals(cost, result.costMonths);
            assert.equals(cost, result.consumedMonths);
            assert.equals(12, source.remainingMonths);
            assert.isTrue(result.state !== source);
            assert.isFalse(result.deathTriggered);
            assert.equals(0, result.events.length);
        });
    }
    suite.test('月換季不進位；三次培育恰為一季', () => {
        assert.equals(3, MONTHS_PER_SEASON);
        assert.equals(1 / 3, monthsToSeasons(1));
        assert.equals(1, monthsToSeasons(3));
        assert.equals(2, monthsToSeasons(6));
        let state = { id: 'hero', remainingMonths: 12 };
        for (let i = 0; i < 3; i++) state = applyLifespanCost(state, 'nurture').state;
        assert.equals(9, state.remainingMonths);
    });
    suite.test('被動季度推進不扣壽命，也不自行判零月死亡', () => {
        for (const remainingMonths of [12, 0]) {
            const result = applyLifespanCost({ id: 'hero', remainingMonths }, 'passive-season');
            assert.equals(remainingMonths, result.state.remainingMonths);
            assert.equals(0, result.costMonths);
            assert.equals(0, result.events.length);
        }
    });
    suite.test('剛好耗盡與不足：夾到零，只回傳一次死亡事件', () => {
        for (const remainingMonths of [6, 2, 0]) {
            const result = applyLifespanCost({ id: 'hero', remainingMonths }, 'breeding');
            assert.equals(0, result.state.remainingMonths);
            assert.equals(remainingMonths, result.consumedMonths);
            assert.isTrue(result.deathTriggered);
            assert.equals('died', result.events[0].type);
            assert.equals('hero', result.events[0].generalId);
            const replay = applyLifespanCost(result.state, 'breeding');
            assert.isFalse(replay.deathTriggered);
            assert.equals(0, replay.events.length);
            assert.equals(0, replay.consumedMonths);
        }
    });
    suite.test('未知指令（包含原型名稱）不扣且回報', () => {
        for (const command of ['unknown', 'toString', '__proto__']) {
            const result = applyLifespanCost({ id: 'hero', remainingMonths: 12 }, command);
            assert.equals(12, result.state.remainingMonths);
            assert.equals(0, result.costMonths);
            assert.equals('unknown-command', result.events[0].type);
        }
    });
    suite.test('負數與非有限壽命拒絕；不把錯誤資料當成死亡', () => {
        for (const value of [-1, NaN, Infinity]) {
            let costThrew = false, conversionThrew = false;
            try { applyLifespanCost({ id: 'hero', remainingMonths: value }, 'siege'); } catch { costThrew = true; }
            try { monthsToSeasons(value); } catch { conversionThrew = true; }
            assert.isTrue(costThrew);
            assert.isTrue(conversionThrew);
        }
    });
    return suite;
}
