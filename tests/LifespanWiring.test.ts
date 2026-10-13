import { assert, TestSuite } from './TestRunner';
import {
    applyActiveLifespanCommand,
    applyActiveLifespanToRoster,
    remainingLifespanMonths,
} from '../assets/scripts/core/systems/LifespanWiring';
import { GENERAL_STATUS_DEAD } from '../assets/scripts/core/systems/GeneralAging';
import type { AgingGeneral } from '../assets/scripts/core/systems/GeneralAging';

function hero(extra: Partial<AgingGeneral> = {}): AgingGeneral {
    return { id: 'liu', name: '劉備', faction: 'shu', gender: '男', age: 30, hp: 1000,
        maxLifespan: 70, ...extra } as AgingGeneral;
}

const never = () => 0.999999;
const always = () => 0;

export function createLifespanWiringSuite(): TestSuite {
    const suite = new TestSuite('LifespanWiring (PROG-2-0221 主動指令壽命接線)');

    suite.test('剩餘月數由 age 與 maxLifespan 推導（40 歲距上限 30 歲 = 360 月）', () => {
        assert.equals(360, remainingLifespanMonths(hero({ age: 40, maxLifespan: 70 })));
        assert.equals(0, remainingLifespanMonths(hero({ age: 80, maxLifespan: 70 })));
    });

    for (const [command, cost] of [['nurture', 1], ['siege', 3], ['breeding', 6]] as const) {
        suite.test(`${command} 扣 ${cost} 月：age 前進 ${cost}/12 且不修改輸入`, () => {
            const source = hero({ age: 30 });
            const result = applyActiveLifespanCommand(source, command, never);
            assert.isTrue(result.allowed);
            assert.equals(cost, result.consumedMonths);
            assert.isTrue(Math.abs(30 + cost / 12 - result.general.age!) < 1e-9);
            assert.equals(30, source.age!);
            assert.equals(0, result.events.length);
            assert.isTrue(result.general.status !== GENERAL_STATUS_DEAD);
        });
    }

    suite.test('剩餘歸零即死亡：只發一次 lifespan-cost 死亡事件，年齡夾到上限', () => {
        const result = applyActiveLifespanCommand(hero({ age: 69.5 }), 'breeding', never);
        assert.isTrue(result.allowed);
        assert.equals(GENERAL_STATUS_DEAD, result.general.status!);
        assert.equals(70, result.general.age!);
        assert.equals(1, result.events.length);
        assert.equals('died', result.events[0].type);
        assert.equals('lifespan-cost', (result.events[0] as { cause: string }).cause);
    });

    suite.test('已死亡武將不執行、不扣壽命、不重複發死亡事件', () => {
        const source = hero({ age: 30, status: GENERAL_STATUS_DEAD });
        const result = applyActiveLifespanCommand(source, 'nurture', never);
        assert.isFalse(result.allowed);
        assert.equals(0, result.consumedMonths);
        assert.equals(30, result.general.age!);
        assert.equals(0, result.events.length);
    });

    suite.test('超齡：隨機判定死亡時指令不執行，並標記 over-age', () => {
        const result = applyActiveLifespanCommand(hero({ age: 75, maxLifespan: 70 }), 'siege', always);
        assert.isFalse(result.allowed);
        assert.equals(GENERAL_STATUS_DEAD, result.general.status!);
        assert.equals('over-age', (result.events[0] as { cause: string }).cause);
    });

    suite.test('超齡存活：指令執行但不再扣剩餘壽命，也不發死亡事件', () => {
        const result = applyActiveLifespanCommand(hero({ age: 75, maxLifespan: 70 }), 'siege', never);
        assert.isTrue(result.allowed);
        assert.equals(0, result.consumedMonths);
        assert.equals(75, result.general.age!);
        assert.equals(0, result.events.length);
    });

    suite.test('缺少 age 的資料不猜測：不扣、不判死', () => {
        const source = hero({ age: undefined });
        const result = applyActiveLifespanCommand(source, 'nurture', always);
        assert.isTrue(result.allowed);
        assert.equals(0, result.consumedMonths);
        assert.isTrue(result.general.age === undefined);
    });

    suite.test('名冊替換：只改指定武將，回傳新陣列且不改輸入', () => {
        const roster = [hero({ id: 'a', age: 30 }), hero({ id: 'b', age: 40 })];
        const applied = applyActiveLifespanToRoster(roster, 'b', 'siege', never);
        assert.isTrue(applied !== null);
        assert.equals(40, roster[1].age!);
        assert.equals(30, applied!.roster[0].age!);
        assert.isTrue(Math.abs(40 + 3 / 12 - applied!.roster[1].age!) < 1e-9);
        assert.isTrue(applyActiveLifespanToRoster(roster, 'missing', 'nurture', never) === null);
    });

    return suite;
}
