/**
 * ItemExpireText.test.ts — 限時道具過期通知文字 ui.item.expire（ITM-08 / PROG-2-1352）headless 測試
 *
 * 鎖住：四個語系都有 ui.item.expire；每個語系都保留 {0} 佔位符，且只有一個；
 * zh-TW 文案與道具系統規格的 UI_ITEM_EXPIRE 一致。
 *
 * Unity 對照：Localization 表的 key 在每個語系都要存在，且格式化參數不能漏掉。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const KEY = 'ui.item.expire';
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'] as const;

function readLocale(lang: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8')) as Record<string, string>;
}

export function createItemExpireTextSuite(): TestSuite {
    const suite = new TestSuite('ItemExpireText (道具過期通知文字 ITM-08)');

    suite.test('四個語系都有 ui.item.expire', () => {
        for (const lang of LOCALES) {
            const text = readLocale(lang)[KEY];
            assert.isTrue(typeof text === 'string' && text.length > 0, lang);
        }
    });

    suite.test('每個語系都保留且只有一個 {0} 佔位符', () => {
        for (const lang of LOCALES) {
            const text = readLocale(lang)[KEY];
            const count = text.split('{0}').length - 1;
            assert.equals(1, count, lang);
        }
    });

    suite.test('zh-TW 文案與規格 UI_ITEM_EXPIRE 一致', () => {
        assert.equals('{0} 已過期並回收', readLocale('zh-TW')[KEY]);
    });

    return suite;
}
