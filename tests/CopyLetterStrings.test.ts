/**
 * CopyLetterStrings.test.ts — 開場信件與教學引導文案進 i18n（COPY-02 / PROG-2-0944）headless 測試
 *
 * 鎖住：正式版劇本文案.md §2.1（開場信件推薦版）與 §4（教學引導）以 Key 載入，四個語系都存在且非空；
 * 繁中段落數與規格一致。其他語系目前放繁中原文當暫定，待企劃提供翻譯。
 *
 * Unity 對照：像 Localization 表的 String Table，劇本文字不寫死在 Prefab，改由 Key 查表。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const I18N_DIR = path.join(__dirname, '..', 'assets', 'resources', 'i18n');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'] as const;
const LETTER_KEY = 'copy.letter.opening.body';
const TUTORIAL_KEY = 'copy.tutorial.guide.body';

function loadLocale(locale: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${locale}.json`), 'utf8')) as Record<string, string>;
}

export function createCopyLetterStringsSuite(): TestSuite {
    const suite = new TestSuite('CopyLetterStrings (開場信件與教學引導 i18n COPY-02 / PROG-2-0944)');

    suite.test('開場信件與教學引導兩個 Key 在四個語系都存在且非空', () => {
        for (const locale of LOCALES) {
            const table = loadLocale(locale);
            for (const key of [LETTER_KEY, TUTORIAL_KEY]) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺少 ${key}`);
            }
        }
    });

    suite.test('繁中開場信件為規格 §2.1 推薦版，五段', () => {
        const paragraphs = loadLocale('zh-TW')[LETTER_KEY].split('\n\n');
        assert.equals(5, paragraphs.length);
        assert.equals('朋友，剛才看到你又在玩《三國志2》……還是劉備？', paragraphs[0]);
        assert.equals('準備好了，就按下：啟動宿命轉蛋。', paragraphs[4]);
    });

    suite.test('繁中教學引導為規格 §4，三段', () => {
        const paragraphs = loadLocale('zh-TW')[TUTORIAL_KEY].split('\n\n');
        assert.equals(3, paragraphs.length);
        assert.equals('你已經獲得第一位宿命之將，也看見了因子的力量。', paragraphs[0]);
    });

    return suite;
}
