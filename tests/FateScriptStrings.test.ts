/**
 * FateScriptStrings.test.ts — 轉職與宿命文案進語系表（FATE-11 / PROG-2-0734）headless 測試
 *
 * 鎖住：四個語系都有 ui.fate.* 十一個 key；zh-TW 文案與轉職與宿命系統.md §G、§H 一致。
 */
import { assert, TestSuite } from './TestRunner';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const readLocale = (lang: string): Record<string, string> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8')) as Record<string, string>;
const FATE_KEYS = [
    'ui.fate.script.reveal',
    'ui.fate.script.defy',
    'ui.fate.script.job_change',
    'ui.fate.script.retire_weapon',
    'ui.fate.script.retire_scroll',
    'ui.fate.reveal',
    'ui.fate.accept',
    'ui.fate.defy',
    'ui.fate.job_change',
    'ui.fate.retire_weapon',
    'ui.fate.retire_scroll',
];

export function createFateScriptStringsSuite(): TestSuite {
    const suite = new TestSuite('FateScriptStrings (轉職與宿命文案進語系表 FATE-11)');

    suite.test('四個語系都有 ui.fate.* 十一個 key', () => {
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const locale = readLocale(lang);
            assert.isTrue(FATE_KEYS.every((k) => typeof locale[k] === 'string' && locale[k].length > 0));
        }
    });

    suite.test('zh-TW 文案與轉職與宿命系統.md §G、§H 一致', () => {
        const zh = readLocale('zh-TW');
        assert.equals('天命指引：{0} 天生{1}，建議走{2}之路。', zh['ui.fate.script.reveal']);
        assert.equals('主公逆天而行！{0} 的成長之路將更加艱難…', zh['ui.fate.script.defy']);
        assert.equals('{0} 在 20 歲成人禮上，選擇了{1}作為副業。', zh['ui.fate.script.job_change']);
        assert.equals('{0} 卸下兵刃，化作虎符，戰技永傳。', zh['ui.fate.script.retire_weapon']);
        assert.equals('{0} 放下竹簡，智慧化為墨香，傳承後世。', zh['ui.fate.script.retire_scroll']);
        assert.equals('天命分流：{0}', zh['ui.fate.reveal']);
        assert.equals('順應天命（成長率正常）', zh['ui.fate.accept']);
        assert.equals('逆天而行（成長率 -20%，有機率大器晚成）', zh['ui.fate.defy']);
        assert.equals('消耗轉職令 ×1，追加副職能：{0}', zh['ui.fate.job_change']);
        assert.equals('獲得虎符：{0}', zh['ui.fate.retire_weapon']);
        assert.equals('獲得竹簡：{0}', zh['ui.fate.retire_scroll']);
    });

    return suite;
}
