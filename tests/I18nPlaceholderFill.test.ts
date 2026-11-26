/**
 * I18nPlaceholderFill.test.ts — i18n 輸出不得殘留未替換的 {xxx} 佔位符（學府「{currentAge}」回報，PROG-2-10113）
 *
 * I18nSystem.t 只認 {0}{1}… 位置佔位符；學府守衛提示曾寫成具名 {currentAge} 而整串原樣印到畫面。
 * 鎖住：學府守衛 key 在四語系只用位置佔位符，且填入參數後不留任何 {…}；四語系佔位符一致。
 */
import { assert, TestSuite } from './TestRunner';
import { fillI18nArgs } from '../assets/scripts/core/systems/I18nSystem';
import { buildAcademyEmptyGuardViewState } from '../assets/scripts/ui/core/AcademyEmptyGuardView';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja'];
const readLocale = (lang: string): Record<string, string> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8')) as Record<string, string>;
const placeholders = (text: string): string => (text.match(/\{\d+\}/g) ?? []).sort().join(',');
const LEFTOVER = /\{[^{}\s]*\}/;

export function createI18nPlaceholderFillSuite(): TestSuite {
    const suite = new TestSuite('I18nPlaceholderFill (i18n 輸出不殘留佔位符 PROG-2-10113)');

    suite.test('學府守衛 key：四語系只用位置佔位符，填滿參數後不殘留 {…}', () => {
        for (const lang of LANGS) {
            const locale = readLocale(lang);
            const keys = Object.keys(locale).filter((k) => k.startsWith('ui.academy.empty_guard.'));
            assert.isTrue(keys.length >= 4, `${lang} 應有學府守衛 key`);
            for (const key of keys) {
                const out = fillI18nArgs(locale[key], ['3', '15', '12']);
                assert.isFalse(LEFTOVER.test(out), `${lang} ${key} 填入參數後仍殘留佔位符：${out}`);
            }
        }
    });

    suite.test('學府守衛提示：以守衛狀態的參數代入，輸出完整句子', () => {
        const zh = readLocale('zh-TW');
        const state = buildAcademyEmptyGuardViewState({ candidateAges: [3], minEnrollAge: 15 });
        const p = state.messageParams!;
        const text = fillI18nArgs(zh[state.messageKey!], [String(p.currentAge), String(p.minAge), String(p.yearsRemaining)]);
        assert.isFalse(LEFTOVER.test(text), text);
        assert.isTrue(text.includes('3') && text.includes('15') && text.includes('12'), text);
    });

    suite.test('學府守衛 key 在四語系的佔位符集合與 zh-TW 相同', () => {
        const base = readLocale('zh-TW');
        for (const lang of LANGS.slice(1)) {
            const locale = readLocale(lang);
            for (const key of Object.keys(base).filter((k) => k.startsWith('ui.academy.'))) {
                assert.equals(placeholders(base[key]), placeholders(locale[key] ?? ''), `${lang} ${key} 佔位符不一致`);
            }
        }
    });

    return suite;
}
