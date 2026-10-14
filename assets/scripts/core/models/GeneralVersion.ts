/**
 * 同名武將版本表（SAME-01 / PROG-2-0422）
 *
 * 規格：同名武將系統.md I 節（Client General_Version 與 Server 版本表欄位）。
 * 純邏輯，不依賴 cc。
 */

export interface GeneralVersionRecord {
    Template_ID: string;
    Bloodline_ID: string;
    Display_Name?: string;
    Version_Title?: string;
    /** 規格為 TEXT，內容為 JSON 陣列字串 */
    Initial_Genes_JSON?: string;
    /** YYYY-MM-DD */
    Release_Date?: string;
    Is_Limited?: boolean;
}

/** {Name}_V{n}，可再接一段後綴，例如 Zhao_Yun_V3_Holy */
const TEMPLATE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*_V\d+(?:_[A-Za-z0-9]+)?$/;
const BLOODLINE_ID_PATTERN = /^BL_[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 檢查版本表。回傳錯誤訊息列表，空陣列代表通過。
 */
export function validateGeneralVersions(list: GeneralVersionRecord[]): string[] {
    const errors: string[] = [];
    const seen = new Set<string>();
    for (const v of list) {
        const tag = v.Template_ID || '(無 Template_ID)';
        if (!v.Template_ID || !TEMPLATE_ID_PATTERN.test(v.Template_ID)) {
            errors.push(`${tag}: Template_ID 不符 {Name}_V{n}`);
        }
        if (seen.has(v.Template_ID)) {
            errors.push(`${tag}: Template_ID 重複`);
        }
        seen.add(v.Template_ID);
        if (!v.Bloodline_ID || !BLOODLINE_ID_PATTERN.test(v.Bloodline_ID)) {
            errors.push(`${tag}: Bloodline_ID 不符 BL_{Name}`);
        }
        if (v.Release_Date !== undefined && !DATE_PATTERN.test(v.Release_Date)) {
            errors.push(`${tag}: Release_Date 需為 YYYY-MM-DD`);
        }
        if (v.Initial_Genes_JSON !== undefined && parseInitialGenes(v) === null) {
            errors.push(`${tag}: Initial_Genes_JSON 不是合法 JSON 陣列`);
        }
    }
    return errors;
}

/**
 * 解析版本的初始因子；格式錯誤回傳 null。缺欄位回傳空陣列。
 */
export function parseInitialGenes(record: GeneralVersionRecord): unknown[] | null {
    if (record.Initial_Genes_JSON === undefined) return [];
    try {
        const parsed = JSON.parse(record.Initial_Genes_JSON);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * 同一血源（Bloodline_ID）下的所有版本，依上架日排序（無日期者排最後），同日以 Template_ID 排序。
 */
export function versionsOfBloodline(list: GeneralVersionRecord[], bloodlineId: string): GeneralVersionRecord[] {
    return list
        .filter(v => v.Bloodline_ID === bloodlineId)
        .sort((a, b) => {
            const da = a.Release_Date ?? '9999-12-31';
            const db = b.Release_Date ?? '9999-12-31';
            if (da !== db) return da < db ? -1 : 1;
            return a.Template_ID < b.Template_ID ? -1 : a.Template_ID > b.Template_ID ? 1 : 0;
        });
}
