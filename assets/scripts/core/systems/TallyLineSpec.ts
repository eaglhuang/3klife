// @spec-source → 兵種（虎符）系統.md (doc_spec_0012) §G 劇本、§H 字串；PROG-2-1987（TRP-19 呼叫端改讀 Key）
/**
 * TallyLineSpec — 虎符劇本句的 i18n Key＋參數（純邏輯，不依賴 cc，不 import ui）
 *
 * core 只產出 { key, args }；顯示端用 i18n.t(key, ...args) 組字。
 * 查不到 Key（t 回傳 key 本身、或未載入語系）時，退回下方繁中模板，與 zh-TW.json 同文。
 *
 * Unity 對照：LocalizedString 帶 Arguments，表格缺條目時用預設文字。
 */

export interface TallyLine {
    key: string;
    args: string[];
}

export type TallyTranslate = (key: string, ...args: string[]) => string;

/** 保底繁中模板（與 assets/resources/i18n/zh-TW.json 同文，測試鎖住） */
const ZH_TW_FALLBACK: Readonly<Record<string, string>> = {
    SCRIPT_TALLY_PRODUCED: '{0} 殞落沙場後留下了【虎符：{1}】，精銳永存！',
    SCRIPT_SPIRIT_CARD_PRODUCED: '{0} 英魂不散，留下了【英靈卡：{0}】，已收入世家陳列室。',
    SCRIPT_SPIRIT_CARD_MERGED: '{0} 的英靈再度歸來，【英靈卡：{0}】的血脈積分累加了。',
    SCRIPT_TALLY_EQUIP: '{0} 裝備了【{1}】，現可指揮 {2}！',
    SCRIPT_TALLY_UNEQUIP: '{0} 卸下了【{1}】。',
    SCRIPT_TALLY_STAR_UP: '【{0}】升至 {1}★！{2} 戰力大幅提升！',
    SCRIPT_TALLY_LOYALTY_DROP: '{0} 對被拔除虎符一事感到不滿，忠誠度下降。',
    SCRIPT_TALLY_BAI_MA: '白馬如雪、銀槍似霜——白馬義從，天下無敵！',
    SCRIPT_TALLY_XIAN_ZHEN: '陷陣之志，有死無生——高順的鐵軍重現人間！',
};

function fill(template: string, args: readonly string[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] ?? match);
}

/** 用 translate 組字；沒給 translate 或查不到 Key 時用繁中保底 */
export function formatTallyLine(line: TallyLine, translate?: TallyTranslate): string {
    const translated = translate?.(line.key, ...line.args);
    if (translated && translated !== line.key) return translated;
    const template = ZH_TW_FALLBACK[line.key];
    return template ? fill(template, line.args) : line.key;
}
