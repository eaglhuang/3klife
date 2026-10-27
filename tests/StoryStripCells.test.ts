/**
 * StoryStripCells.test.ts — 故事條 6 格結構檢查（GDP-09 結構部分，PROG-2-1272）headless 測試
 *
 * 鎖住：6 格且 slot 唯一、text 非空時無錯誤；格數不對、slot 或 text 為空、slot 重複、
 * 非陣列輸入都會回報錯誤。
 */
import { assert, TestSuite } from './TestRunner';
import { storyStripStructureErrors } from '../assets/scripts/core/systems/StoryStripCells';

function sixCells(): { slot: string; text: string }[] {
    return ['origin', 'faction', 'role', 'awakening', 'bloodline', 'future'].map((slot) => ({ slot, text: `${slot}-text` }));
}

export function createStoryStripCellsSuite(): TestSuite {
    const suite = new TestSuite('StoryStripCells (故事條 6 格結構 GDP-09 PROG-2-1272)');

    suite.test('6 格、slot 唯一、text 非空時沒有結構錯誤', () => {
        assert.equals(0, storyStripStructureErrors(sixCells()).length);
    });

    suite.test('格數不是 6 時回報錯誤', () => {
        const errors = storyStripStructureErrors(sixCells().slice(0, 5));
        assert.isTrue(errors.some((e) => e.includes('格數為 5')));
    });

    suite.test('slot 或 text 為空時回報是哪一格', () => {
        const cells = sixCells();
        cells[1].text = '  ';
        cells[3].slot = '';
        const errors = storyStripStructureErrors(cells);
        assert.isTrue(errors.includes('第 2 格 text 為空'));
        assert.isTrue(errors.includes('第 4 格 slot 為空'));
    });

    suite.test('slot 重複時回報錯誤', () => {
        const cells = sixCells();
        cells[5].slot = 'origin';
        assert.isTrue(storyStripStructureErrors(cells).some((e) => e.includes('"origin" 重複')));
    });

    suite.test('非陣列輸入回報錯誤，不丟錯', () => {
        assert.equals('storyStripCells 不是陣列', storyStripStructureErrors(null)[0]);
    });

    return suite;
}
