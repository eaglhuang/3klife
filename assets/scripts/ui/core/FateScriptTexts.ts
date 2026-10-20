/**
 * 宿命揭曉文案（PROG-2-0735，承接 FATE-11 / PROG-2-0734）。純邏輯，不依賴 cc。
 *
 * 規格：轉職與宿命系統.md §G（劇本）、§H（字串）；語系來源：resources/i18n/{locale}.json 的 ui.fate.*。
 * 規格優先於程式現狀：按鈕與天命分流文字以 §H 為準。
 */
import { BreedTextLookup, fillBreedText } from './BreedingTexts';

/** zh-TW 預設；與 resources/i18n/zh-TW.json 的 ui.fate.* 同步 */
export const FATE_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.fate.script.reveal': '天命指引：{0} 天生{1}，建議走{2}之路。',
    'ui.fate.script.defy': '主公逆天而行！{0} 的成長之路將更加艱難…',
    'ui.fate.script.job_change': '{0} 在 20 歲成人禮上，選擇了{1}作為副業。',
    'ui.fate.script.retire_weapon': '{0} 卸下兵刃，化作虎符，戰技永傳。',
    'ui.fate.script.retire_scroll': '{0} 放下竹簡，智慧化為墨香，傳承後世。',
    'ui.fate.reveal': '天命分流：{0}',
    'ui.fate.accept': '順應天命（成長率正常）',
    'ui.fate.defy': '逆天而行（成長率 -20%，有機率大器晚成）',
    'ui.fate.job_change': '消耗轉職令 ×1，追加副職能：{0}',
    'ui.fate.retire_weapon': '獲得虎符：{0}',
    'ui.fate.retire_scroll': '獲得竹簡：{0}',
};

/** 宿命文案查詢：語系表查回 key 本身（尚未載入或缺 key）時改用 zh-TW 預設並代入參數 */
export function fateText(lookup: BreedTextLookup, key: string, ...args: string[]): string {
    const localized = lookup(key, ...args);
    if (localized !== key) return localized;
    const template = FATE_TEXT_FALLBACK_ZH_TW[key];
    return template === undefined ? key : fillBreedText(template, args);
}
