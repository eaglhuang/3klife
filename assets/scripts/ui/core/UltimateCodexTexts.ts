// @spec-source → 奧義系統.md §E #7/#8（重複解鎖升 Lv、圖鑑列出已解鎖）；WBS ULT-16（PROG-2-1251 文字層）
/**
 * UltimateCodexTexts — 奧義圖鑑的列表文字（純邏輯，不依賴 cc）
 *
 * 把 buildUltimateCodex 的結果轉成畫面可直接寫進 Label 的文字列；
 * 列表最多 ULTIMATE_CODEX_MAX_ROWS 列，其餘用「另有 N 項」。
 * 語系表沒有 key 時（i18n.t 回傳 key 本身）改用 zh-TW 預設，與 SpiritCodexController 同一做法。
 *
 * 暫定：
 *   - 列內顯示奧義 id 與等級，正式奧義名稱待奧義資料表的名稱欄位。
 *
 * Unity 對照：Presenter。Label 只負責顯示，列表內容在這裡組好。
 */
import type { UltimateCodexRow } from '../../core/systems/UltimateUpgrade';

/** 圖鑑最多顯示的列數（版面高度限制） */
export const ULTIMATE_CODEX_MAX_ROWS = 8;

/** 與 resources/i18n/zh-TW.json 的 ui.ultimate_codex.* 同步（測試會比對） */
export const ULTIMATE_CODEX_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.ultimate_codex.title': '奧義圖鑑',
    'ui.ultimate_codex.count': '已解鎖奧義 {0} 項',
    'ui.ultimate_codex.row': '{0}・{1}　Lv{2}',
    'ui.ultimate_codex.empty': '尚未解鎖任何奧義。',
    'ui.ultimate_codex.more': '另有 {0} 項未列出',
    'ui.ultimate_codex.close': '關閉',
};

export type UltimateCodexTextLookup = (key: string, ...args: string[]) => string;

function fillUltimateCodexText(template: string, args: readonly string[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] ?? match);
}

export function fallbackUltimateCodexText(key: string, ...args: string[]): string {
    const template = ULTIMATE_CODEX_TEXT_FALLBACK_ZH_TW[key];
    return template === undefined ? key : fillUltimateCodexText(template, args);
}

/** 語系表未載入時 i18n.t 會回傳 key 本身，這時改用 zh-TW 預設 */
export function withUltimateCodexFallback(lookup: UltimateCodexTextLookup): UltimateCodexTextLookup {
    return (key, ...args) => {
        const localized = lookup(key, ...args);
        return localized === key ? fallbackUltimateCodexText(key, ...args) : localized;
    };
}

export interface UltimateCodexView {
    title: string;
    count: string;
    /** 空圖鑑時為提示文字，否則為列文字 */
    lines: string[];
    more: string | null;
}

/** 組出圖鑑畫面的文字；rows 已是 buildUltimateCodex 的結果（只含已解鎖） */
export function buildUltimateCodexView(
    rows: readonly UltimateCodexRow[],
    lookup: UltimateCodexTextLookup = fallbackUltimateCodexText,
): UltimateCodexView {
    const shown = rows.slice(0, ULTIMATE_CODEX_MAX_ROWS);
    const hidden = rows.length - shown.length;
    return {
        title: lookup('ui.ultimate_codex.title'),
        count: lookup('ui.ultimate_codex.count', String(rows.length)),
        lines: rows.length === 0
            ? [lookup('ui.ultimate_codex.empty')]
            : shown.map((row) => lookup('ui.ultimate_codex.row', row.generalId, row.ultimateId, String(row.level))),
        more: hidden > 0 ? lookup('ui.ultimate_codex.more', String(hidden)) : null,
    };
}

/**
 * 畫面 Label 用的文字表：key 等於 ultimate-codex-main.json 的節點 id（與 buildSpiritCodexTexts 同一做法）。
 * 列文字以換行串成一個 Label。
 */
export function buildUltimateCodexTexts(
    rows: readonly UltimateCodexRow[],
    lookup: UltimateCodexTextLookup = fallbackUltimateCodexText,
): Record<string, string> {
    const view = buildUltimateCodexView(rows, lookup);
    return {
        ultimateCodexTitle: view.title,
        ultimateCodexCount: view.count,
        ultimateCodexList: view.lines.join('\n'),
        ultimateCodexMore: view.more ?? '',
        closeUltimateCodexLabel: lookup('ui.ultimate_codex.close'),
    };
}
