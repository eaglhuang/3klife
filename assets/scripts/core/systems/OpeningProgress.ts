// @spec-source → 新手開場規格書 §2 開場流程；QA 回報（名將登場途中關遊戲，下次跳過登場）；PROG-2-1371
/**
 * OpeningProgress — 新玩家開場進行到哪一幕的存檔欄位正規化（純邏輯，不依賴 cc）。
 *
 * - 存的是幕 id（intro / destiny / showcase），開場結束時為 null（不寫入欄位）。
 * - 這裡只檢查它是不是合理的字串；幕 id 認不認得由 OpeningFlowController.restoreAt 判斷，認不得即視為開場已結束。
 *
 * Unity 對照：像 PlayerPrefs 存一個整數代表 Tutorial 進度，讀回時先確認型別與範圍，不合法就當作從頭開始。
 */

const MAX_PHASE_ID_LENGTH = 32;

/** 讀回存檔的開場幕 id：非字串、空字串或過長即視為沒有進行中的開場。 */
export function normalizeOpeningPhaseId(value: unknown): string | null {
    if (typeof value !== 'string' || value.length === 0 || value.length > MAX_PHASE_ID_LENGTH) return null;
    return value;
}
