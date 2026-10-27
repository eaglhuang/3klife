/**
 * DailyReportController.test.ts — 登入面板：三國日報與晨報改走 UCUF 畫面（PROG-2-1192）
 */
import { assert, TestSuite } from './TestRunner';
import type { DailyNewsState } from '../assets/scripts/core/systems/DailyNewsEngine';
import { MORNING_REPORT_OPENING, type MorningReportState } from '../assets/scripts/core/systems/MorningReport';
import { DailyReportController } from '../assets/scripts/ui/core/DailyReportController';

const DATE = new Date(2026, 9, 28);

function news(read: boolean[]): DailyNewsState {
    return {
        lastGeneratedDay: '2026-10-28',
        lastLoginMs: 0,
        news: read.map((r, i) => ({ type: 'GOSSIP', character: `將${i}`, emotion: '開心', action: '閒聊', result: '傳開了', read: r })),
    } as unknown as DailyNewsState;
}

function morning(summaries: string[], read = false): MorningReportState {
    return { journalMark: 0, items: summaries.map((summary, i) => ({ entryId: `e${i}`, summary })), read };
}

export function createDailyReportControllerSuite(): TestSuite {
    const suite = new TestSuite('DailyReportController (PROG-2-1192 日報／晨報登入面板)');

    suite.test('日報與晨報都沒有未讀時不開面板', () => {
        assert.isTrue(DailyReportController.capture(news([true]), morning(['舊事'], true), DATE) === null);
        assert.isTrue(DailyReportController.capture(news([]), morning([]), DATE) === null);
    });

    suite.test('只列未讀日報，標題帶日期；晨報區有開場與各則', () => {
        const panel = DailyReportController.capture(news([true, false, false]), morning(['甲事', '乙事']), DATE)!;
        const view = panel.getFlowView();
        assert.equals('三國日報 —— 2026-10-28', view.texts.reportTitle);
        assert.equals('將1（開心）：閒聊，傳開了', view.texts.newsLine0);
        assert.isTrue(view.actives.newsLine1 && !view.actives.newsLine2);
        assert.equals(MORNING_REPORT_OPENING, view.texts.morningHeader);
        assert.equals('乙事', view.texts.morningLine1);
        assert.isTrue(view.actives.morningHeader && !view.actives.morningLine2);
    });

    suite.test('只有晨報時日報區隱藏、標題改為晨報', () => {
        const view = DailyReportController.capture(news([true]), morning(['甲事']), DATE)!.getFlowView();
        assert.equals('晨報', view.texts.reportTitle);
        assert.isTrue(!view.actives.newsHeader && !view.actives.newsLine0);
        assert.isTrue(view.actives.morningLine0 && view.enabled.btnClose);
    });

    suite.test('擷取後內容固定，之後標記已讀不影響面板', () => {
        const state = news([false]);
        const panel = DailyReportController.capture(state, morning([]), DATE)!;
        state.news[0].read = true;
        assert.isTrue(panel.hasNews && !panel.hasMorningReport);
        assert.equals('將0（開心）：閒聊，傳開了', panel.getFlowView().texts.newsLine0);
    });

    return suite;
}
