// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §H 字串內容；PROG-2-1445（JRN-07 UI 接線）
/**
 * JournalTexts — 日誌與晨報畫面的文字查表（UI 層，純邏輯，不依賴 cc）。
 *
 * - 查表順序：i18n 有值就用語系譯文；查不到（語系表未載入或缺 key）退回 zh-TW 預設。
 * - 預設值照規格 §H 的字面文字，不含規格表的引號記號。
 *
 * Unity 對照：像 Localization 的 fallback font／string，表缺就退回基礎語系。
 */

export type JournalTextLookup = (key: string, ...args: string[]) => string;

/** §H 的 zh-TW 預設（與 zh-TW.json 的同名 key 一致） */
export const JOURNAL_TEXT_FALLBACK_ZH_TW = {
    UI_JOURNAL_TITLE: '武將日誌',
    UI_MORNING_REPORT_TITLE: '晨報摘要',
    UI_DISPATCH_BOARD_TITLE: '派遣整備',
    UI_JOURNAL_EMPTY: '近日尚無值得記錄之事。',
    UI_MORNING_REPORT_EMPTY: '昨夜風平浪靜，暫無要事。',
} as const;

export type JournalTextKey = keyof typeof JOURNAL_TEXT_FALLBACK_ZH_TW;

/** 可在畫面換成譯文的一句日誌（PROG-2-1448）：summary 是 zh-TW 原文，summaryKey＋summaryArgs 是查表用的 key 與參數。 */
export interface JournalSummaryLike {
    summary: string;
    summaryKey?: string;
    summaryArgs?: readonly string[];
}

/**
 * 取一句日誌的畫面文字：有 summaryKey 且譯文非空、不等於 key 時用譯文（參數照傳），否則退回 summary。
 * 退回 summary 讓舊存檔與缺譯文的語系仍顯示 zh-TW 原句。
 */
export function journalSummaryText(lookup: JournalTextLookup | undefined, item: Readonly<JournalSummaryLike>): string {
    if (!lookup || !item.summaryKey) return item.summary;
    const localized = lookup(item.summaryKey, ...(item.summaryArgs ?? []));
    return localized === item.summaryKey || localized === '' ? item.summary : localized;
}

/** 取一段日誌畫面文字：有 lookup 且譯文不等於 key 時用譯文，否則用 zh-TW 預設。 */
export function journalText(lookup: JournalTextLookup | undefined, key: JournalTextKey): string {
    const fallback = JOURNAL_TEXT_FALLBACK_ZH_TW[key];
    if (!lookup) return fallback;
    const localized = lookup(key);
    return localized === key || localized === '' ? fallback : localized;
}
