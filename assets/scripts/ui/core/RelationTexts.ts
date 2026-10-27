// @spec-source → 家族關係（史實相性）系統-shards/fj.md §G 劇本相關、§H 字串內容相關；WBS KIN-12（PROG-2-1143）
/**
 * RelationTexts — 相性關係的劇本與標籤字串（純邏輯，不依賴 cc）
 *
 * 只組文字：關係類型標籤（UI_REL_*）、相性提示（UI_AFFINITY_*）、劇本台詞（LORE_REL_*）。
 * 語系表沒有這些 key 時（i18n.t 回傳 key 本身）改用 zh-TW 預設，與 SpiritCardDetailTexts 同一做法。
 *
 * 暫定：
 *   - 劇本台詞的預設值取規格 §G 的示例（周瑜與小喬等），正式每對武將的台詞待企劃補。
 *   - 四語 JSON 尚未寫入，待 i18n 補齊後由語系表覆蓋。
 *   - 參數順序以下方註解為準（{0}、{1}…），呼叫端照順序傳入。
 *
 * Unity 對照：像一張 Localization Table，找不到 key 時退回 Inspector 裡填的預設字串。
 */
import type { HistoricalRelationType } from '../../core/systems/KinRelation';

export type RelationTextLookup = (key: string, ...args: string[]) => string;

export const RELATION_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    // 關係類型標籤（無參數）
    'UI_REL_COUPLE': '史實夫妻',
    'UI_REL_SWORN': '義兄弟',
    'UI_REL_RIVAL': '宿敵',
    'UI_REL_MASTER': '師徒',
    'UI_REL_LORD': '主從',
    'UI_REL_COMRADE': '戰友',
    // 相性提示
    'UI_AFFINITY_HIGH': '相性極佳——天作之合！',
    'UI_AFFINITY_LOW': '相性不和——宿敵之血恐生波瀾',
    // {0}=TagName {1}=Count
    'UI_RESONANCE_TRIGGER': '血脈共鳴觸發！{0} 共享 {1} 人',
    // {0}=FamilyName {1}=TraitName
    'UI_FAMILY_TRADITION': '【家風傳承】{0} 家：{1}',
    // 劇本台詞（§G）
    'LORE_REL_EVENT_FAMOUS_MATCH': '周瑜與小喬，天作之合！爆發力大幅提升！',
    'LORE_REL_EVENT_BLOOD_RESONANCE': '趙雲的後代與馬雲騄的後裔——白馬義從的血脈再度覺醒！',
    'LORE_REL_EVENT_RIVAL_BREED': '諸葛亮與司馬懿的血脈交融？天意難測……',
    'LORE_REL_EVENT_SWORN_COMBO': '桃園結義之魂，於此刻甦醒！',
    'LORE_REL_EVENT_COLLECTION_COMPLETE': '五虎上將齊聚——蜀漢之榮光重現！',
    // {0}=FamilyName
    'LORE_REL_EVENT_FAMILY_TRADITION': '三代忠義傳承，{0}家風已成！',
};

/** 關係類型 → 標籤 key（型別是 Record，新增類型時編譯會報錯提醒補上） */
export const RELATION_TYPE_LABEL_KEY: Readonly<Record<HistoricalRelationType, string>> = {
    COUPLE: 'UI_REL_COUPLE',
    SWORN: 'UI_REL_SWORN',
    MASTER_STUDENT: 'UI_REL_MASTER',
    RIVAL: 'UI_REL_RIVAL',
    LORD_VASSAL: 'UI_REL_LORD',
};

function fillTemplate(template: string, args: readonly string[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] ?? match);
}

/** 語系表未載入時改用 zh-TW 預設；沒有預設的 key 原樣回傳 */
export function fallbackRelationText(key: string, ...args: string[]): string {
    const template = RELATION_TEXT_FALLBACK_ZH_TW[key];
    return template === undefined ? key : fillTemplate(template, args);
}

/** 包一層：lookup 找不到（回傳 key 本身）時退回 zh-TW 預設 */
export function withRelationFallback(lookup: RelationTextLookup): RelationTextLookup {
    return (key, ...args) => {
        const localized = lookup(key, ...args);
        return localized === key ? fallbackRelationText(key, ...args) : localized;
    };
}

/** 史實關係類型的顯示標籤，例如 COUPLE → 史實夫妻 */
export function relationTypeLabel(
    type: HistoricalRelationType,
    lookup: RelationTextLookup = fallbackRelationText,
): string {
    return lookup(RELATION_TYPE_LABEL_KEY[type]);
}

/** 劇本台詞：傳入 LORE_REL_* key（RelationEvents 的 loreKey） */
export function relationLoreText(
    loreKey: string,
    args: readonly string[] = [],
    lookup: RelationTextLookup = fallbackRelationText,
): string {
    return lookup(loreKey, ...args);
}
