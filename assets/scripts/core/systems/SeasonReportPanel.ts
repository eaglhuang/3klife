// @spec-source → 武將戰績系統.md §H UI_BATTLE_REPORT；PROG-2-0963（季結彈窗，接 PROG-2-0962 的季度戰報）
/**
 * SeasonReportPanel — 季結戰報彈窗的列資料與文字（純邏輯，不依賴 cc）
 *
 * 職責：把季結 payload 的 quarterlyReports 排成彈窗的列，組出所有 setTextsByPath 要用的文字。
 * 精力行只列達標（可結緣）者，列順序沿用名冊順序（暫定）；超過列數的武將以底部提示說明「另有 X 位」。
 * 本季行動、人口與民心、武將心聲三個區段由 SeasonReportSections 組好傳入（PROG-2-9155）。
 *
 * Unity 對照：Presenter。View 只把 texts[path] 寫進 Label，不自己拼字。
 */
import type { QuarterlyBattleReportRow } from './RetireReviewCopy';
import { estimateWrappedLines, sectionText, SEASON_QUIET_LINE, type SeasonReportSection } from './SeasonReportSections';

/** 彈窗最多列出的武將數（與 layouts/season-report-main.json 的列數一致） */
export const SEASON_REPORT_PANEL_ROWS = 6;

/** 大廳任務區塊的文字節點路徑 */
export const SEASON_REPORT_HALL_LABEL_PATH = 'DialogCard/ScrollView/ScrollContent/HallMissionLabel';

/** 季報新區段（PROG-2-9155）的文字節點路徑，都在 ScrollContent 底下 */
const SCROLL_CONTENT = 'DialogCard/ScrollView/ScrollContent';
export const SEASON_REPORT_EMPTY_HINT_PATH = `${SCROLL_CONTENT}/EmptyHintLabel`;
export const SEASON_REPORT_ACTIONS_LABEL_PATH = `${SCROLL_CONTENT}/ActionsLabel`;
export const SEASON_REPORT_POPULATION_LABEL_PATH = `${SCROLL_CONTENT}/PopulationLabel`;
export const SEASON_REPORT_VOICES_LABEL_PATH = `${SCROLL_CONTENT}/VoicesLabel`;

/** 區段標籤的排版參數：20 號字、行高 24；內文寬約 760，實測約 41 字，保守估 37 */
export const SEASON_REPORT_LABEL_UNITS_PER_LINE = 37;
export const SEASON_REPORT_LABEL_LINE_HEIGHT = 24;
export const SEASON_REPORT_LABEL_PADDING = 12;

/** 以文字估算標籤需要的高度（CLAMP 標籤不夠高會截字）；沒字回 0 */
export function seasonReportLabelHeight(text: string): number {
    const lines = estimateWrappedLines(text, SEASON_REPORT_LABEL_UNITS_PER_LINE);
    return lines === 0 ? 0 : lines * SEASON_REPORT_LABEL_LINE_HEIGHT + SEASON_REPORT_LABEL_PADDING;
}

/** 空列占位文字，與排行榜一致 */
const EMPTY_ROW_TEXT = '—';

/** 結緣建議門檻說明；數字沿用 RetireReviewCopy 的暫定值 */
const BOND_THRESHOLD_HINT = '結緣建議門檻：精力 50% 以上（暫定）';

export interface SeasonReportPanelRow {
    readonly rank: number;
    /** 劇本句，例如「本季戰報：趙雲 精力剩 90%，可進行結緣。」 */
    readonly lineText: string;
}

/** 精力行只列達標者（可結緣，PROG-2-9155 裁決 69）；不達標的武將不列 */
export function buildSeasonReportPanelRows(
    reports: readonly QuarterlyBattleReportRow[],
    limit: number = SEASON_REPORT_PANEL_ROWS,
): SeasonReportPanelRow[] {
    return reports.filter((report) => report.bondRecommended).slice(0, limit).map((report, index) => ({ rank: index + 1, lineText: report.scriptLine }));
}

/**
 * 季結彈窗的全部文字，key 等於 setTextsByPath 的路徑（相對於 screen 根節點）。
 * seasonLabel 由呼叫端用 seasonText 算好傳入，這裡不依賴 i18n。
 */
export function buildSeasonReportPanelTexts(
    seasonLabel: string,
    reports: readonly QuarterlyBattleReportRow[],
    hallMissionLines: readonly string[] = [],
    rankPreviewLine: string = '',
    sections: readonly SeasonReportSection[] = [],
): Record<string, string> {
    const rows = buildSeasonReportPanelRows(reports);
    const qualified = reports.filter((report) => report.bondRecommended).length;
    const hidden = Math.max(0, qualified - rows.length);
    const nothingToReport = rows.length === 0 && hallMissionLines.length === 0 && sections.length === 0;
    const texts: Record<string, string> = {
        'DialogCard/HeaderBar/TitleLabel': '季度戰報',
        'DialogCard/HeaderBar/SeasonLabel': seasonLabel,
        // 官職預告（PROG-2-9151）：下一官職會開什麼，借用這個本來多半空白的提示列，不動版面
        'DialogCard/ScrollView/ScrollContent/EmptyHintLabel': [
            nothingToReport ? SEASON_QUIET_LINE : '',
            rankPreviewLine,
        ].filter((line) => line.length > 0).join('\n'),
        // 大廳任務區塊（doc_spec_1178 §9 步驟 4）：沒有任務結算時為空字串，由畫面層隱藏
        [SEASON_REPORT_ACTIONS_LABEL_PATH]: sectionText(sections, 'actions'),
        [SEASON_REPORT_POPULATION_LABEL_PATH]: sectionText(sections, 'population'),
        [SEASON_REPORT_VOICES_LABEL_PATH]: sectionText(sections, 'voices'),
        [SEASON_REPORT_HALL_LABEL_PATH]: hallMissionLines.length > 0 ? ['大廳任務', ...hallMissionLines].join('\n') : '',
        'DialogCard/FooterBar/HintLabel': rows.length === 0
            ? ''
            : hidden > 0 ? `另有 ${hidden} 位武將未列出 ・ ${BOND_THRESHOLD_HINT}` : BOND_THRESHOLD_HINT,
    };
    for (let i = 0; i < SEASON_REPORT_PANEL_ROWS; i += 1) {
        const row = rows[i];
        const base = `DialogCard/ScrollView/ScrollContent/Row${i}`;
        texts[`${base}/RankLabel`] = row ? String(row.rank) : EMPTY_ROW_TEXT;
        texts[`${base}/LineLabel`] = row ? row.lineText : EMPTY_ROW_TEXT;
    }
    return texts;
}
