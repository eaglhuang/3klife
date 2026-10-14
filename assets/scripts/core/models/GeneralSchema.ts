// @spec-source → 武將系統.md §Server 端欄位表、名詞定義文件.md（WBS MVP-01，PROG-2-0253）
/**
 * GeneralSchema — 武將最小資料結構驗證（純邏輯，不依賴 cc）
 *
 * 檢查 generals.json 裡每筆武將是否具備規格的核心欄位，並且型別正確。
 * 不改 GeneralUnit 類別與存檔格式，只回報錯誤。
 *
 * 欄位對照（規格 → 資料欄位）：
 *   UID → id、Template_ID → templateId、Bloodline_ID → bloodlineId、
 *   Vitality → vitality、Vitality_Max → maxVitality、Role（WBS 稱 Class）→ role、Status → status
 *
 * Unity 對照：像 ScriptableObject 的 OnValidate，資料載入後跑一次檢查，欄位缺了或型別錯就印警告。
 */

/** 規格 Status ENUM（武將系統 Server 端欄位表） */
export const GENERAL_STATUSES = ['Active', 'Training', 'Retired', 'Dead'] as const;
export type GeneralStatus = (typeof GENERAL_STATUSES)[number];

/** 驗證前的原始武將資料（generals.json 的一筆） */
export interface GeneralSchemaRecord {
    id?: unknown;
    templateId?: unknown;
    bloodlineId?: unknown;
    vitality?: unknown;
    maxVitality?: unknown;
    role?: unknown;
    status?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 驗證單一武將，回傳錯誤訊息；空陣列代表通過。
 * 訊息以「欄位名: 原因」開頭，方便對應到 JSON。
 */
export function validateGeneralSchema(record: GeneralSchemaRecord): string[] {
    const errors: string[] = [];

    if (!isNonEmptyString(record.id)) errors.push('id: 缺少 UID');
    if (!isNonEmptyString(record.templateId)) errors.push('templateId: 缺少 Template_ID');
    if (!isNonEmptyString(record.bloodlineId)) errors.push('bloodlineId: 缺少 Bloodline_ID');
    if (!isNonEmptyString(record.role)) errors.push('role: 缺少 Role（Class）');

    if (!isFiniteNumber(record.vitality)) {
        errors.push('vitality: 精力值不是有限數字');
    } else if (record.vitality < 0) {
        errors.push('vitality: 精力值不可為負');
    }

    if (!isFiniteNumber(record.maxVitality)) {
        errors.push('maxVitality: 精力上限不是有限數字');
    } else if (record.maxVitality <= 0) {
        errors.push('maxVitality: 精力上限必須大於 0');
    }

    if (isFiniteNumber(record.vitality) && isFiniteNumber(record.maxVitality) && record.vitality > record.maxVitality) {
        errors.push('vitality: 精力值超過精力上限');
    }

    if (!GENERAL_STATUSES.includes(record.status as GeneralStatus)) {
        errors.push(`status: 必須是 ${GENERAL_STATUSES.join('/')} 之一`);
    }

    return errors;
}

/** 驗證整批武將，回傳每筆的錯誤（只列有錯的）；id 重複也會回報 */
export function validateGeneralList(records: readonly GeneralSchemaRecord[]): Array<{ id: string; errors: string[] }> {
    const report: Array<{ id: string; errors: string[] }> = [];
    const seen = new Set<string>();
    for (const record of records) {
        const id = isNonEmptyString(record.id) ? record.id : '(無 id)';
        const errors = validateGeneralSchema(record);
        if (isNonEmptyString(record.id)) {
            if (seen.has(record.id)) errors.push('id: UID 重複');
            seen.add(record.id);
        }
        if (errors.length > 0) report.push({ id, errors });
    }
    return report;
}
