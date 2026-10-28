// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) 範圍 #6 人物頁故事回看掛點；PROG-2-1183
/**
 * GeneralJournalController — 武將日誌回看抽屜的畫面流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 依名冊切換武將（上一位／下一位循環、指定武將）
 *   - 列出該武將日誌最新 GENERAL_JOURNAL_MAX_LINES 則，隱藏條目不列；時間顯示為「N年春」
 *   - 輸出扁平 FlowView，key 與 general-journal-main 版面節點 id 一一對應
 *
 * 暫定：每頁則數與空狀態字串規格未寫，待企劃定版後替換。
 * Unity 對照：Presenter，日誌資料由呼叫端注入。
 */

import { journalSummaryText, journalText, type JournalTextLookup } from './JournalTexts';

export const GENERAL_JOURNAL_MAX_LINES = 6;
const SEASON_NAMES = ['春', '夏', '秋', '冬'];

export interface GeneralJournalSubject {
    id: string;
    name: string;
}

export interface GeneralJournalLine {
    timestamp: string;
    summary: string;
    visibility?: string;
    summaryKey?: string;
    summaryArgs?: string[];
}

export interface GeneralJournalDeps {
    /** 可回看的武將（名冊順序） */
    generals: () => readonly GeneralJournalSubject[];
    /** 該武將的日誌條目，最新在前（GameSession.queryJournal 的排序） */
    entries: (generalId: string) => readonly GeneralJournalLine[];
    /** 畫面文字查表（JRN-07）；未提供時用 zh-TW 預設 */
    lookup?: JournalTextLookup;
}

export interface GeneralJournalFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

/** 季節時間戳（YYYY-SS-01T00:00:00）轉「N年春」；格式不符時原樣回傳日期部分 */
export function formatJournalSeason(timestamp: string): string {
    const match = /^(\d{1,4})-(\d{2})-/.exec(timestamp);
    const season = match ? Number(match[2]) : 0;
    if (!match || season < 1 || season > SEASON_NAMES.length) return timestamp.slice(0, 10);
    return `${Number(match[1])}年${SEASON_NAMES[season - 1]}`;
}

export class GeneralJournalController {
    private _index = 0;

    constructor(private readonly _deps: GeneralJournalDeps) {}

    /** 指定武將；不在名冊時維持原選擇並回傳 false */
    public select(generalId: string): boolean {
        const index = this._deps.generals().findIndex((g) => g.id === generalId);
        if (index < 0) return false;
        this._index = index;
        return true;
    }

    public next(): void {
        this._step(1);
    }

    public prev(): void {
        this._step(-1);
    }

    public get currentGeneral(): GeneralJournalSubject | null {
        const generals = this._deps.generals();
        if (generals.length === 0) return null;
        return generals[Math.min(this._index, generals.length - 1)];
    }

    /** 目前武將的日誌行（最新在前，最多 GENERAL_JOURNAL_MAX_LINES） */
    public lines(): string[] {
        const general = this.currentGeneral;
        if (!general) return [];
        return this._deps.entries(general.id)
            .filter((e) => e.visibility !== 'HIDDEN')
            .slice(0, GENERAL_JOURNAL_MAX_LINES)
            .map((e) => `${formatJournalSeason(e.timestamp)}　${journalSummaryText(this._deps.lookup, e)}`);
    }

    public getFlowView(): GeneralJournalFlowView {
        const generals = this._deps.generals();
        const general = this.currentGeneral;
        const lines = this.lines();
        const texts: Record<string, string> = {
            journalTitle: general ? `${general.name}的日誌` : journalText(this._deps.lookup, 'UI_JOURNAL_TITLE'),
            journalPageLabel: general ? `${Math.min(this._index, generals.length - 1) + 1}／${generals.length}` : '',
            journalEmptyLabel: lines.length === 0 ? (general ? journalText(this._deps.lookup, 'UI_JOURNAL_EMPTY') : '名冊中沒有武將') : '',
            btnCloseLabel: '關閉',
        };
        const actives: Record<string, boolean> = { journalEmptyLabel: lines.length === 0 };
        for (let i = 0; i < GENERAL_JOURNAL_MAX_LINES; i++) {
            actives[`journalLine${i}`] = lines[i] !== undefined;
            texts[`journalLine${i}`] = lines[i] ?? '';
        }
        const canSwitch = generals.length > 1;
        return { texts, actives, enabled: { btnPrevGeneral: canSwitch, btnNextGeneral: canSwitch, btnClose: true } };
    }

    private _step(delta: number): void {
        const count = this._deps.generals().length;
        if (count === 0) return;
        this._index = (Math.min(this._index, count - 1) + delta + count) % count;
    }
}
