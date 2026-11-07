// @spec-source → 全域識別碼命名契約與驗證工具規格書.md (doc_spec_0335) §2 八大識別碼契約、§3 IdContractValidator（PROG-2-2021）
/**
 * IdContractValidator — 全域識別碼格式校驗。純函式，正規表示式集中在 ID_CONTRACT_PATTERNS。
 */

export const ID_CONTRACT_PATTERNS = {
    UID: /^u_[0-9a-f]{8,16}$/,
    // §1 資料現狀權威：現行 generals.json 用連字號（cao-cao），與規格的底線寫法雙軌兼容
    Template_ID: /^[a-z][a-z0-9_-]{2,31}$/,
    Bloodline_ID: /^(BLOOD_[A-Z0-9_]+|BL_[A-Z0-9_]+)$/,
    Gene_ID: /^([a-z][a-z0-9_]{2,31}|GENE_[A-Z0-9_]+)$/,
    V_PID: /^V_[A-Z0-9_]{3,31}$/,
    SIGIL: /^SIGIL_[A-Z0-9_]+$/,
    SPIRIT_TALLY: /^TALLY_[A-Z0-9_]+$/,
    ATM_ID: /^[A-Z]{2,6}-\d-\d{4}$/,
} as const;

export type IdCategory = keyof typeof ID_CONTRACT_PATTERNS;

export interface IdValidationResult {
    valid: boolean;
    category: string;
    targetId: string;
    errorReason?: string;
}

export function isIdCategory(value: string): value is IdCategory {
    return Object.prototype.hasOwnProperty.call(ID_CONTRACT_PATTERNS, value);
}

/** §3：依類別校驗單一識別碼；未知類別或非字串一律判失敗。 */
export function validateId(category: string, id: unknown): IdValidationResult {
    const targetId = typeof id === 'string' ? id : String(id);
    if (!isIdCategory(category)) return { valid: false, category, targetId, errorReason: 'Unknown ID Category' };
    const valid = typeof id === 'string' && ID_CONTRACT_PATTERNS[category].test(id);
    return valid
        ? { valid, category, targetId }
        : { valid, category, targetId, errorReason: `ID [${targetId}] violates contract for ${category}` };
}

/** §4：批次校驗，只回傳不合格的項目；空陣列代表全數通過。 */
export function findIdViolations(category: string, ids: readonly unknown[]): IdValidationResult[] {
    return ids.map((id) => validateId(category, id)).filter((r) => !r.valid);
}
