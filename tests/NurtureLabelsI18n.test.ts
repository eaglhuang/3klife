/**
 * NurtureLabelsI18n.test.ts — 培育畫面職業／階段／標頭狀態的語系鍵 headless 測試
 *
 * 鎖住：ui.nurture.career.* / phase.* / header.* 九個鍵在四個語系表內都有值；
 * zh-TW 的值與 NurtureFlowController 內建的 zh-TW 退回文字一致（查不到鍵時畫面仍顯示原字）。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const NURTURE_LABEL_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.nurture.career.warrior': '武官',
    'ui.nurture.career.scholar': '文官',
    'ui.nurture.career.undecided': '未定',
    'ui.nurture.career.unknown': '？',
    'ui.nurture.phase.foundation': '啟蒙期',
    'ui.nurture.phase.midterm': '發奮期',
    'ui.nurture.phase.sprint': '衝刺期',
    'ui.nurture.header.completed': '培育完成',
    'ui.nurture.header.not_enrolled': '尚未入學',
};

const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'] as const;

function localeTable(locale: string): Record<string, string> {
    const file = path.join(process.cwd(), 'assets/resources/i18n', `${locale}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
}

export function createNurtureLabelsI18nSuite(): TestSuite {
    const suite = new TestSuite('NurtureLabelsI18n (培育畫面職業／階段／標頭語系鍵)');

    suite.test('四個語系都有九個 ui.nurture 標籤鍵，且有值', () => {
        for (const locale of LOCALES) {
            const table = localeTable(locale);
            for (const key of Object.keys(NURTURE_LABEL_FALLBACK_ZH_TW)) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺少 ${key}`);
            }
        }
    });

    suite.test('zh-TW 的值與內建退回文字一致', () => {
        const table = localeTable('zh-TW');
        for (const [key, fallback] of Object.entries(NURTURE_LABEL_FALLBACK_ZH_TW)) {
            assert.equals(fallback, table[key], `zh-TW ${key}`);
        }
    });

    return suite;
}
