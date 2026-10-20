/**
 * YearReportFlowE2E.test.ts — 年末事件到年報文字的完整路徑（QA，PROG-2-0655）
 *
 * Unity 對照：像 PlayMode 測試——真的推進一年，看 EventBus 收到的 YearEnded 是否帶著年報，
 * 並用四種語系的真實語系表產生畫面文字，確認 {0} 年份占位都被代入。
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS } from '../assets/scripts/core/managers/GameSession';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { buildYearReportTexts, withYearReportFallback, type YearReport } from '../assets/scripts/core/systems/YearReport';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function localeTable(locale: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, `../assets/resources/i18n/${locale}.json`), 'utf8')) as Record<string, string>;
}

function lookupFor(table: Record<string, string>) {
    return withYearReportFallback((key, ...args) => {
        let text = table[key] ?? key;
        args.forEach((value, index) => { text = text.split(`{${index}}`).join(value); });
        return text;
    });
}

export function createYearReportFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('YearReportFlowE2E (年末事件→年報文字)');

    suite.test('advanceYear 經 EventBus 送出 YearEnded，payload 就是該年年報，且只送一次', async () => {
        services().initialize();
        const received: YearReport[] = [];
        const off = services().event.on(GAME_SESSION_EVENTS.YearEnded, (payload?: unknown) => { received.push(payload as YearReport); });
        const report = await services().session.advanceYear();
        off?.();
        assert.equals(1, received.length);
        assert.equals(report.year, received[0].year);
        assert.equals(4, received[0].seasons);
    });

    suite.test('四種語系的年報文字：標題代入年份、沒有殘留占位符或 key', () => {
        const report: YearReport = { year: 7, seasons: 4, deaths: 2, retirementCandidates: 1 };
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const texts = buildYearReportTexts(report, lookupFor(localeTable(locale)));
            for (const [id, text] of Object.entries(texts)) {
                assert.isFalse(/\{\d+\}/.test(text), `${locale} ${id} 殘留占位符: ${text}`);
                assert.isFalse(text.startsWith('ui.year_report.'), `${locale} ${id} 顯示了 key`);
            }
            assert.isTrue(texts.yearReportTitle.includes('7'), `${locale} 標題含年份`);
            assert.isTrue(texts.yearReportDeaths.includes('2'));
        }
    });

    return suite;
}
