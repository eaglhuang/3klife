/**
 * FunLineLibrary.test.ts — 趣味台詞彩蛋庫與使用規則 headless 測試（COPY-05 / PROG-2-0945）
 *
 * 鎖住：§7.1 六位名將台詞只在初登場出現；§7.2 開場信件台詞只在開場信出現；
 * §7.3 紅顏台詞保留、不會被任何場景查出；台詞數與規格一致。
 *
 * Unity 對照：像 Localization 表加一個 Tag 欄位，取用端用 Tag 過濾，避免彩蛋跑到錯的畫面。
 */
import { TestSuite, assert } from './TestRunner';
import { FUN_LINES, funLinesFor, isFunLineAllowed } from '../assets/scripts/core/systems/FunLineLibrary';

export function createFunLineLibrarySuite(): TestSuite {
    const suite = new TestSuite('FunLineLibrary (趣味台詞彩蛋庫 COPY-05 / PROG-2-0945)');

    suite.test('六位名將各一條初登場台詞，且只在初登場場景出現', () => {
        const generals = ['zhang-fei', 'sun-ce', 'gan-ning', 'xiahou-dun', 'wei-yan', 'zhang-he'];
        for (const id of generals) {
            const lines = funLinesFor('first-appearance', id);
            assert.equals(1, lines.length, `${id} 應有一條初登場台詞`);
            assert.isTrue(!isFunLineAllowed(lines[0], 'opening-letter'), `${id} 台詞不可進開場信`);
        }
    });

    suite.test('開場信件趣味版五條，只在開場信出現', () => {
        const letter = funLinesFor('opening-letter');
        assert.equals(5, letter.length);
        assert.equals('老朋友，好久不見。', letter[0].text);
        assert.equals(0, funLinesFor('first-appearance').filter((l) => l.speakerId === null).length);
    });

    suite.test('紅顏台詞（§7.3）保留，不在開場信與初登場查得到', () => {
        const redface = FUN_LINES.filter((l) => l.id.startsWith('fun.redface.'));
        assert.equals(3, redface.length);
        for (const line of redface) {
            assert.equals(0, line.scenes.length, `${line.id} 應為保留`);
            assert.isTrue(!isFunLineAllowed(line, 'opening-letter'));
            assert.isTrue(!isFunLineAllowed(line, 'first-appearance'));
        }
    });

    suite.test('每條台詞 id 唯一、文字非空，全庫共 14 條', () => {
        const ids = new Set(FUN_LINES.map((l) => l.id));
        assert.equals(FUN_LINES.length, ids.size);
        for (const line of FUN_LINES) assert.isTrue(line.text.length > 0, `${line.id} 文字為空`);
        assert.equals(14, FUN_LINES.length);
    });

    return suite;
}
