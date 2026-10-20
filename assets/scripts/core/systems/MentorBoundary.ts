// @spec-source → 教官系統（支援卡）.md（Role_Boundary=TeachingOnly）；WBS MENT-11
/**
 * MentorBoundary — 教學職能邊界的執行期檢查（MENT-11，純函式，不依賴 cc）
 *
 * 規格：教官加成（靈感、訓練）只能影響培育中的數值，不得回寫子嗣的因子（genes）。
 * 呼叫端在教官加成前後各取一次 genes，把兩份交給這裡比對；有差異就回報違規項目。
 *
 * Unity 對照：像一個 Assert，只在 Editor/測試時把違規印出來，不改資料本身。
 */

export type MentorBoundaryViolation = 'genes';

/** 比對兩份因子清單是否相同（以 JSON 結構為準）；未提供視為空清單 */
export function mentorBoundaryViolations(
    genesBefore: readonly unknown[] | undefined,
    genesAfter: readonly unknown[] | undefined,
): MentorBoundaryViolation[] {
    return JSON.stringify(genesBefore ?? []) === JSON.stringify(genesAfter ?? []) ? [] : ['genes'];
}
