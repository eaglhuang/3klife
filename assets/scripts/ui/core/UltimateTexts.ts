// @spec-source → 武將人物介面規格書.md §6.6（五階血脈傳承奧義）；PROG-2-0743（文案搬進語系表）
/**
 * UltimateTexts — 五階血脈傳承奧義操作區與摘要的文案（純邏輯，不依賴 cc）
 *
 * 文案以語系 key 取得；語系表沒有 key（回傳 key 本身）時退回 zh-TW 預設，避免畫面出現原始 key。
 * 文字裡的 {0}、{1}… 依序替換成參數。
 *
 * Unity 對照：像 LocalizedString 加上預設值，同 HiddenFactorText 的模式。
 */

/** zh-TW 預設；與 resources/i18n/zh-TW.json 的 ui.general.ultimate.* 同步（測試會比對） */
export const ULTIMATE_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.general.ultimate.head': '血脈傳承奧義：已點亮 {0} / {1} 階（上限 {2}）',
    'ui.general.ultimate.summary': '{0}，{1}',
    'ui.general.ultimate.next_ready': '下一階可點亮',
    'ui.general.ultimate.next.cap_locked': '需先升星提高上限',
    'ui.general.ultimate.next.already_max': '已全部點亮',
    'ui.general.ultimate.next.fame_short': '名聲不足',
    'ui.general.ultimate.next.incident_short': '事蹟不足',
    'ui.general.ultimate.next.epic_required': '需要一次史詩事蹟',
    'ui.general.ultimate.awaken_label': '點亮第 {0} 階',
    'ui.general.ultimate.awaken_blocked': '條件未達成',
    'ui.general.ultimate.raise_locked': '升星提高上限（來源待裁決，暫未開放）',
};

export type UltimateTextLookup = (key: string) => string;

/** 取文案並替換 {n} 參數；lookup 回傳 key 本身時改用 zh-TW 預設 */
export function ultimateText(lookup: UltimateTextLookup, key: string, ...args: (string | number)[]): string {
    const localized = lookup(key);
    const template = localized === key ? (ULTIMATE_FALLBACK_ZH_TW[key] ?? key) : localized;
    return template.replace(/\{(\d+)\}/g, (match, index: string) => {
        const value = args[Number(index)];
        return value === undefined ? match : String(value);
    });
}
