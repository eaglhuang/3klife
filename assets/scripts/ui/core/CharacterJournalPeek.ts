// @spec-source → 武將人物介面規格補遺_2026-04-14 (doc_ui_0014) §3 武將動態日誌氣泡；WBS HUM-06（PROG-2-2075）
/**
 * CharacterJournalPeek — 人物頁日誌氣泡的文字（純邏輯，不依賴 cc）。
 *
 * 取該武將最新一筆可見日誌（GeneralJournalPeek.lifeRecordRows 的最後一筆），組成「[時間]：[動作描述]」。
 * 時間沿用日誌抽屜的「年＋季」（formatJournalSeason）：日誌時間戳是遊戲季，不是真實日期，
 * 所以不用 journalTimeLabel 的「今日／昨晚」。太長時截斷加「…」，完整內容點氣泡開日誌看。
 */
import type { JournalState } from '../../core/systems/JournalLog';
import { lifeRecordRows } from '../../core/systems/GeneralJournalPeek';
import { formatJournalSeason } from './GeneralJournalController';

/** 氣泡最多顯示的動作描述字數（暫定，配合氣泡寬度） */
export const JOURNAL_PEEK_MAX_CHARS = 22;

export function characterJournalPeekText(state: Readonly<JournalState>, generalUid: string): string | null {
    const rows = lifeRecordRows(state, generalUid);
    const latest = rows[rows.length - 1];
    if (!latest) return null;
    const chars = Array.from(latest.summary);
    const summary = chars.length > JOURNAL_PEEK_MAX_CHARS ? `${chars.slice(0, JOURNAL_PEEK_MAX_CHARS).join('')}…` : latest.summary;
    return `${formatJournalSeason(latest.timestamp)}：${summary}`;
}
