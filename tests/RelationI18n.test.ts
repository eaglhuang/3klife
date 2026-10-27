/**
 * RelationI18n.test.ts — 相性關係字串進四語語系表（KIN-12，PROG-2-1250）headless 測試
 *
 * 鎖住：四個語系都有 RelationTexts 用到的 16 個 key（UI_REL_* / UI_AFFINITY_* / UI_RESONANCE_* /
 * UI_FAMILY_* / LORE_REL_*）；各語系佔位符與 zh-TW 相同。
 */
import { assert, TestSuite } from './TestRunner';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja'];
const readLocale = (lang: string): Record<string, string> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8')) as Record<string, string>;
const placeholders = (text: string): string => (text.match(/\{\d+\}/g) ?? []).sort().join(',');
// 與 RelationTexts.ts 的 RELATION_TEXT_FALLBACK_ZH_TW 同一組 key；不 import 該檔，避免本測試綁在 PROG-2-1250 合併順序上
const KEYS = [
    'UI_REL_COUPLE', 'UI_REL_SWORN', 'UI_REL_RIVAL', 'UI_REL_MASTER', 'UI_REL_LORD', 'UI_REL_COMRADE',
    'UI_AFFINITY_HIGH', 'UI_AFFINITY_LOW', 'UI_RESONANCE_TRIGGER', 'UI_FAMILY_TRADITION',
    'LORE_REL_EVENT_FAMOUS_MATCH', 'LORE_REL_EVENT_BLOOD_RESONANCE', 'LORE_REL_EVENT_RIVAL_BREED',
    'LORE_REL_EVENT_SWORN_COMBO', 'LORE_REL_EVENT_COLLECTION_COMPLETE', 'LORE_REL_EVENT_FAMILY_TRADITION',
];

export function createRelationI18nSuite(): TestSuite {
    const suite = new TestSuite('RelationI18n (相性字串進語系表 KIN-12 PROG-2-1250)');

    suite.test('四個語系都有相性關係的全部 key', () => {
        assert.equals(16, KEYS.length);
        for (const lang of LANGS) {
            const locale = readLocale(lang);
            assert.isTrue(KEYS.every((k) => typeof locale[k] === 'string' && locale[k].length > 0));
        }
    });

    suite.test('各語系佔位符與 zh-TW 相同', () => {
        const zh = readLocale('zh-TW');
        for (const lang of LANGS) {
            const locale = readLocale(lang);
            assert.isTrue(KEYS.every((k) => placeholders(locale[k]) === placeholders(zh[k])));
        }
    });

    return suite;
}
