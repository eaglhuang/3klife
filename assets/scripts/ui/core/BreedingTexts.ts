/**
 * 結緣畫面文案（PROG-2-0526）。純邏輯，不依賴 cc。
 *
 * 規格：結緣系統（配種）.md §H；語系來源：resources/i18n/{locale}.json 的 ui.breed.*。
 * Unity 對照：像 LocalizedString 的預設值（fallback），語系表還沒載入時仍顯示正確的中文。
 */

/** 文案查詢：key + 依序代入的參數（{0}、{1}…）；key 不存在時回傳 key 本身 */
export type BreedTextLookup = (key: string, ...args: string[]) => string;

/** zh-TW 預設文案；與 resources/i18n/zh-TW.json 的 ui.breed.* 同步（測試會比對） */
export const BREED_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.breed.confirm': '消耗 {0} 精力 {1} 與 {2} 精力 {3}，確認結緣？',
    'ui.breed.preg_status': '{0} 已進入待產期，預計 {1} 季後誕下子嗣',
    'ui.breed.child_born': '恭喜主公！{0} 與 {1} 喜獲 {2}！',
    'ui.breed.unveil_5': '天命開獎！{0} 五維資質揭曉：',
    'ui.breed.daqi': '名士嘆：此子潛龍在淵，天機不可洩漏。',
    'ui.breed.ep_display': '預估爆發力：{0}（{1}）',
};

/**
 * 單次掃描代入 {n}。用 replace 的回呼一次完成，代入的文字不會再被當成佔位符（例如武將名含 "{1}"）。
 * 缺少的參數保留原樣。
 */
export function fillBreedText(template: string, args: readonly string[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] ?? match);
}

/** 未注入語系表時使用的預設查詢 */
export function fallbackBreedText(key: string, ...args: string[]): string {
    const template = BREED_TEXT_FALLBACK_ZH_TW[key];
    return template === undefined ? key : fillBreedText(template, args);
}
