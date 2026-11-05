// @spec-source → 血統傳承G1初代開局_直覺相馬與開蒙修業規格書.md (doc_spec_0182) §E #1、§F-2、§H UI_G1_MATCH_PREVIEW；PROG-2-1792
/**
 * MatchRumor — 說親風聞：把五維換成古風評語，不露數字（純邏輯，不依賴 cc）
 *
 * 區間與評語照 §F-2。規格只舉例「武骨」「才思」，統御、治才、風儀三個稱呼是暫定。
 *
 * Unity 對照：像把數值區間映射成顯示字串的 ScriptableObject 查表。
 */
import { surnameOf } from './VirtualAncestorGenerator';

export type RumorStatKey = 'str' | 'int' | 'lea' | 'pol' | 'cha';
export type RumorStats = Partial<Record<RumorStatKey, number>>;

/** 依序比對，也是最高單項同分時的優先順序 */
const RUMOR_STATS: ReadonlyArray<readonly [RumorStatKey, string]> = Object.freeze([
    ['str', '武骨'], ['int', '才思'], ['lea', '統御'], ['pol', '治才'], ['cha', '風儀'],
]);

const TOTAL_TIERS: ReadonlyArray<readonly [number, string]> = Object.freeze([
    [440, '天縱奇才'], [390, '國士之風'], [330, '一時俊彥'], [250, '良家子弟'],
]);
const TOTAL_LOWEST = '凡俗之姿';

const SINGLE_TIERS: ReadonlyArray<readonly [number, string]> = Object.freeze([
    [95, '曠世無雙'], [85, '絕倫'], [70, '出眾'], [50, '幹練'],
]);
const SINGLE_LOWEST = '平庸';

function tierOf(value: number, tiers: ReadonlyArray<readonly [number, string]>, lowest: string): string {
    return tiers.find(([min]) => value >= min)?.[1] ?? lowest;
}

/** 400 箱：五維總和評語 */
export function rumorTotalTitle(stats: RumorStats): string {
    return tierOf(RUMOR_STATS.reduce((sum, [key]) => sum + (stats[key] ?? 0), 0), TOTAL_TIERS, TOTAL_LOWEST);
}

/** 最高單項傾向，例如「才思出眾」 */
export function rumorTopTrait(stats: RumorStats): string {
    let top = RUMOR_STATS[0];
    for (const entry of RUMOR_STATS) {
        if ((stats[entry[0]] ?? 0) > (stats[top[0]] ?? 0)) top = entry;
    }
    return `${top[1]}${tierOf(stats[top[0]] ?? 0, SINGLE_TIERS, SINGLE_LOWEST)}`;
}

/** surnameOf 對空白名字的佔位，不算同姓 */
const UNKNOWN_SURNAME = '某';

/** G4 §F-2 Layer 1：同宗同姓的公開句；不同姓或姓氏不明時回傳 null */
export function sameSurnameNote(fatherName: string, motherName: string): string | null {
    const surname = surnameOf(fatherName);
    return surname !== UNKNOWN_SURNAME && surname === surnameOf(motherName) ? `同宗同姓：皆為${surname}氏` : null;
}

/** UI_G1_MATCH_PREVIEW */
export function matchRumorLine(stats: RumorStats): string {
    return `鄉評風聞：${rumorTotalTitle(stats)}｜顯著家風：${rumorTopTrait(stats)}`;
}
