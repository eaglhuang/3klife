/**
 * UltimateUiTexts.test.ts — 奧義 UI 字串語系鍵（UI_ULT_*，WBS ULT-19，PROG-2-1295）headless 測試
 *
 * 鎖住：八個 ui.ultimate.* 語系鍵在四個語系表內都有值；每個語系保留與 zh-TW 相同的具名佔位。
 * 本張只放語系鍵，畫面接線待奧義畫面實作時一併處理。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ULT_UI_KEYS = [
    'ui.ultimate.unlock',
    'ui.ultimate.cast',
    'ui.ultimate.cost',
    'ui.ultimate.cooldown',
    'ui.ultimate.locked',
    'ui.ultimate.level',
    'ui.ultimate.inherited',
    'ui.ultimate.upgrade',
] as const;

function localeTable(locale: string): Record<string, string> {
    const file = path.join(process.cwd(), 'assets/resources/i18n', `${locale}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
}

function placeholders(text: string): string {
    return (text.match(/\{\w+\}/g) ?? []).sort().join(',');
}

export function createUltimateUiTextsSuite(): TestSuite {
    const suite = new TestSuite('UltimateUiTexts (奧義 UI 字串語系鍵 UI_ULT_* ULT-19 PROG-2-1295)');

    suite.test('四個語系都有八個 ui.ultimate.* 鍵，且有值', () => {
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = localeTable(locale);
            for (const key of ULT_UI_KEYS) {
                const value = table[key];
                assert.isTrue(typeof value === 'string' && value.length > 0, `${locale} 缺 ${key}`);
            }
        }
    });

    suite.test('各語系的具名佔位與 zh-TW 相同', () => {
        const base = localeTable('zh-TW');
        for (const locale of ['zh-CN', 'en', 'ja']) {
            const table = localeTable(locale);
            for (const key of ULT_UI_KEYS) {
                assert.equals(placeholders(base[key]), placeholders(table[key]), `${locale} ${key} 佔位不一致`);
            }
        }
    });

    return suite;
}
