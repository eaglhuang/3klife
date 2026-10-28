// @spec-source → 三國日報（PROG-2-1170／1173）、晨報 doc_spec_0015 §F-1（PROG-2-1174）；PROG-2-1192（登入面板）
/**
 * DailyReportController — 登入面板：三國日報與晨報（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 登入讀檔後擷取未讀日報（標題＋各則）與未讀晨報（開場＋各則），兩者都沒有時回 null
 *   - 輸出扁平 FlowView，key 與 daily-report-main 版面節點 id 一一對應
 *
 * 擷取後呼叫端即可標記已讀；面板內容不再隨會話狀態變動。
 * 暫定：分區標題、按鈕文案、空分區提示待企劃定版。
 * Unity 對照：Presenter。
 */
import { dailyNewsToastLines, type DailyNewsState } from '../../core/systems/DailyNewsEngine';
import {
    MORNING_REPORT_OPENING, MORNING_REPORT_OPENING_KEY, morningReportLines, type MorningReportState,
} from '../../core/systems/MorningReport';
import { journalSummaryText } from './JournalTexts';
import { dailyReportDateText, dailyReportText, type DailyReportTextLookup } from './DailyReportTexts';

/** 面板每區最多列數（日報 DAILY_NEWS_COUNT.max、晨報 MORNING_REPORT_SLOTS.highTier 皆為 3） */
export const DAILY_REPORT_MAX_LINES = 3;

export interface DailyReportFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

/** 未讀晨報的開場與各則文字（PROG-2-1500）：依查表取譯文，缺譯文退回 zh-TW；已讀或沒有條目時為空。 */
function morningPanelLines(morning: Readonly<MorningReportState>, lookup: DailyReportTextLookup | undefined): { opening: string; items: string[] } {
    if (morningReportLines(morning).length === 0) return { opening: '', items: [] };
    return {
        opening: journalSummaryText(lookup, { summary: MORNING_REPORT_OPENING, summaryKey: MORNING_REPORT_OPENING_KEY }),
        items: morning.items.map((item) => journalSummaryText(lookup, item)),
    };
}

export class DailyReportController {
    private constructor(
        private readonly _newsTitle: string,
        private readonly _news: readonly string[],
        private readonly _morningOpening: string,
        private readonly _morning: readonly string[],
        private readonly _revengeAvailable: boolean,
        private readonly _lookup: DailyReportTextLookup | undefined,
    ) {}

    /**
     * 擷取未讀內容；日報與晨報都沒有未讀時回 null（不開面板）。
     * revengeAvailable：日報有復仇且有可取回的缺糧（RET-05）；lookup：面板文字查表（RET-06），未提供時用 zh-TW 預設。
     */
    public static capture(news: Readonly<DailyNewsState>, morning: Readonly<MorningReportState>, date: Date, revengeAvailable = false, lookup?: DailyReportTextLookup): DailyReportController | null {
        // 核心的第一行是 zh-TW 標題，這裡只取日報各則，標題改由查表組出
        const [, ...newsLines] = dailyNewsToastLines(news, date);
        const morningPanel = morningPanelLines(morning, lookup);
        if (newsLines.length === 0 && morningPanel.items.length === 0) return null;
        const newsTitle = dailyReportText(lookup, 'UI_DAILY_NEWS_TITLE', dailyReportDateText(date));
        return new DailyReportController(newsTitle, newsLines, morningPanel.opening, morningPanel.items, revengeAvailable, lookup);
    }

    /** 復仇取回後不再顯示按鈕（RET-05） */
    public withoutRevenge(): DailyReportController {
        return new DailyReportController(this._newsTitle, this._news, this._morningOpening, this._morning, false, this._lookup);
    }

    public get hasNews(): boolean {
        return this._news.length > 0;
    }

    public get hasMorningReport(): boolean {
        return this._morning.length > 0;
    }

    public getFlowView(): DailyReportFlowView {
        const texts: Record<string, string> = {
            reportTitle: this.hasNews ? this._newsTitle : dailyReportText(this._lookup, 'UI_DAILY_REPORT_MORNING_TITLE'),
            newsHeader: dailyReportText(this._lookup, 'UI_DAILY_REPORT_NEWS_HEADER'),
            morningHeader: this._morningOpening || dailyReportText(this._lookup, 'UI_DAILY_REPORT_MORNING_TITLE'),
            btnOpenJournalHubLabel: dailyReportText(this._lookup, 'UI_DAILY_REPORT_OPEN_HUB'),
            btnRevengeLabel: dailyReportText(this._lookup, 'UI_DAILY_REPORT_REVENGE'),
            btnCloseLabel: dailyReportText(this._lookup, 'UI_DAILY_REPORT_CLOSE'),
        };
        const actives: Record<string, boolean> = {
            newsHeader: this.hasNews,
            morningHeader: this.hasMorningReport,
            btnRevenge: this._revengeAvailable,
        };
        for (let i = 0; i < DAILY_REPORT_MAX_LINES; i++) {
            texts[`newsLine${i}`] = this._news[i] ?? '';
            actives[`newsLine${i}`] = this._news[i] !== undefined;
            texts[`morningLine${i}`] = this._morning[i] ?? '';
            actives[`morningLine${i}`] = this._morning[i] !== undefined;
        }
        return { texts, actives, enabled: { btnOpenJournalHub: true, btnRevenge: true, btnClose: true } };
    }
}
