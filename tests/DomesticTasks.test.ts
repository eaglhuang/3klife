import { assert, TestSuite } from './TestRunner';
import {
    DOMESTIC_TASK_IDS,
    DOMESTIC_TASK_OUTPUT,
    DomesticCaps,
    DomesticStock,
    EMPTY_DOMESTIC_LOG,
    runDomesticTask,
} from '../assets/scripts/core/systems/DomesticTasks';

const STOCK: DomesticStock = { food: 100, gold: 100, fame: 100, cityTroops: 100 };
const CAPS: DomesticCaps = { food: 10000, gold: 5000, fame: 2000, cityTroops: 3000 };

export function createDomesticTasksSuite(): TestSuite {
    const suite = new TestSuite('DomesticTasks (MVP-10 基礎內政 5 大任務)');

    suite.test('5 大任務齊全，且每項都有產出資源', () => {
        assert.equals(5, DOMESTIC_TASK_IDS.length);
        for (const id of DOMESTIC_TASK_IDS) {
            assert.isTrue(DOMESTIC_TASK_OUTPUT[id].amount > 0);
        }
    });

    for (const id of DOMESTIC_TASK_IDS) {
        suite.test(`${id} 產出 ${DOMESTIC_TASK_OUTPUT[id].resource} 且不修改輸入`, () => {
            const source = Object.freeze({ ...STOCK });
            const result = runDomesticTask(source, EMPTY_DOMESTIC_LOG, 1, id, CAPS);
            const out = DOMESTIC_TASK_OUTPUT[id];
            assert.isTrue(result.ok);
            assert.equals(out.amount, result.granted);
            assert.equals(STOCK[out.resource] + out.amount, result.stock[out.resource]);
            assert.equals(100, source[out.resource]);
            assert.isTrue(result.stock !== source);
            assert.equals(1, result.log.lastSeason!);
            assert.equals(id, result.log.lastTask!);
        });
    }

    suite.test('同一季第二次選任務被拒絕，資源不變', () => {
        const first = runDomesticTask(STOCK, EMPTY_DOMESTIC_LOG, 3, 'farming', CAPS);
        const second = runDomesticTask(first.stock, first.log, 3, 'commerce', CAPS);
        assert.isFalse(second.ok);
        assert.equals('already-chosen-this-season', second.reason!);
        assert.equals(first.stock.gold, second.stock.gold);
        assert.equals(0, second.granted);
    });

    suite.test('下一季可以再選一項', () => {
        const first = runDomesticTask(STOCK, EMPTY_DOMESTIC_LOG, 3, 'farming', CAPS);
        const next = runDomesticTask(first.stock, first.log, 4, 'commerce', CAPS);
        assert.isTrue(next.ok);
        assert.equals(4, next.log.lastSeason!);
    });

    suite.test('未知任務 ID 被拒絕且不產出', () => {
        const result = runDomesticTask(STOCK, EMPTY_DOMESTIC_LOG, 1, 'bogus', CAPS);
        assert.isFalse(result.ok);
        assert.equals('unknown-task', result.reason!);
        assert.equals(0, result.granted);
        assert.isTrue(result.log.lastSeason === null);
    });

    suite.test('產出超過上限時夾到上限，granted 只計實際入帳量', () => {
        const nearCap: DomesticStock = { ...STOCK, cityTroops: 2990 };
        const result = runDomesticTask(nearCap, EMPTY_DOMESTIC_LOG, 1, 'arms', CAPS);
        assert.equals(3000, result.stock.cityTroops);
        assert.equals(10, result.granted);
        assert.equals(80, result.output!.amount);
    });

    suite.test('已超過上限時不會被砍回上限', () => {
        const over: DomesticStock = { ...STOCK, fame: 2500 };
        const result = runDomesticTask(over, EMPTY_DOMESTIC_LOG, 1, 'diplomacy', CAPS);
        assert.isTrue(result.ok);
        assert.equals(2500, result.stock.fame);
        assert.equals(0, result.granted);
    });

    return suite;
}
