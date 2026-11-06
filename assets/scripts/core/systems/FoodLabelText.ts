// @spec-source → 主戰場UI規格補充_v3.md Zone 1「DP → 糧草（v3-4）」（doc_ui_0003，PROG-2-1896）
/**
 * FoodLabelText — 戰場頂部糧草標籤文字（純邏輯，不依賴 cc）
 *
 * 規格格式：「🌾 糧草 8,500 / 12,000」，數字加千分位。
 * 小數無條件捨去；負數或非有限數視為 0。
 *
 * Unity 對照：像 HUD Presenter 的 string.Format("{0:N0}")，View 只負責 SetText。
 */

/** 非負整數加千分位：8500 → "8,500" */
export function formatThousands(value: number): string {
    const n = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 「🌾 糧草 8,500 / 12,000」 */
export function foodLabelText(food: number, maxFood: number): string {
    return `🌾 糧草 ${formatThousands(food)} / ${formatThousands(maxFood)}`;
}
