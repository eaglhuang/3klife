/**
 * TallyInsertTarget.test.ts — 兵頁插卡按鈕的目標選擇（TRP-18）
 *
 * 鎖住：循環選武將會回到第一位；要插的卡取第一張未裝備者，已裝備者跳過，全裝備時為 null。
 */
import { TestSuite, assert } from './TestRunner';
import { firstUnequippedTallyUid, nextInsertTargetIndex } from '../assets/scripts/core/systems/TallyInsertTarget';

export function createTallyInsertTargetSuite(): TestSuite {
    const suite = new TestSuite('TallyInsertTarget (兵頁插卡目標選擇 TRP-18)');

    suite.test('循環選武將：到尾端回到第一位，空名冊回 0', () => {
        assert.equals(1, nextInsertTargetIndex(0, 3));
        assert.equals(0, nextInsertTargetIndex(2, 3));
        assert.equals(0, nextInsertTargetIndex(0, 0));
    });

    suite.test('要插的卡：依 uid 排序，跳過已裝備者', () => {
        const cards = { 'card-b': {}, 'card-a': {}, 'card-c': {} };
        assert.equals('card-a', firstUnequippedTallyUid(cards, {}) ?? '');
        assert.equals('card-b', firstUnequippedTallyUid(cards, { 'card-a': 'liu-bei' }) ?? '');
        assert.isTrue(firstUnequippedTallyUid(cards, { 'card-a': 'liu-bei', 'card-b': 'guan-yu', 'card-c': 'zhang-fei' }) === null);
    });

    return suite;
}
