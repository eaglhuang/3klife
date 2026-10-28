/**
 * MirrorFateStrip.test.ts — 命鏡頁 5 格命運帶的映射（STORY-04，PROG-2-1392）
 *
 * 鎖住：前 4 格依序對應；第 5 格合併 bloodline 與 future；future 缺時只用 bloodline；
 * 都沒有資料時 5 格內文皆空；標題順序固定。
 * Unity 對照：6 欄 DataTable 重新 Pack 成 5 欄 ViewModel，合併欄位用 Join，原表不動。
 */
import { assert, TestSuite } from './TestRunner';
import { buildMirrorFateStrip, MIRROR_FATE_TITLES } from '../assets/scripts/core/systems/MirrorFateStrip';
import type { GeneralDetailStoryCellConfig } from '../assets/scripts/core/models/GeneralUnit';

function cells(...slots: Array<[GeneralDetailStoryCellConfig['slot'], string]>): GeneralDetailStoryCellConfig[] {
    return slots.map(([slot, text]) => ({ slot, text }));
}

export function createMirrorFateStripSuite(): TestSuite {
    const suite = new TestSuite('MirrorFateStrip (命鏡頁 5 格命運帶 STORY-04)');

    suite.test('6 格齊全：前 4 格依序，第 5 格為血脈與未來合併', () => {
        const strip = buildMirrorFateStrip(cells(
            ['origin', 'O'], ['faction', 'F'], ['role', 'R'], ['awakening', 'A'], ['bloodline', 'B'], ['future', 'U'],
        ));
        assert.equals(5, strip.length);
        assert.equals('O', strip[0].body);
        assert.equals('F', strip[1].body);
        assert.equals('R', strip[2].body);
        assert.equals('A', strip[3].body);
        assert.equals('B　U', strip[4].body);
    });

    suite.test('第 6 格沒有資料時第 5 格只用血脈', () => {
        const strip = buildMirrorFateStrip(cells(['bloodline', 'B']));
        assert.equals('B', strip[4].body);
    });

    suite.test('血脈缺、只有未來時第 5 格只用未來', () => {
        const strip = buildMirrorFateStrip(cells(['future', 'U']));
        assert.equals('U', strip[4].body);
    });

    suite.test('完全沒有故事條時 5 格內文皆為空字串', () => {
        const strip = buildMirrorFateStrip([]);
        assert.equals(5, strip.length);
        for (const cell of strip) assert.equals('', cell.body);
    });

    suite.test('標題依命鏡頁節點順序固定', () => {
        const strip = buildMirrorFateStrip([]);
        assert.equals(MIRROR_FATE_TITLES.join('|'), strip.map((cell) => cell.title).join('|'));
        assert.equals(5, MIRROR_FATE_TITLES.length);
    });

    return suite;
}
