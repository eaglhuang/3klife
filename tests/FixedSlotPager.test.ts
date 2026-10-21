/**
 * FixedSlotPager.test.ts — 固定格式列表分頁切片（PROG-2-0746 分頁）headless 測試
 *
 * 鎖住：每頁 5 筆、最後一頁不足 5 筆、頁碼超界會夾回合法範圍、空資料仍是 1 頁、上一頁／下一頁可按性。
 */
import { assert, TestSuite } from './TestRunner';
import { pageSliceOf, FIXED_SLOT_PAGE_SIZE } from '../assets/scripts/ui/core/FixedSlotPager';

const rows = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

export function createFixedSlotPagerSuite(): TestSuite {
    const suite = new TestSuite('FixedSlotPager (固定格式列表分頁 PROG-2-0746)');

    suite.test('每頁固定 5 筆', () => {
        assert.equals(5, FIXED_SLOT_PAGE_SIZE);
        const first = pageSliceOf(rows(12), 0);
        assert.equals(5, first.items.length);
        assert.equals(0, first.items[0]);
    });

    suite.test('最後一頁不足 5 筆時只回傳剩下的資料', () => {
        const last = pageSliceOf(rows(12), 2);
        assert.equals(2, last.items.length);
        assert.equals(10, last.items[0]);
        assert.equals(3, last.pageCount);
    });

    suite.test('頁碼超界時夾回最後一頁，負數夾回第一頁', () => {
        assert.equals(2, pageSliceOf(rows(12), 99).page);
        assert.equals(0, pageSliceOf(rows(12), -3).page);
    });

    suite.test('空資料仍是 1 頁、沒有上下頁', () => {
        const empty = pageSliceOf([], 4);
        assert.equals(0, empty.items.length);
        assert.equals(1, empty.pageCount);
        assert.equals(0, empty.page);
        assert.isFalse(empty.hasPrev);
        assert.isFalse(empty.hasNext);
    });

    suite.test('上一頁／下一頁的可按性依頁碼決定', () => {
        const middle = pageSliceOf(rows(12), 1);
        assert.isTrue(middle.hasPrev);
        assert.isTrue(middle.hasNext);
        const last = pageSliceOf(rows(12), 2);
        assert.isTrue(last.hasPrev);
        assert.isFalse(last.hasNext);
    });

    return suite;
}
