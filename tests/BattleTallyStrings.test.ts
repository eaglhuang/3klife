/**
 * BattleTallyStrings — 兵種／虎符 UI 字串進 i18n（TRP-19 / PROG-2-0940）headless 測試
 *
 * 鎖住：兵種（虎符）系統 UI 字串表的 21 個 key 在四個語系都存在且非空；
 * 每個 key 的佔位符（{0}、{1}…）在四個語系一致，避免翻譯後少了參數；繁中文字與規格對上。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const I18N_DIR = path.join(__dirname, '..', 'assets', 'resources', 'i18n');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'] as const;

const TALLY_KEYS = [
    'UI_TROOP_CAVALRY', 'UI_TROOP_INFANTRY', 'UI_TROOP_ARCHER', 'UI_TROOP_SHIELD', 'UI_TROOP_PIKE', 'UI_TROOP_NAVY', 'UI_TROOP_SIEGE',
    'UI_TALLY_GET', 'UI_TALLY_EQUIP', 'UI_TALLY_UNEQUIP', 'UI_TALLY_TRANSFER', 'UI_TALLY_QUALITY', 'UI_TALLY_RESONANCE',
    'UI_TALLY_STAR_UP', 'UI_TALLY_BREAKTHROUGH', 'UI_TALLY_BREAKTHROUGH_FAIL', 'UI_TALLY_BREAKTHROUGH_COST',
    'UI_TALLY_TERRAIN', 'UI_TALLY_CLAN', 'UI_TALLY_GENDER', 'UI_TALLY_CODEX',
];

function loadLocale(locale: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${locale}.json`), 'utf8')) as Record<string, string>;
}

/** 取出字串中的佔位符編號，排序後回傳，例如 "{0} 與 {1}" → "0,1" */
function placeholdersOf(text: string): string {
    const found = [...text.matchAll(/\{(\d+)\}/g)].map((m) => m[1]);
    return found.sort().join(',');
}

export function createBattleTallyStringsSuite(): TestSuite {
    const suite = new TestSuite('BattleTallyStrings (兵種／虎符 UI 字串 i18n TRP-19 PROG-2-0940)');

    suite.test('UI 字串表的 21 個 key 在四個語系都存在且非空', () => {
        for (const locale of LOCALES) {
            const table = loadLocale(locale);
            for (const key of TALLY_KEYS) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺少 ${key}`);
            }
        }
    });

    suite.test('每個 key 的佔位符在四個語系一致', () => {
        const tables = LOCALES.map((locale) => loadLocale(locale));
        for (const key of TALLY_KEYS) {
            const expected = placeholdersOf(tables[0][key]);
            for (let i = 1; i < tables.length; i += 1) {
                assert.equals(expected, placeholdersOf(tables[i][key]), `${LOCALES[i]} 的 ${key} 佔位符不一致`);
            }
        }
    });

    suite.test('繁中文字與規格 UI 字串表一致', () => {
        const zhTW = loadLocale('zh-TW');
        assert.equals('騎兵', zhTW.UI_TROOP_CAVALRY);
        assert.equals('獲得虎符【{0}】！', zhTW.UI_TALLY_GET);
        assert.equals('突破失敗，虎符安然無恙。', zhTW.UI_TALLY_BREAKTHROUGH_FAIL);
    });

    return suite;
}
