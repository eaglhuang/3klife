/**
 * GeneralPoolCycle.test.ts — 人物頁箭頭切換武將（PROG-2-1683）
 *
 * Unity 對照：carousel 上一張／下一張，首尾相接。
 */
import { assert, TestSuite } from './TestRunner';
import { cyclePoolItem } from '../assets/scripts/core/systems/GeneralPoolCycle';

const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

export function createGeneralPoolCycleSuite(): TestSuite {
    const suite = new TestSuite('GeneralPoolCycle (人物頁箭頭切換)');

    suite.test('下一位、上一位，首尾相接', () => {
        assert.equals('b', cyclePoolItem(pool, 'a', 1)?.id);
        assert.equals('a', cyclePoolItem(pool, 'c', 1)?.id);
        assert.equals('c', cyclePoolItem(pool, 'a', -1)?.id);
    });

    suite.test('找不到目前武將回第一位，空清單回 null', () => {
        assert.equals('a', cyclePoolItem(pool, 'x', 1)?.id);
        assert.equals(null, cyclePoolItem([], 'a', 1));
    });

    return suite;
}
