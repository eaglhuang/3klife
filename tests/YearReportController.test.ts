/**
 * YearReportController.test.ts — 年報畫面控制器（PROG-2-1633 自 LobbyScene 拆出）
 */
import { TestSuite, assert } from './TestRunner';
import { YearReportController } from '../assets/scripts/ui/core/YearReportController';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';

export function createYearReportControllerSuite(): TestSuite {
    const suite = new TestSuite('YearReportController (年報 PROG-2-1633)');

    suite.test('無報表不開；有報表寫字、置頂、開啟；關閉鈕收起', async () => {
        let bindings: MentorHoldingsButtonBinding[] = [];
        const texts: Record<string, string> = {};
        let fronts = 0;
        const host = {
            node: { active: false },
            binder: {
                setTexts: (t: Record<string, string>) => { Object.assign(texts, t); },
                setActives: () => undefined,
            },
        };
        const ctrl = new YearReportController({
            mountHost: async (b) => { bindings = b; return host; },
            lookup: (key) => key,
            bringToFront: () => { fronts++; },
        });
        await ctrl.mount();
        ctrl.open(undefined);
        assert.isFalse(host.node.active);
        ctrl.open({ year: 3, seasons: 4, deaths: 1, retirementCandidates: 2 });
        assert.isTrue(host.node.active);
        assert.equals(1, fronts);
        assert.isTrue((texts.yearReportTitle ?? '').includes('3'), texts.yearReportTitle);
        bindings.find((b) => b.buttonId === 'btnCloseYearReport')?.handler();
        assert.isFalse(host.node.active);
    });

    return suite;
}
