/**
 * OpeningLetter.test.ts — 開場信件已讀狀態與段落切分 headless 測試（COPY-02 面板 / PROG-2-1302）
 *
 * 鎖住：未讀才自動開啟；關閉後記為已讀且不修改輸入；存檔讀回的壞資料視為未讀；
 * 本文依空行切段並略過空段。
 *
 * Unity 對照：像 PlayerPrefs 的一個 bool 旗標，第一次彈窗後設為 true，之後不再自動彈。
 */
import { assert, TestSuite } from './TestRunner';
import {
    FRESH_OPENING_LETTER,
    markOpeningLetterSeen,
    normalizeOpeningLetterState,
    shouldShowOpeningLetter,
    splitLetterParagraphs,
} from '../assets/scripts/core/systems/OpeningLetter';

export function createOpeningLetterSuite(): TestSuite {
    const suite = new TestSuite('OpeningLetter (開場信件已讀與段落 COPY-02 面板 / PROG-2-1302)');

    suite.test('新局未讀時自動開啟；關閉後不再自動開', () => {
        assert.isTrue(shouldShowOpeningLetter(FRESH_OPENING_LETTER));
        const seen = markOpeningLetterSeen(FRESH_OPENING_LETTER);
        assert.isFalse(shouldShowOpeningLetter(seen));
    });

    suite.test('標記已讀不修改輸入', () => {
        const state = Object.freeze({ seen: false });
        const next = markOpeningLetterSeen(state);
        assert.isTrue(next.seen);
        assert.isFalse(state.seen);
    });

    suite.test('存檔讀回的壞資料視為未讀，合法布林值照用', () => {
        assert.isFalse(normalizeOpeningLetterState(undefined).seen);
        assert.isFalse(normalizeOpeningLetterState(null).seen);
        assert.isFalse(normalizeOpeningLetterState({ seen: 'yes' }).seen);
        assert.isFalse(normalizeOpeningLetterState({}).seen);
        assert.isTrue(normalizeOpeningLetterState({ seen: true }).seen);
        assert.isFalse(normalizeOpeningLetterState({ seen: false }).seen);
    });

    suite.test('本文依空行切段，前後空白與空段略過', () => {
        const paragraphs = splitLetterParagraphs('第一段\n\n  第二段  \n\n\n\n第三段\n\n');
        assert.equals(3, paragraphs.length);
        assert.equals('第二段', paragraphs[1]);
        assert.equals(0, splitLetterParagraphs('  \n\n  ').length);
    });

    return suite;
}
