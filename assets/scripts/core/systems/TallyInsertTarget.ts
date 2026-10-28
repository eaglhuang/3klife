// @spec-source → 兵種（虎符）系統 §英靈插卡；WBS TRP-18（PROG-2-1306）
/**
 * TallyInsertTarget — 兵頁插卡按鈕的目標選擇（純邏輯，不依賴 cc）
 *
 * 暫定（可逆）：
 * - 目標武將用循環選擇：每按一次換下一位，到尾端回到第一位（跟子嗣接收按鈕同一做法）。
 * - 要插的卡：依 uid 排序後取第一張還沒裝備的虎符；沒有則回傳 null。
 *
 * Unity 對照：像 Inspector 的下拉選單，每點一次換下一個選項，選完後再送出 Equip 指令。
 */

/** 循環到下一個目標；total 為 0 時回傳 0 */
export function nextInsertTargetIndex(current: number, total: number): number {
    if (total <= 0) return 0;
    return (current + 1) % total;
}

/** 依 uid 排序後取第一張未裝備的虎符；沒有可插的卡回傳 null */
export function firstUnequippedTallyUid(
    cards: Readonly<Record<string, unknown>>,
    holdings: Readonly<Record<string, string | null | undefined>>,
): string | null {
    const uids = Object.keys(cards).sort();
    return uids.find((uid) => !holdings[uid]) ?? null;
}
