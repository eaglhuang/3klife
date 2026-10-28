/**
 * ZhCnLocaleParity.test.ts — 簡體語系表鍵值齊全檢查（headless）
 *
 * 鎖住：zh-TW 基礎表的每個非註解鍵，zh-CN 都要有非空字串；
 * 日誌、NPC、晨報、日報等畫面補齊後不得再落後，避免簡中玩家看到原始鍵名。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function localeTable(locale: string): Record<string, string> {
    const file = path.join(process.cwd(), 'assets/resources/i18n', `${locale}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
}

export function createZhCnLocaleParitySuite(): TestSuite {
    const suite = new TestSuite('ZhCnLocaleParity (簡體語系鍵齊全)');

    suite.test('zh-TW 每個鍵在 zh-CN 都有非空字串', () => {
        const base = localeTable('zh-TW');
        const zhCn = localeTable('zh-CN');
        const missing = Object.keys(base)
            .filter((key) => !key.startsWith('_comment'))
            .filter((key) => typeof zhCn[key] !== 'string' || zhCn[key].length === 0);
        assert.equals(0, missing.length, `zh-CN 缺少：${missing.join(', ')}`);
    });

    return suite;
}
