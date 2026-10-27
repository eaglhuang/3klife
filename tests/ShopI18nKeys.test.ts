/**
 * ShopI18nKeys.test.ts — 商店版面 textKey 在四語系都有翻譯（PROG-2-1098）
 */
import { TestSuite, assert } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.join(__dirname, '..', 'assets/resources');

export function createShopI18nKeysSuite(): TestSuite {
    const suite = new TestSuite('ShopI18nKeys (商店鍵名翻譯 PROG-2-1098)');

    suite.test('shop-main 版面的 textKey 在 zh-TW／zh-CN／en／ja 都有值', () => {
        const layout = fs.readFileSync(path.join(ROOT, 'ui-spec/layouts/shop-main-main.json'), 'utf8');
        const keys = Array.from(new Set(Array.from(layout.matchAll(/"textKey":\s*"([^"]+)"/g), (m) => m[1])));
        assert.isTrue(keys.length >= 5, `keys=${keys.length}`);
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const dict = JSON.parse(fs.readFileSync(path.join(ROOT, `i18n/${locale}.json`), 'utf8')) as Record<string, string>;
            for (const key of keys) assert.isTrue(Boolean(dict[key]), `${locale} 缺 ${key}`);
        }
    });

    return suite;
}
