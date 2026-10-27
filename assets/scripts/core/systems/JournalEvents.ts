// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §A-1、§E-1（重大戰果、派遣、互動與成長寫入時間軸）；PROG-2-1175
/**
 * JournalEvents — 遊戲事件轉成武將日誌條目（純邏輯，不依賴 cc）。
 *
 * - 類別、重要度、摘要模板集中在 JOURNAL_EVENT_RULES 表；規格未給數值與句庫，皆為暫定。
 * - 條目 ID 由呼叫端給序號（日誌只增不刪，用目前條目數 +1 即不重複）。
 * - 武將名缺漏時以「無名將」代替，摘要不留空。
 *
 * Unity 對照：像把 Gameplay Event 映射成 Timeline Log 項目的 ScriptableObject 對照表。
 */

import type { JournalCategory, JournalEntryInput } from './JournalLog';

export type JournalEventKind = 'BATTLE_WIN' | 'BATTLE_LOSE' | 'DISPATCH_SUCCESS' | 'DISPATCH_FAIL' | 'GENERAL_BORN' | 'GENERAL_RETIRE';

export interface JournalEventRule {
    category: JournalCategory;
    /** 0~100，晨報依此排序（暫定） */
    priority: number;
    /** {names} 以「、」串接相關武將名 */
    template: string;
}

/** 暫定：規格未列重要度與文案 */
export const JOURNAL_EVENT_RULES: Readonly<Record<JournalEventKind, JournalEventRule>> = {
    BATTLE_WIN: { category: 'BATTLE', priority: 70, template: '{names}出戰告捷。' },
    BATTLE_LOSE: { category: 'BATTLE', priority: 65, template: '{names}出戰失利，敗退而歸。' },
    DISPATCH_SUCCESS: { category: 'DISPATCH', priority: 55, template: '{names}完成大廳任務。' },
    DISPATCH_FAIL: { category: 'DISPATCH', priority: 45, template: '{names}執行大廳任務未果。' },
    GENERAL_BORN: { category: 'GROWTH', priority: 75, template: '{names}喜得子嗣。' },
    GENERAL_RETIRE: { category: 'GROWTH', priority: 60, template: '{names}解甲歸田，轉任教官。' },
};

export const JOURNAL_UNKNOWN_NAME = '無名將';

export interface JournalEventSubject {
    uid: string;
    name: string | undefined;
}

/** 依事件種類產生日誌條目；沒有相關武將時回傳 null（不寫入）。 */
export function buildJournalEvent(kind: JournalEventKind, subjects: readonly JournalEventSubject[], seq: number, timestamp: string): JournalEntryInput | null {
    if (subjects.length === 0) return null;
    const rule = JOURNAL_EVENT_RULES[kind];
    const names = subjects.map((s) => (s.name && s.name.trim() ? s.name : JOURNAL_UNKNOWN_NAME)).join('、');
    return {
        entryId: `${kind}-${seq}`,
        timestamp,
        category: rule.category,
        relatedGeneralUids: subjects.map((s) => s.uid),
        priority: rule.priority,
        summary: rule.template.replace('{names}', names),
    };
}
