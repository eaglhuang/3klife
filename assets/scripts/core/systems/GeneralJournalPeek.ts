// @spec-source → 武將人物介面規格補遺_2026-04-14 (doc_ui_0014) §3 武將動態日誌氣泡 GeneralJournalPeek（HUM-06，PROG-2-1969）
/**
 * GeneralJournalPeek — 人物頁日誌氣泡與完整生平實錄的資料（純邏輯，不依賴 cc）。
 *
 * - 氣泡：取該武將最新一筆可見日誌，組成「[時間戳]：[動作描述]」。
 * - 生平實錄：該武將全部可見日誌，依時間由舊到新。
 * - 隱藏（HIDDEN）條目一律不顯示。
 *
 * 暫定：時間戳用相對日期（今日、昨晚、N 日前，7 日以上顯示月/日）；規格只有「昨晚」範例。
 * Unity 對照：像從 Event Log 取最後一筆餵給 Tooltip，點開再列整份清單。
 */
import { queryJournal, type JournalEntry, type JournalState } from './JournalLog';

export interface JournalPeekBubble {
    entryId: string;
    timeLabel: string;
    text: string;
}

export interface LifeRecordRow {
    entryId: string;
    timestamp: string;
    category: JournalEntry['category'];
    summary: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayIndex(iso: string): number | null {
    const date = new Date(iso.slice(0, 10) + 'T00:00:00Z');
    const t = date.getTime();
    return Number.isFinite(t) ? Math.floor(t / DAY_MS) : null;
}

/** 相對時間標籤：今日／昨晚／N 日前（2~6）／月/日。 */
export function journalTimeLabel(timestamp: string, nowIso: string): string {
    const then = dayIndex(timestamp);
    const now = dayIndex(nowIso);
    if (then === null || now === null) return '';
    const diff = now - then;
    if (diff <= 0) return '今日';
    if (diff === 1) return '昨晚';
    if (diff < 7) return `${diff} 日前`;
    return `${Number(timestamp.slice(5, 7))}/${Number(timestamp.slice(8, 10))}`;
}

function visibleEntriesOf(state: Readonly<JournalState>, generalUid: string): JournalEntry[] {
    return queryJournal(state, { generalUid }).filter((e) => e.visibility === 'VISIBLE');
}

/** 氣泡：最新一筆可見日誌；沒有時回傳 null（UI 隱藏氣泡）。 */
export function journalPeekBubble(state: Readonly<JournalState>, generalUid: string, nowIso: string): JournalPeekBubble | null {
    const latest = visibleEntriesOf(state, generalUid)[0];
    if (!latest) return null;
    const timeLabel = journalTimeLabel(latest.timestamp, nowIso);
    return {
        entryId: latest.entryId,
        timeLabel,
        text: timeLabel ? `${timeLabel}：${latest.summary}` : latest.summary,
    };
}

/** 完整生平實錄：全部可見日誌，時間由舊到新。 */
export function lifeRecordRows(state: Readonly<JournalState>, generalUid: string): LifeRecordRow[] {
    return visibleEntriesOf(state, generalUid)
        .reverse()
        .map((e) => ({ entryId: e.entryId, timestamp: e.timestamp, category: e.category, summary: e.summary }));
}
