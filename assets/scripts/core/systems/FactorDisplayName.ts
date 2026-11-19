// @spec-source → 名士預言系統.md (doc_spec_0006)；PROG-2-9176 線上試玩回報：占卜露出內部 id
/**
 * 因子顯示名：把「只有內部 id」的名稱換成玩家看得懂的中文。純邏輯，不依賴 cc。
 *
 * 來源：占卜結果的關鍵詞、覺醒事件名稱在字典沒載入時會退回因子 id（例如 gene_honor），
 * 直接顯示會露出內部代碼。這裡統一換成字典的中文名；字典也查不到就回傳空字串，由畫面端不顯示該段。
 */
import type { FactorDictionary } from './FactorInheritance';

/** 內部因子 id 的樣子：gene_ 開頭的小寫英數底線 */
export function isRawFactorId(text: string | null | undefined): boolean {
    return typeof text === 'string' && /^gene_[a-z0-9_]+$/i.test(text.trim());
}

/** 取玩家看得懂的因子名；查不到中文名時回傳空字串（不回傳 id） */
export function readableFactorName(
    factorId: string | null | undefined,
    displayName: string | null | undefined,
    dictionary?: FactorDictionary,
): string {
    const given = (displayName ?? '').trim();
    if (given !== '' && !isRawFactorId(given)) return given;
    const fromDict = factorId ? dictionary?.get(factorId)?.displayName?.trim() : undefined;
    if (fromDict && !isRawFactorId(fromDict)) return fromDict;
    return '';
}

/** 查不到中文名時畫面顯示的字樣 */
export const UNREVEALED_FACTOR_NAME = '待揭曉之因子';

/** 因子的畫面名稱：有中文名用中文名，否則「待揭曉之因子」；永遠不回傳內部 id */
export function factorLabelOf(gene: { id?: string; displayName?: string } | undefined | null, dictionary?: FactorDictionary): string {
    return readableFactorName(gene?.id, gene?.displayName, dictionary) || UNREVEALED_FACTOR_NAME;
}
