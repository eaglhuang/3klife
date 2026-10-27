/**
 * ItemExpiry.test.ts — 限時道具到期判定與回收（ITM-08 / PROG-2-1351）headless 測試
 *
 * 鎖住：永久道具不過期；到期時刻當下即過期；未到期保留；無法解析的時間戳保留不刪；
 * 兩組都保留原本順序；不改動傳入的陣列。
 *
 * Unity 對照：EditMode Test 驗證定時掃描的判定，不實際等待時間流逝。
 */
import { assert, TestSuite } from './TestRunner';
import { sweepExpiredItems, type ExpirableItem } from '../assets/scripts/core/systems/ItemExpiry';

const NOW = 1_000_000;

export function createItemExpirySuite(): TestSuite {
    const suite = new TestSuite('ItemExpiry (限時道具到期回收 ITM-08)');

    suite.test('expireAt 為 null 的永久道具不過期', () => {
        const items: ExpirableItem[] = [{ id: 'perm', expireAt: null }];
        const result = sweepExpiredItems(items, NOW + 999_999_999);
        assert.equals(1, result.kept.length);
        assert.equals(0, result.expired.length);
    });

    suite.test('到期時刻當下即過期（nowMs >= expireAt）', () => {
        const items: ExpirableItem[] = [{ id: 'exact', expireAt: NOW }];
        const result = sweepExpiredItems(items, NOW);
        assert.equals(0, result.kept.length);
        assert.equals('exact', result.expired[0].id);
    });

    suite.test('未到期的道具保留，已到期的回收', () => {
        const items: ExpirableItem[] = [
            { id: 'later', expireAt: NOW + 1 },
            { id: 'past', expireAt: NOW - 1 },
            { id: 'forever', expireAt: null },
        ];
        const result = sweepExpiredItems(items, NOW);
        assert.equals('later', result.kept[0].id);
        assert.equals('forever', result.kept[1].id);
        assert.equals(1, result.expired.length);
        assert.equals('past', result.expired[0].id);
    });

    suite.test('無法解析的時間戳保留，不刪除資料', () => {
        const items: ExpirableItem[] = [
            { id: 'nan', expireAt: Number.NaN },
            { id: 'inf', expireAt: Number.POSITIVE_INFINITY },
        ];
        const result = sweepExpiredItems(items, NOW);
        assert.equals(2, result.kept.length);
        assert.equals(0, result.expired.length);
    });

    suite.test('兩組都保留原本順序，且不改動傳入的陣列', () => {
        const items: ExpirableItem[] = [
            { id: 'a', expireAt: NOW - 5 },
            { id: 'b', expireAt: NOW + 5 },
            { id: 'c', expireAt: NOW - 1 },
            { id: 'd', expireAt: NOW + 9 },
        ];
        const before = items.length;
        const result = sweepExpiredItems(items, NOW);
        assert.equals('b', result.kept[0].id);
        assert.equals('d', result.kept[1].id);
        assert.equals('a', result.expired[0].id);
        assert.equals('c', result.expired[1].id);
        assert.equals(before, items.length);
        assert.equals('a', items[0].id);
    });

    return suite;
}
