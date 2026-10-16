/**
 * 年終年報資料與文字（TIME-07 / PROG-2-0810）
 *
 * 鎖住：第 4 季才觸發年報、事件計數（死亡與退役候選）、文字 fallback，
 * 以及 zh-TW 語系表與程式內預設一致。
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import {
    YEAR_REPORT_TEXT_FALLBACK_ZH_TW,
    buildYearReport,
    buildYearReportTexts,
    isYearEndSeason,
    withYearReportFallback,
} from '../assets/scripts/core/systems/YearReport';
import type { AgingEvent } from '../assets/scripts/core/systems/GeneralAging';

export function createYearReportSuite(): TestSuite {
    const suite = new TestSuite('YearReport (年終年報 TIME-07)');

    suite.test('年報只在第 4 季結束時觸發', () => {
        assert.isFalse(isYearEndSeason(1));
        assert.isFalse(isYearEndSeason(3));
        assert.isTrue(isYearEndSeason(4));
    });

    suite.test('事件計數：死亡與退役候選各自計數，其他事件不算', () => {
        const events: AgingEvent[] = [
            { type: 'died', generalId: 'a', age: 70 },
            { type: 'reached-retirement-age', generalId: 'b', age: 65 },
            { type: 'reached-retirement-age', generalId: 'c', age: 65 },
            { type: 'entered-growth-stage', generalId: 'd', age: 40, stage: 'prime' },
        ];
        const report = buildYearReport(3, events);
        assert.equals(3, report.year);
        assert.equals(4, report.seasons);
        assert.equals(1, report.deaths);
        assert.equals(2, report.retirementCandidates);
    });

    suite.test('文字：占位參數帶入數字，語系查詢缺 key 時退回預設', () => {
        const report = buildYearReport(2, [{ type: 'died', generalId: 'a', age: 70 }]);
        const texts = buildYearReportTexts(report, withYearReportFallback(key => key));
        assert.equals('本年歿：1 人', texts.yearReportDeaths);
        assert.equals('一年將盡，回首今年……', texts.yearReportIntro);
        assert.equals('2', texts.yearReportYear);
    });

    suite.test('zh-TW 語系表與程式內預設一致（ui.year_report.*）', () => {
        const table = JSON.parse(fs.readFileSync('assets/resources/i18n/zh-TW.json', 'utf8')) as Record<string, string>;
        for (const key of Object.keys(YEAR_REPORT_TEXT_FALLBACK_ZH_TW)) {
            assert.equals(YEAR_REPORT_TEXT_FALLBACK_ZH_TW[key], table[key], key);
        }
    });

    return suite;
}
