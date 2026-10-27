// @spec-source → NPC人性化規格書 §E #8 Golden Line Set、§F-3 第 2 條（20% 錨點台詞不得被中台覆蓋）、§J Golden_Line（PROG-2-0948，NPC-07）
/**
 * NpcGoldenLine — 核心武將錨點台詞（Golden_Lines）不可被覆蓋的執行規則（純邏輯，不依賴 cc）
 *
 * 規則（PM 2026-10-27 暫定裁定）：
 *   - Golden_Lines 內的台詞，中台或模板生成的結果一律不取代，只作 style 參考。
 *   - 「20%」視為錨點佔比的上限：錨點台詞數 ÷ 台詞池總數 不得超過 20%。
 *
 * Unity 對照：像 ScriptableObject 上標 [ReadOnly] 的欄位，外部 Patch 寫入時先過一道守門，
 * 碰到受保護的欄位就保留原值，不讓生成結果把它改掉。
 */

/** 錨點台詞佔比上限（規格 §F-3 的 20%，暫定：以佔比上限解讀） */
export const GOLDEN_LINE_MAX_SHARE = 0.2;

export function isGoldenLine(goldenLines: readonly string[], text: string): boolean {
    return goldenLines.includes(text);
}

/**
 * 替換台詞時的守門：若目前台詞是錨點，回傳原台詞（不被覆蓋）；否則回傳替換內容。
 * 不改輸入。
 */
export function protectGoldenLine(goldenLines: readonly string[], currentLine: string, replacement: string): string {
    return isGoldenLine(goldenLines, currentLine) ? currentLine : replacement;
}

/** 錨點佔比檢查：錨點數 ÷ 總數 不得超過 GOLDEN_LINE_MAX_SHARE；總數為 0 時不通過。 */
export function anchorShareOk(goldenCount: number, totalCount: number): boolean {
    if (totalCount <= 0 || goldenCount < 0 || goldenCount > totalCount) return false;
    return goldenCount / totalCount <= GOLDEN_LINE_MAX_SHARE;
}
