// @spec-source → 武將日誌與離線互動系統.md §E 功能 1（武將日誌主檔）、§I General_Journal.Journal_Entries、§B 規則 3（回扣 Action_Records）；WBS v16.2 JRN-01（PROG-2-0972）
/**
 * JournalLog — 武將日誌主檔的寫入與查詢（純邏輯，不依賴 cc）。
 *
 * - 每筆條目記錄時間、類別、相關武將、優先度、摘要，以及對應的 Action 序號範圍（可回扣）。
 * - 寫入與查詢都不改輸入，回傳新狀態或新陣列。
 * - 類別列表與優先度範圍為暫定（規格範例與 F-1 公式推出，未完整列舉）。
 *
 * Unity 對照：像一個只能 Append 的 Event Log，
 * 每筆事件帶 Timestamp 與來源 ID，UI 只讀取、不直接改寫。
 */

export const JOURNAL_CATEGORIES = ['BATTLE', 'DISPATCH', 'INTERACTION', 'GROWTH', 'SYSTEM'] as const;
export type JournalCategory = typeof JOURNAL_CATEGORIES[number];

export type JournalVisibility = 'VISIBLE' | 'HIDDEN';

export const JOURNAL_PRIORITY_MIN = 0;
export const JOURNAL_PRIORITY_MAX = 100;

export interface JournalEntry {
    entryId: string;
    /** ISO 8601 字串，例如 2026-04-11T06:00:00；字典序即時間序。 */
    timestamp: string;
    category: JournalCategory;
    relatedGeneralUids: string[];
    priority: number;
    summary: string;
    visibility: JournalVisibility;
    /** 對應的 Action_Records 序號範圍 [起, 迄]，含頭尾；沒有對應 Action 時省略。 */
    sourceActionSeqRange?: [number, number];
    /** 對應的離線戰鬥快照或派遣快照 ID。 */
    snapshotRef?: string;
}

export interface JournalState {
    entries: JournalEntry[];
}

export type JournalEntryInput = Omit<JournalEntry, 'visibility'> & { visibility?: JournalVisibility };

export type JournalRejectReason =
    | 'invalid-entry-id'
    | 'duplicate-entry-id'
    | 'invalid-timestamp'
    | 'invalid-category'
    | 'invalid-priority'
    | 'empty-summary'
    | 'invalid-action-range';

export interface JournalWriteResult {
    ok: boolean;
    reason?: JournalRejectReason;
    state: JournalState;
}

export interface JournalQuery {
    generalUid?: string;
    category?: JournalCategory;
}

export function createEmptyJournal(): JournalState {
    return { entries: [] };
}

function isCategory(value: unknown): value is JournalCategory {
    return typeof value === 'string' && (JOURNAL_CATEGORIES as readonly string[]).includes(value);
}

function isValidActionRange(range: readonly number[] | undefined): boolean {
    if (range === undefined) return true;
    if (range.length !== 2) return false;
    const [start, end] = range;
    return Number.isInteger(start) && Number.isInteger(end) && start >= 0 && start <= end;
}

function isIsoTimestamp(value: unknown): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

/** 寫入一筆日誌；任何欄位不合法或 ID 重複時拒絕，狀態不變。 */
export function appendJournalEntry(state: JournalState, input: JournalEntryInput): JournalWriteResult {
    const reject = (reason: JournalRejectReason): JournalWriteResult => ({ ok: false, reason, state: cloneJournal(state) });
    if (typeof input.entryId !== 'string' || input.entryId.length === 0) return reject('invalid-entry-id');
    if (state.entries.some(e => e.entryId === input.entryId)) return reject('duplicate-entry-id');
    if (!isIsoTimestamp(input.timestamp)) return reject('invalid-timestamp');
    if (!isCategory(input.category)) return reject('invalid-category');
    if (!Number.isFinite(input.priority) || input.priority < JOURNAL_PRIORITY_MIN || input.priority > JOURNAL_PRIORITY_MAX) {
        return reject('invalid-priority');
    }
    if (typeof input.summary !== 'string' || input.summary.trim().length === 0) return reject('empty-summary');
    if (!isValidActionRange(input.sourceActionSeqRange)) return reject('invalid-action-range');

    const entry: JournalEntry = {
        ...input,
        relatedGeneralUids: [...input.relatedGeneralUids],
        visibility: input.visibility ?? 'VISIBLE',
        sourceActionSeqRange: input.sourceActionSeqRange ? [input.sourceActionSeqRange[0], input.sourceActionSeqRange[1]] : undefined,
    };
    return { ok: true, state: { entries: [...cloneJournal(state).entries, entry] } };
}

/** 依武將與類別篩選，時間新到舊；都不指定時回傳全部條目。 */
export function queryJournal(state: Readonly<JournalState>, query: JournalQuery = {}): JournalEntry[] {
    return state.entries
        .filter(e => query.generalUid === undefined || e.relatedGeneralUids.includes(query.generalUid))
        .filter(e => query.category === undefined || e.category === query.category)
        .map(e => ({ ...e, relatedGeneralUids: [...e.relatedGeneralUids] }))
        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
}

/** 找出 Action 序號範圍涵蓋該序號的條目，用來從日誌回扣到 Action_Records。 */
export function findJournalEntriesByActionSeq(state: Readonly<JournalState>, seq: number): JournalEntry[] {
    return state.entries
        .filter(e => e.sourceActionSeqRange !== undefined && e.sourceActionSeqRange[0] <= seq && seq <= e.sourceActionSeqRange[1])
        .map(e => ({ ...e, relatedGeneralUids: [...e.relatedGeneralUids] }));
}

function cloneJournal(state: Readonly<JournalState>): JournalState {
    return {
        entries: state.entries.map(e => ({
            ...e,
            relatedGeneralUids: [...e.relatedGeneralUids],
            sourceActionSeqRange: e.sourceActionSeqRange ? [e.sourceActionSeqRange[0], e.sourceActionSeqRange[1]] : undefined,
        })),
    };
}
