// @spec-source → 同名武將系統.md §G 劇本相關、§H 字串內容相關；WBS SAME-10（PROG-2-1144）
/**
 * SameNameTexts — 同名武將的劇本與字串（純邏輯，不依賴 cc）
 *
 * 只組文字：多版本初見、戰魂寄宿、血脈歸宗、名號衝突的台詞，以及版本標籤、收集進度、
 * 同名拒絕、復生重練與血脈灌注的按鈕字。語系表缺 key 時退回 zh-TW 預設，與 RelationTexts 同一做法。
 *
 * 暫定：
 *   - 預設值取規格示例；名號衝突台詞的示例是趙雲，這裡用 {0} 代入武將名。
 *   - 四語 JSON 尚未寫入，待 i18n 補齊後由語系表覆蓋。
 *   - 參數順序以下方註解為準（{0}、{1}…），呼叫端照順序傳入。
 *
 * Unity 對照：和 RelationTexts 同樣是一張 Localization Table，找不到譯文時退回 Inspector 的預設字串。
 */
export type SameNameTextLookup = (key: string, ...args: string[]) => string;

export const SAME_NAME_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    // 劇本台詞（§G）
    'LORE_SAME_FIRST_MEET': '此趙雲與你所熟識的那位…似乎有些不同。',
    // {0}=DeadName {1}=TargetName
    'LORE_SAME_SOUL_MERGE': '{0} 的戰魂融入 {1}——兩世為一！',
    // {0}=V1 {1}=V2 {2}=GeneName
    'LORE_SAME_BLOODLINE_MERGE': '血脈歸一，{0} 繼承了 {1} 的 {2}！',
    // {0}=GeneralName
    'LORE_SAME_NAME_CONFLICT': '陣中已有{0}，不可再添同名之將！',
    // 字串內容（§H）
    // {0}=GeneralName {1}=VersionTitle
    'UI_VERSION_TAG': '{0}・{1}',
    // {0}=Bloodline_ID
    'UI_SAME_NAME_REJECT': '隊伍中已有同名武將（{0}），無法編入！',
    // {0}=DeadName {1}=TargetName {2}=Amount
    'UI_SOUL_MERGE': '{0} 的戰魂寄宿於 {1}！TP +{2}',
    // {0}=Gene
    'UI_BLOODLINE_MERGE': '血脈歸宗完成！{0} 已轉移。',
    // {0}=GeneralName {1}=Owned {2}=Total
    'UI_COLLECTION': '{0} 收集進度：{1}/{2} 版本',
    'UI_DUPLICATE_CHOICE': '再遇故人。要讓他復生，還是讓英靈更完整？',
    'UI_REVIVE_RETRAIN': '復生重練',
    'UI_BLOODLINE_INFUSION': '血脈灌注',
};

function fillTemplate(template: string, args: readonly string[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] ?? match);
}

/** 語系表未載入時改用 zh-TW 預設；沒有預設的 key 原樣回傳 */
export function fallbackSameNameText(key: string, ...args: string[]): string {
    const template = SAME_NAME_TEXT_FALLBACK_ZH_TW[key];
    return template === undefined ? key : fillTemplate(template, args);
}

/** 包一層：lookup 找不到（回傳 key 本身）時退回 zh-TW 預設 */
export function withSameNameFallback(lookup: SameNameTextLookup): SameNameTextLookup {
    return (key, ...args) => {
        const localized = lookup(key, ...args);
        return localized === key ? fallbackSameNameText(key, ...args) : localized;
    };
}

/** 同名劇本台詞：傳入 LORE_SAME_* key */
export function sameNameLoreText(
    loreKey: string,
    args: readonly string[] = [],
    lookup: SameNameTextLookup = fallbackSameNameText,
): string {
    return lookup(loreKey, ...args);
}
