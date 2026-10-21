/**
 * SeasonReportPanel.test.ts — 季結戰報彈窗的列與文字（PROG-2-0963）
 *
 * 鎖住：列數上限與順序、空名冊提示、超過列數的「另有 X 位」提示，
 * 以及彈窗文字的路徑都能在 season-report-main.json 找到（避免 setTextsByPath 寫不進去）。
 *
 * Unity 對照：Presenter 的 EditMode 測試，只驗 label 字串與綁定路徑，不開場景。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { QuarterlyBattleReportRow } from '../assets/scripts/core/systems/RetireReviewCopy';
import { quarterlyBattleReport } from '../assets/scripts/core/systems/RetireReviewCopy';
import {
    buildSeasonReportPanelRows,
    buildSeasonReportPanelTexts,
    SEASON_REPORT_PANEL_ROWS,
} from '../assets/scripts/core/systems/SeasonReportPanel';

function reportRow(generalId: string, name: string, pct: number): QuarterlyBattleReportRow {
    return { generalId, ...quarterlyBattleReport(name, pct) };
}

function layoutNamePaths(): Set<string> {
    const layoutPath = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'layouts', 'season-report-main.json');
    const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8')) as { root: LayoutNode };
    const paths = new Set<string>();
    const walk = (node: LayoutNode, prefix: string): void => {
        const current = prefix ? `${prefix}/${node.name}` : node.name;
        paths.add(current);
        for (const child of node.children ?? []) walk(child, current);
    };
    // 根節點（SeasonReportRoot）不屬於 screen 內的路徑，從它的子節點開始算
    for (const child of layout.root.children ?? []) walk(child, '');
    return paths;
}

interface LayoutNode {
    readonly name: string;
    readonly children?: LayoutNode[];
}

export function createSeasonReportPanelSuite(): TestSuite {
    const suite = new TestSuite('SeasonReportPanel (季結戰報彈窗 PROG-2-0963)');

    suite.test('列依名冊順序排列，超過上限的武將不列', () => {
        const reports = Array.from({ length: SEASON_REPORT_PANEL_ROWS + 2 }, (_, i) => reportRow(`g${i}`, `武將${i}`, 80));
        const rows = buildSeasonReportPanelRows(reports);
        assert.equals(SEASON_REPORT_PANEL_ROWS, rows.length);
        assert.equals(1, rows[0].rank);
        assert.equals(reports[0].scriptLine, rows[0].lineText);
        assert.equals(reports[SEASON_REPORT_PANEL_ROWS - 1].scriptLine, rows[SEASON_REPORT_PANEL_ROWS - 1].lineText);
    });

    suite.test('超過列數時底部提示說明「另有 X 位」，列數剛好時不提示人數', () => {
        const reports = Array.from({ length: SEASON_REPORT_PANEL_ROWS + 2 }, (_, i) => reportRow(`g${i}`, `武將${i}`, 80));
        const texts = buildSeasonReportPanelTexts('第 2 年 春季', reports);
        assert.isTrue(texts['DialogCard/FooterBar/HintLabel'].startsWith('另有 2 位武將未列出'));
        const exact = buildSeasonReportPanelTexts('第 2 年 春季', reports.slice(0, SEASON_REPORT_PANEL_ROWS));
        assert.isFalse(exact['DialogCard/FooterBar/HintLabel'].includes('未列出'));
    });

    suite.test('空名冊：空白提示有字，所有列為占位「—」', () => {
        const texts = buildSeasonReportPanelTexts('第 2 年 春季', []);
        assert.equals('本季沒有可回報的武將', texts['DialogCard/ScrollView/ScrollContent/EmptyHintLabel']);
        assert.equals('—', texts['DialogCard/ScrollView/ScrollContent/Row0/LineLabel']);
        assert.equals('—', texts['DialogCard/ScrollView/ScrollContent/Row0/RankLabel']);
    });

    suite.test('有資料時空白提示為空字串，季節字串原樣放進標題列', () => {
        const texts = buildSeasonReportPanelTexts('第 2 年 春季', [reportRow('g1', '趙雲', 90)]);
        assert.equals('', texts['DialogCard/ScrollView/ScrollContent/EmptyHintLabel']);
        assert.equals('第 2 年 春季', texts['DialogCard/HeaderBar/SeasonLabel']);
        assert.equals('本季戰報：趙雲 精力剩 90%，可進行結緣。', texts['DialogCard/ScrollView/ScrollContent/Row0/LineLabel']);
    });

    suite.test('所有文字路徑都存在於 season-report-main.json（setTextsByPath 寫得進去）', () => {
        const reports = [reportRow('g1', '趙雲', 90)];
        const names = layoutNamePaths();
        const missing = Object.keys(buildSeasonReportPanelTexts('第 2 年 春季', reports)).filter(key => !names.has(key));
        assert.equals(0, missing.length);
    });

    return suite;
}
