// @spec-source → 武將壽命系統.md §名將保值（演武聖境）；英靈卡顯示沿用 LegacyArena 的精華快照行（PROG-2-0803 / 0804）
/**
 * SpiritCodexController — 英靈圖鑑：列出已死武將的英靈卡與精華快照（純邏輯，不依賴 cc）
 *
 * 只列 isSpiritRelic 為 true 的正式英靈卡，依歸檔時間新到舊排序；最多列 SPIRIT_CODEX_MAX_ROWS 位，其餘用「另有 N 位」。
 * 文字組合在這裡，View 只把 texts[key] 寫進 Label（key 等於 spirit-codex-main.json 的節點 id）。
 *
 * 精華快照行走 legacy.essence_line（PROG-2-0804）。
 * Unity 對照：Presenter。
 */
import type { SpiritCard } from '../../core/models/SpiritCard';
import { legacyEssenceLine } from '../../core/systems/LegacyArena';

/** 列表最多顯示的英靈卡數量（版面高度限制） */
export const SPIRIT_CODEX_MAX_ROWS = 6;

/** 英靈圖鑑靜態文字的 zh-TW 預設；與 resources/i18n/zh-TW.json 的 ui.spirit_codex.* 同步（測試會比對） */
export const SPIRIT_CODEX_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.spirit_codex.title': '英靈圖鑑',
    'ui.spirit_codex.close': '關閉',
    'ui.spirit_codex.count': '英靈 {0} 位',
    'ui.spirit_codex.empty': '尚無英靈卡。武將死後若具備英靈資格，會收錄於此。',
    'ui.spirit_codex.more': '另有 {0} 位未列出',
};

export type SpiritCodexTextLookup = (key: string, ...args: string[]) => string;

function fillSpiritCodexText(template: string, args: readonly string[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] ?? match);
}

export function fallbackSpiritCodexText(key: string, ...args: string[]): string {
    const template = SPIRIT_CODEX_TEXT_FALLBACK_ZH_TW[key];
    return template === undefined ? key : fillSpiritCodexText(template, args);
}

/** 語系表未載入時 i18n.t 會回傳 key 本身，這時改用 zh-TW 預設 */
export function withSpiritCodexFallback(lookup: SpiritCodexTextLookup): SpiritCodexTextLookup {
    return (key, ...args) => {
        const localized = lookup(key, ...args);
        return localized === key ? fallbackSpiritCodexText(key, ...args) : localized;
    };
}

/** 一列英靈卡的文字：「{名}｜{死亡年} 年｜精華快照：N」 */
export function spiritCodexRowText(card: SpiritCard, lookup?: SpiritCodexTextLookup): string {
    const year = card.deathYear ?? card.deathContext?.year;
    const yearText = typeof year === 'number' && Number.isFinite(year) ? `${year} 年` : '年份未知';
    return `${card.name}｜${yearText}｜${legacyEssenceLine(card.legacyEssence, lookup)}`;
}

/** 英靈圖鑑面板的全部文字，key 等於 spirit-codex-main.json 的節點 id */
export function buildSpiritCodexTexts(
    cards: readonly SpiritCard[],
    lookup: SpiritCodexTextLookup = fallbackSpiritCodexText,
): Record<string, string> {
    const relics = cards
        .filter((card) => card.isSpiritRelic === true)
        .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
    const shown = relics.slice(0, SPIRIT_CODEX_MAX_ROWS);
    const overflow = relics.length - shown.length;
    return {
        spiritCodexTitle: lookup('ui.spirit_codex.title'),
        spiritCodexCount: lookup('ui.spirit_codex.count', String(relics.length)),
        spiritCodexList: shown.length > 0 ? shown.map((card) => spiritCodexRowText(card, lookup)).join('\n') : lookup('ui.spirit_codex.empty'),
        spiritCodexMore: overflow > 0 ? lookup('ui.spirit_codex.more', String(overflow)) : '',
        closeSpiritCodexLabel: lookup('ui.spirit_codex.close'),
    };
}
