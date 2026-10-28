// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §E-2、§F-1、§G；PROG-2-1174（JRN-02）
/**
 * MorningReport — 晨報摘要：每次登入把上次登入後新增的日誌挑 1~3 則高優先條目（純邏輯，不依賴 cc）。
 *
 * - 只負責摘要排序，不重新計算事件真相（§F-1 規則 1、2）。
 * - 日誌只增不刪，時間窗以「上次登入時的條目數」為標記，標記之後的條目才是候選。
 * - 同類別只留最高的一則，避免重複性事件洗版（§F-1 規則 3）。
 * - freshnessWeight／characterAffinityWeight 規格未給數值，暫定皆為 1，等同依 Priority 排序。
 *
 * Unity 對照：登入後的 Summary Overlay 資料來源，像從 Timeline Log 篩出的 Daily Digest。
 */

import type { JournalEntry } from './JournalLog';

/** §G 晨報開頭 */
export const MORNING_REPORT_OPENING = '晨鼓既響，昨夜諸事已整理成報。';
/** 晨報開場的查表 key（PROG-2-1500），對應 zh-TW.json 的 UI_JOURNAL_STORY_MORNING_OPENING */
export const MORNING_REPORT_OPENING_KEY = 'UI_JOURNAL_STORY_MORNING_OPENING';
/** §F-1：官職階位達門檻給 3 則，否則 2 則 */
export const MORNING_REPORT_SLOTS = { base: 2, highTier: 3, highTierMin: 4 } as const;

export interface MorningReportItem {
    entryId: string;
    summary: string;
    /** 選填：劇本句查表 key 與參數（PROG-2-1448），從日誌條目帶過來。 */
    summaryKey?: string;
    summaryArgs?: string[];
}

export interface MorningReportState {
    /** 上次產生晨報時的日誌條目數（時間窗標記） */
    journalMark: number;
    items: MorningReportItem[];
    read: boolean;
}

export const EMPTY_MORNING_REPORT: Readonly<MorningReportState> = { journalMark: 0, items: [], read: true };

export function morningReportSlotCount(officerTier: number): number {
    return officerTier >= MORNING_REPORT_SLOTS.highTierMin ? MORNING_REPORT_SLOTS.highTier : MORNING_REPORT_SLOTS.base;
}

/** 從候選日誌挑晨報：去掉 HIDDEN，同類別留最高，依 Priority 高到低（同分取較新）取名額數。 */
export function buildMorningReport(candidates: readonly JournalEntry[], officerTier: number): JournalEntry[] {
    const byPriority = candidates
        .filter((e) => e.visibility !== 'HIDDEN')
        .slice()
        .sort((a, b) => b.priority - a.priority || (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
    const seen = new Set<string>();
    const picked: JournalEntry[] = [];
    for (const entry of byPriority) {
        if (seen.has(entry.category)) continue;
        seen.add(entry.category);
        picked.push(entry);
    }
    return picked.slice(0, morningReportSlotCount(officerTier));
}

/** 登入時更新晨報：標記之後新增的日誌才是候選；沒有新條目時清空並視為已讀。 */
export function refreshMorningReport(state: Readonly<MorningReportState>, entries: readonly JournalEntry[], officerTier: number): MorningReportState {
    const mark = Math.min(state.journalMark, entries.length);
    const items = buildMorningReport(entries.slice(mark), officerTier).map((e) => ({
        entryId: e.entryId,
        summary: e.summary,
        ...(e.summaryKey !== undefined ? { summaryKey: e.summaryKey } : {}),
        ...(e.summaryArgs !== undefined ? { summaryArgs: [...e.summaryArgs] } : {}),
    }));
    return { journalMark: entries.length, items, read: items.length === 0 };
}

export function markMorningReportRead(state: Readonly<MorningReportState>): MorningReportState {
    return { journalMark: state.journalMark, items: state.items.map((i) => ({ ...i })), read: true };
}

/** 未讀時回傳 [開頭句, 每則摘要]，否則空陣列。 */
export function morningReportLines(state: Readonly<MorningReportState>): string[] {
    if (state.read || state.items.length === 0) return [];
    return [MORNING_REPORT_OPENING, ...state.items.map((i) => i.summary)];
}

export function unreadMorningReportCount(state: Readonly<MorningReportState>): number {
    return state.read ? 0 : state.items.length;
}

export function normalizeMorningReportState(raw: unknown): MorningReportState {
    if (!raw || typeof raw !== 'object') return { ...EMPTY_MORNING_REPORT, items: [] };
    const value = raw as Partial<MorningReportState>;
    const journalMark = Number.isInteger(value.journalMark) && (value.journalMark as number) >= 0 ? (value.journalMark as number) : 0;
    const items = Array.isArray(value.items)
        ? value.items
            .filter((i): i is MorningReportItem => !!i && typeof i.entryId === 'string' && typeof i.summary === 'string')
            .map((i) => ({
                entryId: i.entryId,
                summary: i.summary,
                ...(typeof i.summaryKey === 'string' && i.summaryKey.length > 0 ? { summaryKey: i.summaryKey } : {}),
                ...(typeof i.summaryKey === 'string' && Array.isArray(i.summaryArgs) && i.summaryArgs.every((a) => typeof a === 'string')
                    ? { summaryArgs: [...i.summaryArgs] } : {}),
            }))
        : [];
    return { journalMark, items, read: value.read !== false || items.length === 0 };
}
