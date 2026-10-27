// @spec-source → 運氣系統.md §G 劇本相關、§H 字串內容相關；WBS LUK-08（PROG-2-1252）
/**
 * LuckTexts — 運氣（LUK）的 UI 字串、天命波動顯示與劇本文案（純邏輯，不依賴 cc）
 *
 * 只組文字：隱藏提示、天命列、天命波動、天命事件，以及四段劇本台詞。
 * 語系表缺 key 時退回 zh-TW 預設，與 RelationTexts、SameNameTexts 同一做法。
 * 可見與否、數值夾限仍由 LuckVisibility 判定（LUK-01），本檔只負責把結果變成文字。
 *
 * 暫定：
 *   - 四語 JSON 尚未寫入，待 i18n 補齊後由語系表覆蓋。
 *   - 參數順序以下方註解為準（{0}、{1}…），呼叫端照順序傳入。
 *
 * Unity 對照：和 RelationTexts 一樣是一張 Localization Table，找不到譯文時退回預設字串。
 */
import { LUK_REVEAL_LEVEL } from '../../core/systems/LuckVisibility';

export type LuckTextLookup = (key: string, ...args: string[]) => string;

export const LUCK_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    // {0}=RevealLevel（Lv46）
    'UI_LUK_HIDDEN': '???（Lv{0} 解鎖）',
    // {0}=Value
    'UI_LUK_DISPLAY': '天命（LUK）：{0}',
    // {0}=Value（已含正負號的 EP 修正）
    'UI_LUK_WAVE': '天命波動：{0}（EP 修正）',
    // {0}=EventName
    'UI_LUK_EVENT': '天命之力觸發事件：{0}',
    // 劇本台詞（§G）
    // {0}=Name {1}=Amount
    'LORE_LUK_FATE_AWAKEN': '{0} 的命運之力覺醒——天命波動 +{1}！',
    'LORE_LUK_HIGH_CHILD': '此子天命不凡，星象為之異動！',
    'LORE_LUK_PHASE3_UNLOCK': '您已達到更高境界——紫色天命因子現身！',
    // {0}=Name
    'LORE_LUK_FATE_RESET': '命運重新輪轉…{0} 的天命波動已重置。',
};

function fillTemplate(template: string, args: readonly string[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] ?? match);
}

/** 語系表未載入時改用 zh-TW 預設；沒有預設的 key 原樣回傳 */
export function fallbackLuckText(key: string, ...args: string[]): string {
    const template = LUCK_TEXT_FALLBACK_ZH_TW[key];
    return template === undefined ? key : fillTemplate(template, args);
}

/** 包一層：lookup 找不到（回傳 key 本身）時退回 zh-TW 預設 */
export function withLuckFallback(lookup: LuckTextLookup): LuckTextLookup {
    return (key, ...args) => {
        const localized = lookup(key, ...args);
        return localized === key ? fallbackLuckText(key, ...args) : localized;
    };
}

/** 隱藏時的 LUK 列：「???（Lv46 解鎖）」，不洩漏數值 */
export function lukHiddenText(lookup: LuckTextLookup = fallbackLuckText): string {
    return lookup('UI_LUK_HIDDEN', String(LUK_REVEAL_LEVEL));
}

/** 顯示時的 LUK 列：「天命（LUK）：{Value}」；value 由呼叫端先經 normalizeLuk 夾限 */
export function lukValueText(value: number, lookup: LuckTextLookup = fallbackLuckText): string {
    return lookup('UI_LUK_DISPLAY', String(value));
}

/** 天命波動列；waveText 由呼叫端格式化（含正負號） */
export function lukWaveText(waveText: string, lookup: LuckTextLookup = fallbackLuckText): string {
    return lookup('UI_LUK_WAVE', waveText);
}

/** 天命之力觸發事件列 */
export function lukEventText(eventName: string, lookup: LuckTextLookup = fallbackLuckText): string {
    return lookup('UI_LUK_EVENT', eventName);
}

/** 劇本台詞：傳入 LORE_LUK_* key 與參數 */
export function lukLoreText(
    loreKey: string,
    args: readonly string[] = [],
    lookup: LuckTextLookup = fallbackLuckText,
): string {
    return lookup(loreKey, ...args);
}
