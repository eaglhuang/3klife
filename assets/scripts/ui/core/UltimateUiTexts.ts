// @spec-source → 奧義系統.md §H（UI_ULT_* 字串表）；WBS ULT-19（PROG-2-1295）
/**
 * UltimateUiTexts — 奧義解鎖、施放、精力、家傳等 UI 字串（純邏輯，不依賴 cc）。
 *
 * 語系鍵對應規格的 UI_ULT_*，存在 resources/i18n/{locale}.json 的 ui.ultimate.*。
 * 參數用具名佔位 {N}、{UltName}、{Cost}、{Level}、{ParentName}，與規格表一致。
 * 語系表沒有 key 時退回 zh-TW 預設，避免畫面出現原始 key。
 *
 * Unity 對照：同 UltimateTexts，像 LocalizedString 帶具名參數與預設值。
 */

/** 規格 UI_ULT_* 對應的語系鍵 */
export const ULT_UI_KEYS = {
    unlock: 'ui.ultimate.unlock',
    cast: 'ui.ultimate.cast',
    cost: 'ui.ultimate.cost',
    cooldown: 'ui.ultimate.cooldown',
    locked: 'ui.ultimate.locked',
    level: 'ui.ultimate.level',
    inherited: 'ui.ultimate.inherited',
    upgrade: 'ui.ultimate.upgrade',
} as const;

/** zh-TW 預設；與 resources/i18n/zh-TW.json 的 ui.ultimate.* 同步（測試會比對） */
export const ULT_UI_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    [ULT_UI_KEYS.unlock]: '第 {N} 奧義【{UltName}】解鎖！',
    [ULT_UI_KEYS.cast]: '發動奧義【{UltName}】',
    [ULT_UI_KEYS.cost]: '精力消耗：{Cost}%',
    [ULT_UI_KEYS.cooldown]: '每場限用 1 次',
    [ULT_UI_KEYS.locked]: '需 {N} 轉才能解鎖',
    [ULT_UI_KEYS.level]: '奧義等級：{Level}',
    [ULT_UI_KEYS.inherited]: '【家傳奧義】繼承自 {ParentName}',
    [ULT_UI_KEYS.upgrade]: '奧義【{UltName}】升級至 Lv.{Level}！',
};

export type UltimateUiParams = Readonly<Record<string, string | number>>;

/** 取文案並代入具名參數；lookup 回傳 key 本身時改用 zh-TW 預設。未給的參數保留佔位字樣。 */
export function ultimateUiText(lookup: (key: string) => string, key: string, params: UltimateUiParams = {}): string {
    const localized = lookup(key);
    const template = localized === key ? (ULT_UI_FALLBACK_ZH_TW[key] ?? key) : localized;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
        const value = params[name];
        return value === undefined ? match : String(value);
    });
}
