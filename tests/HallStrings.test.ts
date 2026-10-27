/**
 * HallStrings.test.ts — 大廳字串與劇本文案進 i18n（HALL-13 / PROG-2-0946）headless 測試
 *
 * 鎖住：大廳系統.md §H 的 UI_HALL_* 共 21 個 Key、§G 劇本 9 句、城市兵源成本一句，
 * 四個語系都存在且非空；佔位符數量與繁中一致；繁中文字與規格逐字一致。
 *
 * 注意：WBS 寫的是 20 個 UI_HALL_* Key，但規格 §H 表實際是 21 列，這裡以規格為準。
 *
 * Unity 對照：像大廳 Prefab 上的所有 Text 欄位都改成 Localization Key，
 * 測試確認每個 Key 在每個語言表都有、且 {0} 佔位符沒有漏。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const I18N_DIR = path.join(__dirname, '..', 'assets', 'resources', 'i18n');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'] as const;

const HALL_KEYS = [
    'UI_HALL_TITLE', 'UI_HALL_BOARD_MILITARY', 'UI_HALL_BOARD_DOMESTIC', 'UI_HALL_TASK_ACCEPTED',
    'UI_HALL_TASK_DETAIL_TITLE', 'UI_HALL_TASK_INTEL_LABEL', 'UI_HALL_TASK_RECON', 'UI_HALL_TASK_EXECUTE',
    'UI_HALL_TASK_WAIT', 'UI_HALL_TASK_ASSIGN', 'UI_HALL_TASK_AI_ASSIGN', 'UI_HALL_TASK_REWARD_BASE',
    'UI_HALL_TASK_REWARD_BONUS', 'UI_HALL_TASK_COST', 'UI_HALL_VOLUNTEER', 'UI_HALL_SANDBOX',
    'UI_HALL_WORLD_STAGE', 'UI_HALL_WISH_ALTAR', 'UI_HALL_DAY', 'UI_HALL_NIGHT', 'UI_HALL_THEME_SWITCH',
];

const SCRIPT_KEYS = [
    'UI_HALL_SCRIPT_FIRST_VISIT', 'UI_HALL_SCRIPT_VOLUNTEER', 'UI_HALL_SCRIPT_TASK_DETAIL',
    'UI_HALL_SCRIPT_INTEL_LOW', 'UI_HALL_SCRIPT_AI_ASSIGN', 'UI_HALL_SCRIPT_SANDBOX_UP',
    'UI_HALL_SCRIPT_DAY_NIGHT', 'UI_HALL_SCRIPT_FESTIVAL', 'UI_HALL_SCRIPT_WISH_DONE',
];

function loadLocale(locale: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${locale}.json`), 'utf8')) as Record<string, string>;
}

/** 佔位符（{0}、{1}…）個數 */
function placeholderCount(text: string): number {
    return (text.match(/\{\d+\}/g) ?? []).length;
}

export function createHallStringsSuite(): TestSuite {
    const suite = new TestSuite('HallStrings (大廳字串與劇本文案 i18n HALL-13 / PROG-2-0946)');

    suite.test('§H 的 21 個 UI_HALL_* Key、§G 的 9 句劇本與城市兵源成本，在四語系都存在且非空', () => {
        assert.equals(21, HALL_KEYS.length);
        for (const locale of LOCALES) {
            const table = loadLocale(locale);
            for (const key of [...HALL_KEYS, ...SCRIPT_KEYS, 'UI_HALL_COST_TROOPS']) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺少 ${key}`);
            }
        }
    });

    suite.test('繁中文字與規格 §H、§G 逐字一致（抽樣）', () => {
        const zhTW = loadLocale('zh-TW');
        assert.equals('幕府大廳', zhTW.UI_HALL_TITLE);
        assert.equals('情報度：{0}%', zhTW.UI_HALL_TASK_INTEL_LABEL);
        assert.equals('AI 委任', zhTW.UI_HALL_TASK_AI_ASSIGN);
        assert.equals('此處為幕府議事之所，軍務、內政、天下大勢皆匯於此。', zhTW.UI_HALL_SCRIPT_FIRST_VISIT);
        assert.equals('消耗城市兵源 {0}', zhTW.UI_HALL_COST_TROOPS);
    });

    suite.test('佔位符數量在四語系與繁中一致，不漏 {0}', () => {
        const zhTW = loadLocale('zh-TW');
        for (const locale of LOCALES) {
            const table = loadLocale(locale);
            for (const key of [...HALL_KEYS, ...SCRIPT_KEYS, 'UI_HALL_COST_TROOPS']) {
                assert.equals(placeholderCount(zhTW[key]), placeholderCount(table[key]), `${locale} ${key} 佔位符數量不一致`);
            }
        }
    });

    return suite;
}
