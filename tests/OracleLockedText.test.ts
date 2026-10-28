/**
 * OracleLockedText.test.ts — 名士未解鎖提示（UI_ORACLE_LOCKED，PROG-2-1293）headless 測試
 *
 * 鎖住：{N} 代入解鎖次數；zh-TW 預設與語系表 ui.oracle.locked 同步；四個語系都有且帶 {N}。
 */
import { assert, TestSuite } from './TestRunner';
import {
    ORACLE_LOCKED_FALLBACK_ZH_TW,
    ORACLE_LOCKED_KEY,
    ORACLE_SAGE_LOCKED_FALLBACK_ZH_TW,
    ORACLE_SAGE_LOCKED_KEY,
    oracleLockedText,
    sageLockedOutcomeText,
} from '../assets/scripts/ui/core/OracleLockedText';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function localeValue(locale: string, key: string = ORACLE_LOCKED_KEY): string | undefined {
    const file = path.join(process.cwd(), 'assets/resources/i18n', `${locale}.json`);
    const table = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
    return table[key];
}

export function createOracleLockedTextSuite(): TestSuite {
    const suite = new TestSuite('OracleLockedText (名士未解鎖提示 UI_ORACLE_LOCKED PROG-2-1293)');

    suite.test('代入 {N} 為解鎖所需的累計占卜次數', () => {
        assert.equals('此名士尚未解鎖（需累計占卜 50 次）', oracleLockedText(50));
        assert.equals('此名士尚未解鎖（需累計占卜 100 次）', oracleLockedText(100));
    });

    suite.test('zh-TW 預設與語系表 ui.oracle.locked 一致', () => {
        assert.equals(localeValue('zh-TW'), ORACLE_LOCKED_FALLBACK_ZH_TW);
    });

    suite.test('四個語系都有 ui.oracle.locked，且都帶 {N}', () => {
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const value = localeValue(locale);
            assert.isTrue(typeof value === 'string' && value.includes('{N}'), `${locale} 缺 ui.oracle.locked 或缺 {N}`);
        }
    });

    suite.test('結果訊息：代入 {Name} 為名士名稱（占卜與預言共用）', () => {
        assert.equals('龐統尚未解鎖', sageLockedOutcomeText('龐統'));
        assert.equals('左慈尚未解鎖', sageLockedOutcomeText('左慈'));
    });

    suite.test('結果訊息 zh-TW 預設與語系表 ui.oracle.sage_locked 一致', () => {
        assert.equals(localeValue('zh-TW', ORACLE_SAGE_LOCKED_KEY), ORACLE_SAGE_LOCKED_FALLBACK_ZH_TW);
    });

    suite.test('結果訊息：四個語系都有 ui.oracle.sage_locked，且都帶 {Name}', () => {
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const value = localeValue(locale, ORACLE_SAGE_LOCKED_KEY);
            assert.isTrue(typeof value === 'string' && value.includes('{Name}'), `${locale} 缺 ui.oracle.sage_locked 或缺 {Name}`);
        }
    });

    return suite;
}
