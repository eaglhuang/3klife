/**
 * UltimateUiTexts.test.ts — 奧義 UI 字串（UI_ULT_*，WBS ULT-19，PROG-2-1295）headless 測試
 *
 * 鎖住：八個語系鍵都在四個語系表內；每個語系都保留與 zh-TW 預設相同的具名佔位；
 * 代入參數正確；語系表沒有 key 時退回 zh-TW 預設。
 */
import { assert, TestSuite } from './TestRunner';
import {
    ULT_UI_FALLBACK_ZH_TW,
    ULT_UI_KEYS,
    ultimateUiText,
} from '../assets/scripts/ui/core/UltimateUiTexts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function localeTable(locale: string): Record<string, string> {
    const file = path.join(process.cwd(), 'assets/resources/i18n', `${locale}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
}

function placeholders(text: string): string[] {
    return (text.match(/\{\w+\}/g) ?? []).sort();
}

const noTable = (key: string): string => key;

export function createUltimateUiTextsSuite(): TestSuite {
    const suite = new TestSuite('UltimateUiTexts (奧義 UI 字串 UI_ULT_* ULT-19 PROG-2-1295)');

    suite.test('代入具名參數：解鎖、升級、家傳、精力消耗', () => {
        assert.equals('第 3 奧義【赤壁】解鎖！', ultimateUiText(noTable, ULT_UI_KEYS.unlock, { N: 3, UltName: '赤壁' }));
        assert.equals('奧義【赤壁】升級至 Lv.2！', ultimateUiText(noTable, ULT_UI_KEYS.upgrade, { UltName: '赤壁', Level: 2 }));
        assert.equals('【家傳奧義】繼承自 關羽', ultimateUiText(noTable, ULT_UI_KEYS.inherited, { ParentName: '關羽' }));
        assert.equals('精力消耗：8%', ultimateUiText(noTable, ULT_UI_KEYS.cost, { Cost: 8 }));
    });

    suite.test('固定文案不需參數：限用與等級', () => {
        assert.equals('每場限用 1 次', ultimateUiText(noTable, ULT_UI_KEYS.cooldown));
        assert.equals('奧義等級：5', ultimateUiText(noTable, ULT_UI_KEYS.level, { Level: 5 }));
    });

    suite.test('語系表沒有 key 時退回 zh-TW 預設，不顯示原始 key', () => {
        assert.equals('需 2 轉才能解鎖', ultimateUiText(noTable, ULT_UI_KEYS.locked, { N: 2 }));
    });

    suite.test('語系表有值時使用語系表文案', () => {
        const en = (key: string): string => (key === ULT_UI_KEYS.cooldown ? 'Once per battle' : key);
        assert.equals('Once per battle', ultimateUiText(en, ULT_UI_KEYS.cooldown));
    });

    suite.test('zh-TW 預設與語系表 ui.ultimate.* 一致', () => {
        const table = localeTable('zh-TW');
        for (const key of Object.values(ULT_UI_KEYS)) {
            assert.equals(ULT_UI_FALLBACK_ZH_TW[key], table[key], `zh-TW ${key}`);
        }
    });

    suite.test('四個語系都有八個鍵，且具名佔位與 zh-TW 預設相同', () => {
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = localeTable(locale);
            for (const key of Object.values(ULT_UI_KEYS)) {
                const value = table[key];
                assert.isTrue(typeof value === 'string' && value.length > 0, `${locale} 缺 ${key}`);
                assert.equals(
                    placeholders(ULT_UI_FALLBACK_ZH_TW[key]).join(','),
                    placeholders(value).join(','),
                    `${locale} ${key} 佔位不一致`,
                );
            }
        }
    });

    return suite;
}
