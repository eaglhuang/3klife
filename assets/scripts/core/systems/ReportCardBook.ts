// @spec-source → 培育系統.md (doc_spec_0026) §F-4 重修與畢業紀錄、§N-2 重修機制；MCQ Q31/Q69
/**
 * ReportCardBook — 畢業成績單的保留與定型（純邏輯，不依賴 cc）
 *
 * 規格：
 *   - 單一子嗣最多保留 3 份成績單，超過時丟掉最舊的一份。
 *   - 定型（正式畢業）只能選一份；其餘記錄銷毀，之後不得重來。
 *   - 重修本身無代價（Q31 選項 B）；消耗「補腦湯」×1 由呼叫端處理，這裡只提供數值。
 *
 * 暫定：本模組只管保留與定型的規則，不負責產生成績單內容，也不負責重新培育。
 *
 * Unity 對照：像一個 static 收納盒，每次操作都回傳新的盒子，不改傳入的盒子。
 */

export const REPORT_CARD_SLOTS = 3;
/** 重修消耗的道具數量（補腦湯 ×1）；道具扣除由上層負責 */
export const RETAKE_ITEM_COST = 1;

export interface ReportCardBook<T> {
    cards: readonly T[];
    /** 定型後為 true；之後不能再保留或定型 */
    committed: boolean;
}

export function emptyReportCardBook<T>(): ReportCardBook<T> {
    return { cards: [], committed: false };
}

/** 保留一份成績單；超過上限時丟掉最舊的。已定型則拋錯 */
export function keepReportCard<T>(book: ReportCardBook<T>, card: T): ReportCardBook<T> {
    if (book.committed) throw new RangeError('已定型，不能再保留成績單');
    const cards = [...book.cards, card];
    return { cards: cards.slice(Math.max(0, cards.length - REPORT_CARD_SLOTS)), committed: false };
}

/**
 * 定型：選定一份成績單進行正式畢業。回傳選中的成績單與已鎖定的新書（其餘全部銷毀）。
 * 索引不合法或已定型則拋錯。
 */
export function commitReportCard<T>(book: ReportCardBook<T>, index: number): { card: T; book: ReportCardBook<T> } {
    if (book.committed) throw new RangeError('已定型，不能重複定型');
    if (!Number.isInteger(index) || index < 0 || index >= book.cards.length) {
        throw new RangeError(`成績單索引不合法：${index}`);
    }
    return { card: book.cards[index], book: { cards: [], committed: true } };
}
