/**
 * 精力劇本文案（PROG-2-0729，承接 VIT-09 / PROG-2-0728）。純邏輯，不依賴 cc。
 * 代入與 BreedingTexts 共用 fillBreedText。
 *
 * 規格：資源循環系統.md §G（劇本相關）；語系來源：resources/i18n/{locale}.json 的 ui.vit.script.*。
 * Unity 對照：同 BreedingTexts，像 LocalizedString 的預設值，語系表還沒載入時仍顯示正確的中文。
 */
import { BreedTextLookup, fillBreedText } from './BreedingTexts';

/** 精力劇本的四個情境 key */
export const VITALITY_SCRIPT_KEYS = {
    exhausted: 'ui.vit.script.exhausted',
    pillUsed: 'ui.vit.script.pill_used',
    pregnancyLock: 'ui.vit.script.pregnancy_lock',
    lateBloomerHint: 'ui.vit.script.hint_late_bloomer',
} as const;

/** zh-TW 預設文案；與 resources/i18n/zh-TW.json 的 ui.vit.script.* 同步（測試會比對） */
export const VITALITY_SCRIPT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    [VITALITY_SCRIPT_KEYS.exhausted]: '{0} 已精疲力竭，暫無法行動。',
    [VITALITY_SCRIPT_KEYS.pillUsed]: '{0} 服下補元散，精力恢復！',
    [VITALITY_SCRIPT_KEYS.pregnancyLock]: '{0} 正在待產中，精力回復暫停…',
    [VITALITY_SCRIPT_KEYS.lateBloomerHint]: '{0} 雖然虛弱，但眼中似有異光…',
};

/** 未注入語系表時使用的預設查詢：key 不在表內時回傳 key 本身 */
export function fallbackVitalityScriptText(key: string, name: string): string {
    const template = VITALITY_SCRIPT_FALLBACK_ZH_TW[key];
    return template === undefined ? key : fillBreedText(template, [name]);
}

/** 精力劇本文案查詢：語系表查回 key 本身（尚未載入或缺 key）時改用 zh-TW 預設 */
export function vitalityScriptText(lookup: BreedTextLookup, key: string, name: string): string {
    const localized = lookup(key, name);
    return localized === key ? fallbackVitalityScriptText(key, name) : localized;
}
