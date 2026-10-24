/**
 * CompositePanelI18n.test.ts — CompositePanel 掛載帶入翻譯字典（PROG-2-1092）headless 測試
 */
import { TestSuite, assert } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

export function createCompositePanelI18nSuite(): TestSuite {
    const suite = new TestSuite('CompositePanelI18n (掛載帶入翻譯字典 PROG-2-1092)');

    suite.test('mount 載入目前語系字典並傳給 buildScreen', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/ui/core/CompositePanel.ts'), 'utf8');
        assert.equals(true, src.includes('specLoader.loadI18n(locale)'));
        assert.equals(true, src.includes('buildScreen(layout, skin, i18nStrings, tokens)'));
        assert.equals(false, src.includes('buildScreen(layout, skin, undefined, tokens)'));
    });

    suite.test('結算彈窗按鈕鍵在各語系都有翻譯', () => {
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const dict = JSON.parse(fs.readFileSync(path.join(__dirname, '..', `assets/resources/i18n/${locale}.json`), 'utf8')) as Record<string, string>;
            assert.equals(true, !!dict['ui.result.back_to_lobby'], `${locale} back_to_lobby`);
            assert.equals(true, !!dict['ui.result.retry'], `${locale} retry`);
        }
    });

    return suite;
}
