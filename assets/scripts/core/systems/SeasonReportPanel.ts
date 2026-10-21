// @spec-source → 武將戰績系統.md §H UI_BATTLE_REPORT；PROG-2-0963（季結彈窗，接 PROG-2-0962 的季度戰報）
/**
 * SeasonReportPanel — 季結戰報彈窗的列資料與文字（純邏輯，不依賴 cc）
 *
 * 職責：把季結 payload 的 quarterlyReports 排成彈窗的列，組出所有 setTextsByPath 要用的文字。
 * 列順序沿用名冊順序（暫定）；超過列數的武將以底部提示說明「另有 X 位」。
 *
 * Unity 對照：Presenter。View 只把 texts[path] 寫進 Label，不自己拼字。
 */
import type { QuarterlyBattleReportRow } from './RetireReviewCopy';

/** 彈窗最多列出的武將數（與 layouts/season-report-main.json 的列數一致） */
export const SEASON_REPORT_PANEL_ROWS = 6;

/** 空列占位文字，與排行榜一致 */
const EMPTY_ROW_TEXT = '—';

/** 結緣建議門檻說明；數字沿用 RetireReviewCopy 的暫定值 */
const BOND_THRESHOLD_HINT = '結緣建議門檻：精力 50% 以上（暫定）';

export interface SeasonReportPanelRow {
    readonly rank: number;
    /** 劇本句，例如「本季戰報：趙雲 精力剩 90%，可進行結緣。」 */
    readonly lineText: string;
}

export function buildSeasonReportPanelRows(
    reports: readonly QuarterlyBattleReportRow[],
    limit: number = SEASON_REPORT_PANEL_ROWS,
): SeasonReportPanelRow[] {
    return reports.slice(0, limit).map((report, index) => ({ rank: index + 1, lineText: report.scriptLine }));
}

/**
 * 季結彈窗的全部文字，key 等於 setTextsByPath 的路徑（相對於 screen 根節點）。
 * seasonLabel 由呼叫端用 seasonText 算好傳入，這裡不依賴 i18n。
 */
export function buildSeasonReportPanelTexts(
    seasonLabel: string,
    reports: readonly QuarterlyBattleReportRow[],
): Record<string, string> {
    const rows = buildSeasonReportPanelRows(reports);
    const hidden = Math.max(0, reports.length - rows.length);
    const texts: Record<string, string> = {
        'DialogCard/HeaderBar/TitleLabel': '季度戰報',
        'DialogCard/HeaderBar/SeasonLabel': seasonLabel,
        'DialogCard/ScrollView/ScrollContent/EmptyHintLabel': reports.length === 0 ? '本季沒有可回報的武將' : '',
        'DialogCard/FooterBar/HintLabel': hidden > 0
            ? `另有 ${hidden} 位武將未列出 ・ ${BOND_THRESHOLD_HINT}`
            : BOND_THRESHOLD_HINT,
    };
    for (let i = 0; i < SEASON_REPORT_PANEL_ROWS; i += 1) {
        const row = rows[i];
        const base = `DialogCard/ScrollView/ScrollContent/Row${i}`;
        texts[`${base}/RankLabel`] = row ? String(row.rank) : EMPTY_ROW_TEXT;
        texts[`${base}/LineLabel`] = row ? row.lineText : EMPTY_ROW_TEXT;
    }
    return texts;
}
