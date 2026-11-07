/**
 * GdpPipeline — 武將數據管線三階段：攝取 → 合併 → 驗證（doc_spec_0343；PROG-2-2029）
 *
 * 純函式、無 I/O：呼叫端負責讀檔，這裡只處理資料，方便 CI 用固定 fixture 跑確定性測試。
 */

/** 標準化後的武將紀錄；其餘欄位原樣保留。 */
export interface GdpRecord {
    templateId: string;
    [field: string]: unknown;
}

export interface GdpIngestResult {
    records: GdpRecord[];
    warnings: string[];
}

export interface GdpValidateOptions {
    /** 合法的特殊兵種營 ID；未提供時略過外鍵檢查。 */
    troopCampIds?: ReadonlySet<string>;
    /** 合法的戰法 ID；未提供時略過。 */
    tacticIds?: ReadonlySet<string>;
    requiredFields?: readonly string[];
    statFields?: readonly string[];
    statMin?: number;
    statMax?: number;
}

/** doc_spec_0343 §3 */
export interface GdpValidationSummary {
    passed: boolean;
    totalRecordsChecked: number;
    invalidForeignKeys: number;
    outOfBoundStats: number;
    missingRequiredFields: number;
    durationMs: number;
}

export const GDP_DEFAULTS = {
    requiredFields: ['templateId', 'name'] as readonly string[],
    statFields: ['str', 'int', 'lea', 'pol', 'cha', 'luk'] as readonly string[],
    statMin: 1,
    // 轉生 5 次上限 100 + 5×5（doc_spec_0341）
    statMax: 125,
};

/** §1 攝取：抹平欄位（Template_ID → templateId、數字字串 → 數字），異常資料記警告後略過，不拋例外。 */
export function gdpIngest(raw: unknown): GdpIngestResult {
    const records: GdpRecord[] = [];
    const warnings: string[] = [];
    if (!Array.isArray(raw)) return { records, warnings: ['ingest: 來源不是陣列'] };
    raw.forEach((row, index) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            warnings.push(`ingest[${index}]: 不是物件，已略過`);
            return;
        }
        const out: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
            const field = key === 'Template_ID' ? 'templateId' : key;
            out[field] = typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim()) ? Number(value) : value;
        }
        const templateId = typeof out.templateId === 'string' ? out.templateId.trim() : '';
        if (!templateId) {
            warnings.push(`ingest[${index}]: 缺少 Template_ID，已略過`);
            return;
        }
        records.push({ ...out, templateId });
    });
    return { records, warnings };
}

/** §1 合併：依 templateId 無損合併（新資料覆蓋同名欄位、未提供的欄位保留），輸出依 templateId 排序以確保冪等。 */
export function gdpMerge(base: readonly GdpRecord[], incoming: readonly GdpRecord[]): GdpRecord[] {
    const byId = new Map<string, GdpRecord>();
    for (const record of base) byId.set(record.templateId, { ...record });
    for (const record of incoming) {
        const existing = byId.get(record.templateId);
        byId.set(record.templateId, existing ? { ...existing, ...record } : { ...record });
    }
    return Array.from(byId.values())
        .sort((a, b) => (a.templateId < b.templateId ? -1 : a.templateId > b.templateId ? 1 : 0))
        .map(sortKeys);
}

function sortKeys(record: GdpRecord): GdpRecord {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) out[key] = record[key];
    return out as GdpRecord;
}

/** §1 驗證：外鍵（兵種營、戰法）、數值越界、必填欄位。 */
export function gdpValidate(
    records: readonly GdpRecord[],
    options: GdpValidateOptions = {},
): Omit<GdpValidationSummary, 'durationMs'> & { issues: string[] } {
    const requiredFields = options.requiredFields ?? GDP_DEFAULTS.requiredFields;
    const statFields = options.statFields ?? GDP_DEFAULTS.statFields;
    const statMin = options.statMin ?? GDP_DEFAULTS.statMin;
    const statMax = options.statMax ?? GDP_DEFAULTS.statMax;
    const issues: string[] = [];
    let invalidForeignKeys = 0;
    let outOfBoundStats = 0;
    let missingRequiredFields = 0;
    for (const record of records) {
        const id = record.templateId;
        for (const field of requiredFields) {
            const value = record[field];
            if (value === undefined || value === null || value === '') {
                missingRequiredFields++;
                issues.push(`${id}: 缺少必填欄位 ${field}`);
            }
        }
        for (const field of statFields) {
            const value = record[field];
            if (value === undefined) continue;
            if (typeof value !== 'number' || !Number.isFinite(value) || value < statMin || value > statMax) {
                outOfBoundStats++;
                issues.push(`${id}: ${field}=${String(value)} 超出 ${statMin}～${statMax}`);
            }
        }
        const camp = record.specialTroopCampId;
        if (options.troopCampIds && camp !== undefined && camp !== null && camp !== '' && !options.troopCampIds.has(String(camp))) {
            invalidForeignKeys++;
            issues.push(`${id}: specialTroopCampId「${String(camp)}」未登錄`);
        }
        const tactics = record.tacticIds;
        if (options.tacticIds && Array.isArray(tactics)) {
            for (const tactic of tactics) {
                if (!options.tacticIds.has(String(tactic))) {
                    invalidForeignKeys++;
                    issues.push(`${id}: Tactic_ID「${String(tactic)}」未登錄`);
                }
            }
        }
    }
    return {
        passed: invalidForeignKeys + outOfBoundStats + missingRequiredFields === 0,
        totalRecordsChecked: records.length,
        invalidForeignKeys,
        outOfBoundStats,
        missingRequiredFields,
        issues,
    };
}

/** §3 一次跑完三階段，回傳摘要；`now` 可注入以利測試。 */
export function runGdpVerification(
    base: readonly GdpRecord[],
    rawIncoming: unknown,
    options: GdpValidateOptions = {},
    now: () => number = Date.now,
): GdpValidationSummary & { warnings: string[]; issues: string[]; mergeIdempotent: boolean } {
    const startTime = now();
    const { records, warnings } = gdpIngest(rawIncoming);
    const merged = gdpMerge(base, records);
    const mergeIdempotent = JSON.stringify(gdpMerge(merged, records)) === JSON.stringify(merged);
    const { issues, ...summary } = gdpValidate(merged, options);
    return {
        ...summary,
        passed: summary.passed && mergeIdempotent,
        durationMs: now() - startTime,
        warnings,
        issues,
        mergeIdempotent,
    };
}
