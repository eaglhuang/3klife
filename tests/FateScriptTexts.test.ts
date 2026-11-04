/**
 * FateScriptTexts.test.ts — 宿命揭曉文案查詢（PROG-2-0735）headless 測試
 *
 * 鎖住：語系表查不到時退回 zh-TW 預設並代入參數；語系表有值時採用語系表。
 */
import { assert, TestSuite } from './TestRunner';
import { FATE_OMEN_KEYS, fateOmenKeyOf, fateText } from '../assets/scripts/ui/core/FateScriptTexts';

export function createFateScriptTextsSuite(): TestSuite {
    const suite = new TestSuite('FateScriptTexts (宿命揭曉文案查詢 PROG-2-0735)');

    suite.test('語系表查不到時退回預設並代入參數', () => {
        const missing = (key: string) => key;
        assert.equals('天命指引：趙雲 天生武骨，建議走武官之路。', fateText(missing, 'ui.fate.script.reveal', '趙雲', '武骨', '武官'));
        assert.equals('天命分流：武官', fateText(missing, 'ui.fate.reveal', '武官'));
        assert.equals('順應天命（成長率正常）', fateText(missing, 'ui.fate.accept'));
    });

    suite.test('未知 key 回傳 key 本身', () => {
        const missing = (key: string) => key;
        assert.equals('ui.fate.nope', fateText(missing, 'ui.fate.nope'));
    });

    suite.test('語系表有值時採用語系表', () => {
        const lookup = (key: string, ...args: string[]) => `[${key}]${args.join('|')}`;
        assert.equals('[ui.fate.reveal]武官', fateText(lookup, 'ui.fate.reveal', '武官'));
    });

    suite.test('開獎天象：三句台詞照武將系統 §G，同一位子嗣固定同一句（PROG-2-1737）', () => {
        const missing = (key: string) => key;
        assert.equals('紫氣東來、流星落屋、百鳥朝鳳', FATE_OMEN_KEYS.map((key) => fateText(missing, key)).join('、'));
        assert.equals(fateOmenKeyOf('child-7'), fateOmenKeyOf('child-7'));
        assert.isTrue(FATE_OMEN_KEYS.includes(fateOmenKeyOf('')), '空 id 也回傳合法 key');
        const seen = new Set(['a', 'b', 'c'].map((id) => fateOmenKeyOf(id)));
        assert.equals(3, seen.size, '不同 id 會分到不同台詞');
    });

    return suite;
}
