/**
 * DailyReportTexts.test.ts — 登入面板文字查表與日報標題的日期參數（RET-06 / PROG-2-1446）
 *
 * 鎖住：有譯文用譯文；缺 key 或空值退回 zh-TW 預設；{0} 日期參數正確帶入；
 * zh-TW.json 與預設一致；控制器接上查表後，面板文字走查表。
 *
 * Unity 對照：Localization 的字串格式化（String.Format {0}），查不到就用基礎語系。
 */
import { assert, TestSuite } from './TestRunner';
import type { DailyNewsState } from '../assets/scripts/core/systems/DailyNewsEngine';
import type { MorningReportState } from '../assets/scripts/core/systems/MorningReport';
import {
    DAILY_REPORT_FALLBACK_ZH_TW, dailyReportDateText, dailyReportText, type DailyReportTextKey,
} from '../assets/scripts/ui/core/DailyReportTexts';
import { DailyReportController } from '../assets/scripts/ui/core/DailyReportController';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

const DATE = new Date(2026, 9, 28);

function news(): DailyNewsState {
    return {
        lastGeneratedDay: '2026-10-28',
        lastLoginMs: 0,
        news: [{ type: 'GOSSIP', character: '將0', emotion: '開心', action: '閒聊', result: '傳開了', read: false }],
    } as unknown as DailyNewsState;
}

function morning(): MorningReportState {
    return { journalMark: 0, items: [{ entryId: 'e0', summary: '甲事' }], read: false } as unknown as MorningReportState;
}

export function createDailyReportTextsSuite(): TestSuite {
    const suite = new TestSuite('DailyReportTexts (登入面板文字查表 RET-06 PROG-2-1446)');

    suite.test('沒有查表時用 zh-TW 預設，{0} 換成參數', () => {
        assert.equals('三國日報 —— 2026-10-28', dailyReportText(undefined, 'UI_DAILY_NEWS_TITLE', '2026-10-28'));
        assert.equals('知道了', dailyReportText(undefined, 'UI_DAILY_REPORT_CLOSE'));
    });

    suite.test('查表有譯文時用譯文，參數照傳', () => {
        const lookup = (key: string, ...args: string[]): string => (key === 'UI_DAILY_NEWS_TITLE' ? `Daily ${args[0]}` : key);
        assert.equals('Daily 2026-10-28', dailyReportText(lookup, 'UI_DAILY_NEWS_TITLE', '2026-10-28'));
    });

    suite.test('查表缺 key（回傳 key）或譯文為空時退回 zh-TW 預設', () => {
        assert.equals('知道了', dailyReportText((key) => key, 'UI_DAILY_REPORT_CLOSE'));
        assert.equals('知道了', dailyReportText(() => '', 'UI_DAILY_REPORT_CLOSE'));
    });

    suite.test('日期文字為 YYYY-MM-DD（與核心日報標題的日期格式一致）', () => {
        assert.equals('2026-10-08', dailyReportDateText(new Date(2026, 9, 8)));
    });

    suite.test('zh-TW.json 的面板 key 與預設一致（避免兩邊漂移）', () => {
        const dict = JSON.parse(fs.readFileSync('assets/resources/i18n/zh-TW.json', 'utf8')) as Record<string, string>;
        for (const key of Object.keys(DAILY_REPORT_FALLBACK_ZH_TW) as DailyReportTextKey[]) {
            assert.equals(DAILY_REPORT_FALLBACK_ZH_TW[key], dict[key], key);
        }
    });

    suite.test('DailyReportController 接上查表：標題、分區與按鈕都走查表', () => {
        const lookup = (key: string, ...args: string[]): string => `[${key}${args.length ? ':' + args.join(',') : ''}]`;
        const view = DailyReportController.capture(news(), morning(), DATE, false, lookup)!.getFlowView();
        assert.equals('[UI_DAILY_NEWS_TITLE:2026-10-28]', view.texts.reportTitle);
        assert.equals('[UI_DAILY_REPORT_NEWS_HEADER]', view.texts.newsHeader);
        assert.equals('[UI_DAILY_REPORT_OPEN_HUB]', view.texts.btnOpenJournalHubLabel);
        assert.equals('[UI_DAILY_REPORT_REVENGE]', view.texts.btnRevengeLabel);
        assert.equals('[UI_DAILY_REPORT_CLOSE]', view.texts.btnCloseLabel);
    });

    suite.test('不傳查表時控制器文字與原本的 zh-TW 一致', () => {
        const view = DailyReportController.capture(news(), morning(), DATE)!.getFlowView();
        assert.equals('三國日報 —— 2026-10-28', view.texts.reportTitle);
        assert.equals('晨報派遣板 ▶', view.texts.btnOpenJournalHubLabel);
    });

    return suite;
}
