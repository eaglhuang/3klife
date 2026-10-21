// @spec-source → 經濟系統.md §道具表（加速卡 -2h/張、5 精元）；WBS ECO-08；PROG-2-1019
/**
 * AccelerateCard — 加速卡縮短剩餘時間（純邏輯，不依賴 cc）。
 *
 * - 每張加速卡縮短 2 小時；剩餘時間不會低於 0，多出來的卡不會被消耗。
 * - 回傳實際消耗的張數，呼叫端據此扣道具，避免扣到沒用到的卡。
 * - 售價（5 精元）暫不在本模組扣款：精元與靈玉是否同一貨幣尚待裁定（ECO-03 跳過中）。
 *
 * 暫定：本模組的 remainingMs 即規格的 End_Time 剩餘量（規格未寫時間基準，以毫秒的剩餘量計）。
 * Unity 對照：像 Timer 的 Speed-up 道具，只改剩餘時間並回報用掉幾張，扣庫存由背包系統負責。
 */

export const ACCELERATE_CARD_HOURS = 2;
export const ACCELERATE_CARD_MS = ACCELERATE_CARD_HOURS * 60 * 60 * 1000;
/** 售價（精元），暫定、未扣款。 */
export const ACCELERATE_CARD_PRICE_SPIRIT = 5;

export interface AccelerateResult {
    /** 加速後的剩餘毫秒，不低於 0 */
    remainingMs: number;
    /** 實際消耗的加速卡張數 */
    cardsUsed: number;
}

/**
 * 用 cards 張加速卡縮短 remainingMs。
 * 非有限數或非正數視為 0；卡數取整數向下；剩餘時間為 0 時不消耗任何卡。
 */
export function accelerateRemaining(remainingMs: number, cards: number): AccelerateResult {
    const safeRemaining = Number.isFinite(remainingMs) && remainingMs > 0 ? remainingMs : 0;
    const safeCards = Number.isFinite(cards) && cards > 0 ? Math.floor(cards) : 0;
    if (safeRemaining === 0 || safeCards === 0) return { remainingMs: safeRemaining, cardsUsed: 0 };
    const needed = Math.ceil(safeRemaining / ACCELERATE_CARD_MS);
    const cardsUsed = Math.min(safeCards, needed);
    const remainingAfter = Math.max(0, safeRemaining - cardsUsed * ACCELERATE_CARD_MS);
    return { remainingMs: remainingAfter, cardsUsed };
}
