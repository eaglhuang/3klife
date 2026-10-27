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
import { morningReportLines, type MorningReportState } from '../../core/systems/MorningReport';

/** 面板每區最多列數（日報 DAILY_NEWS_COUNT.max、晨報 MORNING_REPORT_SLOTS.highTier 皆為 3） */
export const DAILY_REPORT_MAX_LINES = 3;

export interface DailyReportFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export class DailyReportController {
    private constructor(
        private readonly _newsTitle: string,
        private readonly _news: readonly string[],
        private readonly _morningOpening: string,
        private readonly _morning: readonly string[],
        private readonly _revengeAvailable: boolean,
    ) {}

    /** 擷取未讀內容；日報與晨報都沒有未讀時回 null（不開面板）。revengeAvailable：日報有復仇且有可取回的缺糧（RET-05） */
    public static capture(news: Readonly<DailyNewsState>, morning: Readonly<MorningReportState>, date: Date, revengeAvailable = false): DailyReportController | null {
        const [newsTitle = '', ...newsLines] = dailyNewsToastLines(news, date);
        const [opening = '', ...morningItems] = morningReportLines(morning);
        if (newsLines.length === 0 && morningItems.length === 0) return null;
        return new DailyReportController(newsTitle, newsLines, opening, morningItems, revengeAvailable);
    }

    /** 復仇取回後不再顯示按鈕（RET-05） */
    public withoutRevenge(): DailyReportController {
        return new DailyReportController(this._newsTitle, this._news, this._morningOpening, this._morning, false);
    }

    public get hasNews(): boolean {
        return this._news.length > 0;
    }

    public get hasMorningReport(): boolean {
        return this._morning.length > 0;
    }

    public getFlowView(): DailyReportFlowView {
        const texts: Record<string, string> = {
            reportTitle: this.hasNews ? this._newsTitle : '晨報',
            newsHeader: '三國日報',
            morningHeader: this._morningOpening || '晨報',
            btnOpenJournalHubLabel: '晨報派遣板 ▶',
            btnRevengeLabel: '復仇取回 ▶',
            btnCloseLabel: '知道了',
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
