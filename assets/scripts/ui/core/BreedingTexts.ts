// @spec-source → 結緣系統（配種）.md (doc_spec_0028)；PROG-2-1429 依建檔紀錄補標出處
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
    'ui.breed.fresh_blood': '寒門新血 V{0}（前 6 季修業 +{1}%）',
    'ui.breed.epithet.civil_martial': '文武並濟',
    'ui.breed.epithet.foes_to_allies': '化干戈為玉帛',
    'ui.breed.epithet.twin_stars': '雙星輝映',
    'ui.breed.epithet.summary.civil_martial': '初始 TP +{0}',
    'ui.breed.epithet.summary.foes_to_allies': '相性 +{0}',
    'ui.breed.epithet.summary.twin_stars': '覺醒率 +{0}%',
    'ui.breed.birth.fresh_blood': '寒門新血 V{0}！外家奇才注活血脈，子嗣前 {1} 季修業效率 +{2}%！',
    'ui.breed.birth.epithet': '佳話聯姻【{0}】！{1}',
    'ui.breed.tradition_seed': '郡望宗脈顯靈！子嗣保底承襲家族特質【{0}】{1}★！',
    'ui.breed.high_clan_proposal': '天下高門求親：保底 EP≥{0}｜≥{1}★家學｜相性+{2}｜聘禮+{3}%',
    'ui.breed.preg_status': '{0} 需調養待產 {1} 季（期間精力凍結、不能再結緣）；襁褓幼子已入宗族名冊',
    'ui.breed.child_born': '恭喜主公！{0} 與 {1} 喜獲 {2}！',
    'ui.breed.unveil_5': '天命開獎！{0} 五維資質揭曉：',
    'ui.breed.daqi': '名士嘆：此子潛龍在淵，天機不可洩漏。',
    'ui.breed.ep_display': '預估爆發力：{0}（{1}）',
    'ui.breed.no_mother_hint': '目前沒有可結緣的女將～ 前往【紅顏天香】延攬新夥伴吧！',
    'ui.breed.no_father_hint': '目前還沒有年滿 {0} 歲的男將～ 先推進幾季讓少主長大吧！',
    'ui.breed.preg_wait_hint': '{0}（母方待產中），還要 {1} 季才能再結緣～ 可先到【紅顏天香】再延攬新紅顏！',
    'ui.breed.go_beauty_gacha': '前往【紅顏天香】延攬',
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

/**
 * 包一層語系查詢：語系表未載入時 i18n.t 會回傳 key 本身，這時改用 zh-TW 預設文案，避免畫面出現原始 key。
 */
export function withBreedFallback(lookup: BreedTextLookup): BreedTextLookup {
    return (key, ...args) => {
        const localized = lookup(key, ...args);
        return localized === key ? fallbackBreedText(key, ...args) : localized;
    };
}
