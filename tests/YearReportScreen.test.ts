/**
 * 年報畫面文字（TIME-07 / PROG-2-0820）
 *
 * 鎖住：畫面綁定的 id 與文字 key、數字代入、語系表沒有該 key 時退回 zh-TW 預設。
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { buildYearReportTexts, withYearReportFallback, YEAR_REPORT_TEXT_FALLBACK_ZH_TW } from '../assets/scripts/core/systems/YearReport';

const LAYOUT_PATH = path.join('assets', 'resources', 'ui-spec', 'layouts', 'year-report-main.json');

function collectIds(node: { id?: string; children?: unknown[] }, out: string[] = []): string[] {
    if (node.id) out.push(node.id);
    for (const child of (node.children ?? []) as Array<{ id?: string; children?: unknown[] }>) collectIds(child, out);
    return out;
}

export function createYearReportScreenSuite(): TestSuite {
    const suite = new TestSuite('YearReportScreen (年報畫面 TIME-07)');

    suite.test('文字綁定：年份與本年歿、退役候選代入畫面', () => {
        const texts = buildYearReportTexts(
            { year: 3, seasons: 4, deaths: 2, retirementCandidates: 1 },
            withYearReportFallback((key) => key),
        );
        assert.equals('3', texts.yearReportYear);
        assert.equals('3 年度總結', texts.yearReportTitle);
        assert.equals('本年歿：2 人', texts.yearReportDeaths);
        assert.equals('本年屆齡退役候選：1 人', texts.yearReportRetirements);
        assert.equals('關閉', texts.closeYearReportLabel);
    });

    suite.test('語系表缺 key 時退回 zh-TW 預設，不顯示 key 本身', () => {
        const lookup = withYearReportFallback(() => 'ui.year_report.title');
        assert.equals(YEAR_REPORT_TEXT_FALLBACK_ZH_TW['ui.year_report.title'], lookup('ui.year_report.title'));
    });

    suite.test('layout 的文字綁定 id 都能被 buildYearReportTexts 填入', () => {
        const layout = JSON.parse(fs.readFileSync(LAYOUT_PATH, 'utf8'));
        const ids = collectIds(layout.root);
        const texts = buildYearReportTexts({ year: 1, seasons: 4, deaths: 0, retirementCandidates: 0 });
        for (const key of ['yearReportTitle', 'yearReportYear', 'yearReportIntro', 'yearReportDeaths', 'yearReportRetirements', 'closeYearReportLabel']) {
            assert.isTrue(ids.includes(key));
            assert.isTrue(key in texts);
        }
        assert.isTrue(ids.includes('btnCloseYearReport'));
    });

    return suite;
}
