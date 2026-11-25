/**
 * HallCrowdVariant.test.ts — 大廳小人色調變體與名牌防疊（PROG-2-10018）
 */
import { assert, TestSuite } from './TestRunner';
import { CROWD_TINTS, crowdHash, crowdTintFor, smoothToward, staggerTagRows, type TagBox } from '../assets/scripts/core/systems/HallCrowdVariant';

export function createHallCrowdVariantSuite(): TestSuite {
    const suite = new TestSuite('HallCrowdVariant');

    suite.test('同一個 id 永遠得到同一組色調', () => {
        assert.equals(crowdTintFor('zhang-fei').r, crowdTintFor('zhang-fei').r, 'r');
        assert.equals(crowdHash('a'), crowdHash('a'), 'hash');
    });

    suite.test('18 位武將會分散到多組色調，不全相同', () => {
        const used = new Set<number>();
        for (let i = 0; i < 18; i++) used.add(CROWD_TINTS.indexOf(crowdTintFor(`general-${i}`)));
        assert.isTrue(used.size >= 4, `只用到 ${used.size} 組`);
    });

    suite.test('空色盤回傳原色', () => {
        const t = crowdTintFor('x', []);
        assert.equals(t.r + t.g + t.b, 765, 'white');
    });

    suite.test('重疊的名牌分到不同列，遠的不動', () => {
        const tags: TagBox[] = [
            { id: 'a', x: 0, y: 0, width: 80 },
            { id: 'b', x: 30, y: 0, width: 80 },
            { id: 'c', x: 60, y: 0, width: 80 },
            { id: 'far', x: 500, y: 0, width: 80 },
        ];
        const rows = staggerTagRows(tags, { rowHeight: 20, maxRows: 4 });
        assert.equals(rows.get('a'), 0, 'a');
        assert.equals(rows.get('b'), 1, 'b');
        assert.equals(rows.get('c'), 2, 'c');
        assert.equals(rows.get('far'), 0, 'far');
    });

    suite.test('結果與輸入順序無關，列數不超過上限', () => {
        const tags: TagBox[] = [];
        for (let i = 0; i < 10; i++) tags.push({ id: `t${i}`, x: i, y: 0, width: 80 });
        const r1 = staggerTagRows(tags, { rowHeight: 20, maxRows: 3 });
        const r2 = staggerTagRows([...tags].reverse(), { rowHeight: 20, maxRows: 3 });
        tags.forEach(t => {
            assert.equals(r1.get(t.id), r2.get(t.id), t.id);
            assert.isTrue((r1.get(t.id) ?? 9) <= 2, 'max rows');
        });
    });

    suite.test('smoothToward 單調靠近目標', () => {
        const v = smoothToward(0, 20, 0.05);
        assert.isTrue(v > 0 && v < 20, 'between');
        assert.equals(smoothToward(5, 5, 1), 5, 'stay');
    });

    return suite;
}
