/**
 * BadgeStacking — 部隊資訊框彼此錯開（PROG-2-9440）
 *
 * 覆蓋：不重疊不動、重疊時後擺的框讓開、剛受擊的框優先留原位、名牌仍是障礙物、三框擠在一起全部分開、結果穩定。
 *
 * Unity 對照：EditMode 測試 UI 標籤 overlap resolver 的貪婪擺放。
 */
import { assert, TestSuite } from './TestRunner';
import { stackBadgeOffsets, type LabelRect, type StackBadgeEntry } from '../assets/scripts/battle/shared/GeneralPlateAvoidance';

const box = (x: number, y: number): LabelRect => ({ x, y, halfW: 63, halfH: 31 });
const e = (id: string, x: number, y: number, priority = 0): StackBadgeEntry => ({ id, rect: box(x, y), priority });
const overlap = (a: LabelRect, b: LabelRect) => Math.abs(a.x - b.x) < a.halfW + b.halfW && Math.abs(a.y - b.y) < a.halfH + b.halfH;
function placed(entries: StackBadgeEntry[], obstacles: LabelRect[] = []): LabelRect[] {
    const off = stackBadgeOffsets(entries, obstacles);
    return entries.map(en => ({ ...en.rect, y: en.rect.y + (off.get(en.id) ?? 0) }));
}

export function createBadgeStackingSuite(): TestSuite {
    const suite = new TestSuite('BadgeStacking (部隊資訊框彼此錯開 PROG-2-9440)');

    suite.test('互不重疊的框不動', () => {
        assert.equals(0, stackBadgeOffsets([e('a', 0, 0), e('b', 300, 0)], []).size);
    });

    suite.test('兩框重疊：依 id 先擺的留原位，另一個讓開且不再重疊', () => {
        const off = stackBadgeOffsets([e('b', 40, 10), e('a', 0, 0)], []);
        assert.isTrue(!off.has('a'), 'a 留原位');
        assert.isTrue(off.has('b'), 'b 讓開');
        const r = placed([e('a', 0, 0), e('b', 40, 10)]);
        assert.isTrue(!overlap(r[0], r[1]), '讓開後不重疊');
    });

    suite.test('剛受擊的框優先留原位', () => {
        const off = stackBadgeOffsets([e('a', 0, 0), e('b', 40, 10, 1)], []);
        assert.isTrue(!off.has('b'), '受擊的 b 不動');
        assert.isTrue(off.has('a'), 'a 讓開');
    });

    suite.test('名牌仍是障礙物：框不會為了錯開壓到名牌', () => {
        const plate: LabelRect = { x: 0, y: 70, halfW: 150, halfH: 45 };
        const r = placed([e('a', 0, 0), e('b', 30, 0)], [plate]);
        for (const b of r) assert.isTrue(!overlap(b, plate), `框不壓名牌 y=${b.y}`);
        assert.isTrue(!overlap(r[0], r[1]), '兩框也分開');
    });

    suite.test('三框擠在同一區（遠排三路）全部分開', () => {
        const list = [e('enemy-cavalry-2', 100, 0), e('enemy-infantry-1', 0, 0), e('enemy-shield-3', 50, 8)];
        const r = placed(list);
        assert.isTrue(!overlap(r[0], r[1]) && !overlap(r[0], r[2]) && !overlap(r[1], r[2]), r.map(b => b.y).join(','));
    });

    suite.test('同輸入結果相同（每幀穩定）', () => {
        const list = [e('c', 20, 0), e('a', 0, 0), e('b', 40, 5)];
        const a = [...stackBadgeOffsets(list, []).entries()].sort().join(';');
        const b = [...stackBadgeOffsets([...list].reverse(), []).entries()].sort().join(';');
        assert.equals(a, b);
    });

    return suite;
}
