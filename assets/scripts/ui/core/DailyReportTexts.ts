// @spec-source → 留存系統.md §H（UI_DAILY_NEWS_TITLE）、三國日報（PROG-2-1170／1173）；PROG-2-1446（RET-06）
/**
 * DailyReportTexts — 登入面板（三國日報與晨報）的文字查表（UI 層，純邏輯，不依賴 cc）。
 *
 * - 查表順序：i18n 有譯文就用譯文；缺 key 或譯文為空時退回 zh-TW 預設。
 * - 預設值的 {0} 等佔位符由呼叫端給的參數填入。
 * - 事件內文（復仇、代勞、切磋等）仍由核心 DailyNewsEngine 組成 zh-TW 句子，本模組不處理。
 *
 * Unity 對照：與 JournalTexts 相同的 Localization fallback，只是多了位置參數。
 */

export type DailyReportTextLookup = (key: string, ...args: string[]) => string;

/** 面板 chrome 的 zh-TW 預設（UI_DAILY_NEWS_TITLE 來自留存系統 §H，其餘為暫定） */
export const DAILY_REPORT_FALLBACK_ZH_TW = {
    UI_DAILY_NEWS_TITLE: '三國日報 —— {0}',
    UI_DAILY_REPORT_NEWS_HEADER: '三國日報',
    UI_DAILY_REPORT_MORNING_TITLE: '晨報',
    UI_DAILY_REPORT_OPEN_HUB: '晨報派遣板 ▶',
    UI_DAILY_REPORT_REVENGE: '復仇取回 ▶',
    UI_DAILY_REPORT_CLOSE: '知道了',
} as const;

export type DailyReportTextKey = keyof typeof DAILY_REPORT_FALLBACK_ZH_TW;

/** 依序把 {0}、{1} 換成參數；參數不足時保留原佔位符 */
function fill(template: string, args: readonly string[]): string {
    return args.reduce((text, arg, i) => text.split(`{${i}}`).join(arg), template);
}

/** 取一段面板文字；有 lookup 且譯文非空、不等於 key 時用譯文，否則用 zh-TW 預設。 */
export function dailyReportText(lookup: DailyReportTextLookup | undefined, key: DailyReportTextKey, ...args: string[]): string {
    const fallback = fill(DAILY_REPORT_FALLBACK_ZH_TW[key], args);
    if (!lookup) return fallback;
    const localized = lookup(key, ...args);
    return localized === key || localized === '' ? fallback : localized;
}

/** 日報標題的日期部分：YYYY-MM-DD（與核心 dailyNewsTitle 的日期格式一致） */
export function dailyReportDateText(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
