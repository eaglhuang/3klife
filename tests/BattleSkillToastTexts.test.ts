/**
 * BattleSkillToastTexts.test.ts — 戰鬥戰法／奧義 Toast 與瞄準提示的語系鍵 headless 測試
 *
 * 鎖住：ui.battle.skill.* 鍵在四個語系表內都有值；每個語系都保留 {0} 佔位（技能名或來源標籤）。
 * 戰法來源標籤 source_tactic 不帶佔位，其餘鍵都必須帶 {0}。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const SKILL_TOAST_KEYS = [
    'ui.battle.skill.charging',
    'ui.battle.skill.cast_done',
    'ui.battle.skill.cast_failed',
    'ui.battle.skill.cast_failed_target',
    'ui.battle.skill.cast_failed_cell',
    'ui.battle.skill.pick_enemy',
    'ui.battle.skill.aim.enemy',
    'ui.battle.skill.aim.line',
    'ui.battle.skill.aim.fan',
    'ui.battle.skill.aim.area',
    'ui.battle.skill.aim.tile',
    'ui.battle.skill.aim.adjacent',
] as const;

const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'] as const;

function localeTable(locale: string): Record<string, string> {
    const file = path.join(process.cwd(), 'assets/resources/i18n', `${locale}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
}

export function createBattleSkillToastTextsSuite(): TestSuite {
    const suite = new TestSuite('BattleSkillToastTexts (戰法／奧義 Toast 與瞄準提示語系鍵)');

    suite.test('四個語系都有 ui.battle.skill.* 鍵，且有值', () => {
        for (const locale of LOCALES) {
            const table = localeTable(locale);
            for (const key of ['ui.battle.skill.source_tactic', ...SKILL_TOAST_KEYS]) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺少 ${key}`);
            }
        }
    });

    suite.test('帶佔位的鍵在四個語系都保留 {0}，且不含其他佔位', () => {
        for (const locale of LOCALES) {
            const table = localeTable(locale);
            for (const key of SKILL_TOAST_KEYS) {
                const text = table[key];
                assert.isTrue(text.includes('{0}'), `${locale} ${key} 缺少 {0}`);
                assert.equals(null, text.match(/\{(?!0\})[^}]*\}/), `${locale} ${key} 有非預期佔位`);
            }
        }
    });

    suite.test('來源標籤 source_tactic 在四個語系都是不帶佔位的短字', () => {
        for (const locale of LOCALES) {
            const text = localeTable(locale)['ui.battle.skill.source_tactic'];
            assert.isTrue(text.length > 0 && text.length <= 12, `${locale} source_tactic 過長或為空`);
            assert.isFalse(text.includes('{'), `${locale} source_tactic 不應帶佔位`);
        }
    });

    return suite;
}
