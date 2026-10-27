/**
 * FunLineOpeningLetter.test.ts — 開場信固定一句趣味台詞（COPY-05，PROG-2-1403）
 *
 * 鎖住：同一個 uid 每次都挑同一句；挑出的只會是開場信可用的台詞（初登場台詞不會出現在信裡）；
 * 本文接上一段台詞；沒有 uid 也能回傳有效結果。
 *
 * Unity 對照：像從台詞表依存檔 ID 取固定的一列，不是每次開都隨機抽。
 */
import { assert, TestSuite } from './TestRunner';
import { funLinesFor, openingLetterBodyWithFunLine, openingLetterFunLine } from '../assets/scripts/core/systems/FunLineLibrary';

export function createFunLineOpeningLetterSuite(): TestSuite {
    const suite = new TestSuite('FunLineOpeningLetter (開場信固定一句 COPY-05)');

    suite.test('同一個 uid 每次挑到同一句', () => {
        const a = openingLetterFunLine('uid-123');
        const b = openingLetterFunLine('uid-123');
        assert.isTrue(a !== null);
        assert.equals(a!.id, b!.id);
    });

    suite.test('挑出的台詞只來自開場信場景，初登場台詞不會出現', () => {
        const allowed = funLinesFor('opening-letter').map((line) => line.id);
        const seen = ['a', 'b', 'c', 'uid-1', 'uid-2', 'long-save-identifier-999'].map((uid) => openingLetterFunLine(uid)!.id);
        for (const id of seen) assert.isTrue(allowed.indexOf(id) >= 0);
    });

    suite.test('本文接上一段台詞，原本段落保留在前面', () => {
        const body = '第一段\n\n第二段';
        const composed = openingLetterBodyWithFunLine(body, 'uid-1');
        assert.isTrue(composed.indexOf(body) === 0);
        assert.equals(body.length + 2 + openingLetterFunLine('uid-1')!.text.length, composed.length);
    });

    suite.test('沒有 uid 也能回傳有效台詞', () => {
        const line = openingLetterFunLine('');
        assert.isTrue(line !== null);
    });

    return suite;
}
