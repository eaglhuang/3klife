// @spec-source → 教官精力欄位統一與教學邊界防護規格書 (doc_spec_0325) §1~§3（REV-03、MENT-11，PROG-2-2000）
/**
 * MentorDataFirewall — 精力欄位廢止別名偵測與教官 TeachingOnly 單向資料流守門（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 正式名：Vitality_Max / Vitality / Vitality_Recovery_Rate；廢止別名 VIT_Max、VitMax、MAX_VIT、VIT、vit、
 *   VitCurrent、VIT_Recov、VitRegen、vitMax 一律拒絕並要求遷移。
 * - Role_Boundary=TeachingOnly 時，嚴禁回寫：Father_UID/ID、Mother_UID/ID、Genes、Bloodline_ID、
 *   Conception_Rate、Ancestors_JSON、Prowess_Stats。
 * - 修業結束後教官資料須與開始時完全相同（無狀態回饋）；反向寫入拋 SecurityBoundaryViolationError。
 *
 * 既有 MentorBoundary.ts（MENT-11）只擋 genes；既有 DataSchemaEnumRules.MENTOR_FORBIDDEN_KEYS 少 Ancestors_JSON、Prowess_Stats，本檔用規格完整清單。
 * 暫定：接入 NurtureService 事務與存檔驗證另卡。
 * Unity 對照：像存檔前的 Validator + 交易結束時的不可變斷言。
 */

export const VITALITY_FORBIDDEN_ALIASES = [
    'VIT_Max', 'VitMax', 'MAX_VIT', 'VIT', 'vit', 'VitCurrent', 'VIT_Recov', 'VitRegen', 'vitMax',
] as const;

export const TEACHING_ONLY_FORBIDDEN_FIELDS = [
    'Father_UID', 'Father_ID', 'Mother_UID', 'Mother_ID', 'Genes', 'Bloodline_ID', 'Conception_Rate',
    'Ancestors_JSON', 'Prowess_Stats',
] as const;

export class SecurityBoundaryViolationError extends Error {}

/** 遞迴找出 JSON 內所有廢止精力別名的欄位路徑。 */
export function findVitalityAliasPaths(value: unknown, path = ''): string[] {
    if (Array.isArray(value)) return value.flatMap((v, i) => findVitalityAliasPaths(v, `${path}[${i}]`));
    if (typeof value !== 'object' || value === null) return [];
    const found: string[] = [];
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        const p = path ? `${path}.${key}` : key;
        if ((VITALITY_FORBIDDEN_ALIASES as readonly string[]).includes(key)) found.push(p);
        found.push(...findVitalityAliasPaths(child, p));
    }
    return found;
}

/** 教官資料的寫入補丁是否觸碰禁寫欄位；回傳違規欄位。 */
export function forbiddenMentorWrites(roleBoundary: string | undefined, patch: Record<string, unknown>): string[] {
    if (roleBoundary !== 'TeachingOnly') return [];
    return TEACHING_ONLY_FORBIDDEN_FIELDS.filter((k) => Object.prototype.hasOwnProperty.call(patch, k));
}

/** 套用補丁前守門：觸碰禁寫欄位即拋錯。 */
export function assertMentorPatchAllowed(roleBoundary: string | undefined, patch: Record<string, unknown>): void {
    const bad = forbiddenMentorWrites(roleBoundary, patch);
    if (bad.length > 0) throw new SecurityBoundaryViolationError(`TeachingOnly 教官禁止回寫：${bad.join(', ')}`);
}

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

/** 修業結束斷言：教官資料與開始時須完全相同（鍵順序不影響）。 */
export function assertMentorUnchanged(before: unknown, after: unknown): void {
    if (stableStringify(before) !== stableStringify(after)) {
        throw new SecurityBoundaryViolationError('修業結束後教官資料被改動，違反單向資料流');
    }
}
