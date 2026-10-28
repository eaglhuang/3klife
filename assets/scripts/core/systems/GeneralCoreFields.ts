// @spec-source → 武將資料管線規格書 §3 欄位映射表（25 核心欄位）；WBS GDP-05（PROG-2-1271）
/**
 * GeneralCoreFields — 武將 25 核心欄位的覆蓋檢查（純邏輯，不依賴 cc）
 *
 * 只判斷欄位「有沒有值」，不替武將補值。空值定義：缺欄、null、空字串、"???"、空陣列。
 *
 * Unity 對照：像 Prefab 的必填欄位檢查，Inspector 有空格就亮警告，但不替你填。
 */

/** 規格 §3 的 25 核心欄位（名稱與 generals.json 欄位一致） */
export const GENERAL_CORE_FIELDS: readonly string[] = Object.freeze([
    'id', 'name', 'faction', 'role', 'gender',
    'str', 'int', 'lea', 'pol', 'cha', 'luk',
    'ep', 'epRating', 'rarityTier', 'characterCategory', 'title', 'bloodlineId',
    'historicalAnecdote', 'bloodlineRumor', 'parentsSummary', 'ancestorsSummary',
    'genes', 'storyStripCells', 'awakeningTitle', 'skillId',
]);

function isEmptyValue(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' || trimmed === '???';
    }
    if (Array.isArray(value)) return value.length === 0;
    return false;
}

/** 回傳這位武將缺少值的核心欄位（依規格順序） */
export function missingCoreFields(general: object): string[] {
    const record = general as Record<string, unknown>;
    return GENERAL_CORE_FIELDS.filter((field) => isEmptyValue(record[field]));
}

export interface CoreFieldCoverage {
    total: number;
    complete: number;
    /** 每個欄位缺值的武將數（只列出有缺的欄位） */
    missingByField: Record<string, number>;
}

/** 統計一批武將的核心欄位覆蓋率 */
export function coreFieldCoverage(generals: readonly object[]): CoreFieldCoverage {
    const missingByField: Record<string, number> = {};
    let complete = 0;
    for (const general of generals) {
        const missing = missingCoreFields(general);
        if (missing.length === 0) complete++;
        for (const field of missing) missingByField[field] = (missingByField[field] ?? 0) + 1;
    }
    return { total: generals.length, complete, missingByField };
}

/** 覆蓋率摘要的一行文字：完整數／總數，缺值最多的前三個欄位；全部完整時只顯示完整數（PROG-2-1372）。 */
export function formatCoreFieldCoverage(coverage: CoreFieldCoverage): string {
    const head = `核心欄位完整 ${coverage.complete}/${coverage.total}`;
    const worst = Object.entries(coverage.missingByField)
        .sort((a, b) => b[1] - a[1] || GENERAL_CORE_FIELDS.indexOf(a[0]) - GENERAL_CORE_FIELDS.indexOf(b[0]))
        .slice(0, 3)
        .map(([field, count]) => `${field}×${count}`);
    return worst.length === 0 ? head : `${head}，缺值最多：${worst.join(' ')}`;
}
