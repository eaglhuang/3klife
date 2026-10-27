/**
 * AncestorTreeLayout.test.ts — 命頁左半區 14 人祖先圖與 peek（GDUI-04，PROG-2-1265）headless 測試
 *
 * 鎖住：14 個節點三代 2/4/8、座標在左半區內且不重疊；未揭露 peek 不顯示真名與假資料，
 * 血脈傾向在無標籤時為「—」；揭露後顯示名稱與勢力。
 */
import { assert, TestSuite } from './TestRunner';
import { ANCESTOR_TREE_SLOTS, ancestorPeekView } from '../assets/scripts/core/systems/AncestorTreeLayout';

export function createAncestorTreeLayoutSuite(): TestSuite {
    const suite = new TestSuite('AncestorTreeLayout (命頁祖先圖與 peek GDUI-04 PROG-2-1265)');

    suite.test('14 個節點三代為 2 / 4 / 8', () => {
        assert.equals(14, ANCESTOR_TREE_SLOTS.length);
        const count = (g: number): number => ANCESTOR_TREE_SLOTS.filter((s) => s.generation === g).length;
        assert.equals(2, count(0));
        assert.equals(4, count(1));
        assert.equals(8, count(2));
    });

    suite.test('節點座標在左半區內且彼此不重疊', () => {
        const keys = new Set<string>();
        for (const slot of ANCESTOR_TREE_SLOTS) {
            assert.isTrue(slot.x >= 0 && slot.x <= 1 && slot.y >= 0 && slot.y <= 1);
            keys.add(`${slot.x},${slot.y}`);
        }
        assert.equals(14, keys.size);
    });

    suite.test('未揭露時不顯示真名，無標籤的傾向顯示「—」', () => {
        const view = ancestorPeekView({ name: '趙雲', faction: 'shu' }, false);
        assert.isTrue(view.locked);
        assert.equals('？？？', view.title);
        assert.equals('—', view.tendency);
        assert.isFalse(view.lines.some((line) => line.includes('趙雲')));
    });

    suite.test('未揭露時仍顯示血脈傾向標籤', () => {
        const view = ancestorPeekView({ name: '趙雲', faction: 'shu', core_tags: ['cavalry', 'loyal'] }, false);
        assert.equals('cavalry、loyal', view.tendency);
    });

    suite.test('揭露後顯示名稱與勢力；無資料時為鎖定', () => {
        const shown = ancestorPeekView({ name: '趙雲', faction: 'shu' }, true);
        assert.isFalse(shown.locked);
        assert.equals('趙雲', shown.title);
        assert.isTrue(shown.lines.includes('勢力：shu'));
        assert.isTrue(ancestorPeekView(null, true).locked);
    });

    return suite;
}
