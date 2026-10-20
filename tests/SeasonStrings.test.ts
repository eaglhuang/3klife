/**
 * SeasonStrings.test.ts — 四季與換季字串進語系表（TIME-09 / PROG-2-0727）headless 測試
 *
 * 鎖住：四個語系都有 ui.season.* 五個 key；zh-TW 文案與遊戲時間系統.md 一致。
 */
import { assert, TestSuite } from './TestRunner';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const readLocale = (lang: string): Record<string, string> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8')) as Record<string, string>;
const SEASON_KEYS = ['ui.season.display', 'ui.season.spring', 'ui.season.summer', 'ui.season.autumn', 'ui.season.winter'];

export function createSeasonStringsSuite(): TestSuite {
    const suite = new TestSuite('SeasonStrings (四季字串進語系表 TIME-09)');

    suite.test('四個語系都有五個 ui.season.* key', () => {
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const locale = readLocale(lang);
            assert.isTrue(SEASON_KEYS.every((k) => typeof locale[k] === 'string' && locale[k].length > 0));
        }
    });

    suite.test('zh-TW 文案與遊戲時間系統.md 一致', () => {
        const zh = readLocale('zh-TW');
        assert.equals('第 {0} 年 {1} 季', zh['ui.season.display']);
        assert.equals('春——萬物復甦', zh['ui.season.spring']);
        assert.equals('冬——雪夜屯兵', zh['ui.season.winter']);
    });

    return suite;
}
