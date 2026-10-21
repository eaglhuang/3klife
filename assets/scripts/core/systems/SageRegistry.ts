// @spec-source → 名士預言系統.md §名士偏好表、§Server 端 — 名士表；WBS ORAC-01（PROG-2-1067）
/**
 * SageRegistry — 名士表的載入與 schema 驗證（純邏輯，不依賴 cc）
 *
 * 規則：名士代碼 sageId 不重複且以 SAGE_ 開頭；偏好面向必須是已知的面向；
 * 基準準確率為 0~1 之間的小數（不含 0）；解鎖條件必須有 type。
 * 驗證失敗的項目會列出原因，不會被靜默丟棄。
 *
 * Unity 對照：像 ScriptableObject 的資料表，載入時逐筆檢查欄位，不合格就在 Console 報錯。
 */
export const SAGE_BIAS_TYPES = [
    'INTELLECT_POLITICS',
    'LIFESPAN_PHYSIQUE',
    'BALANCED',
    'PERSONALITY_TALENT',
    'MILITARY_TACTIC',
    'LUCK_FATE',
] as const;
export type SageBiasType = (typeof SAGE_BIAS_TYPES)[number];

export interface SageDefinition {
    sageId: string;
    name: string;
    biasType: SageBiasType;
    accuracyBase: number;
    unlockCondition: { type: string; [key: string]: unknown };
}

export interface SageTableResult {
    sages: SageDefinition[];
    errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateSage(raw: unknown, index: number): { sage: SageDefinition | null; errors: string[] } {
    if (!isRecord(raw)) return { sage: null, errors: [`#${index} 不是物件`] };
    const errors: string[] = [];
    const sageId = raw.sageId;
    if (typeof sageId !== 'string' || !sageId.startsWith('SAGE_')) errors.push(`#${index} sageId 必須以 SAGE_ 開頭`);
    if (typeof raw.name !== 'string' || raw.name.trim() === '') errors.push(`#${index} 缺少 name`);
    if (!SAGE_BIAS_TYPES.includes(raw.biasType as SageBiasType)) errors.push(`#${index} biasType 不是已知面向`);
    const accuracy = raw.accuracyBase;
    if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 1) {
        errors.push(`#${index} accuracyBase 必須在 (0, 1]`);
    }
    if (!isRecord(raw.unlockCondition) || typeof raw.unlockCondition.type !== 'string') {
        errors.push(`#${index} unlockCondition 缺少 type`);
    }
    if (errors.length > 0) return { sage: null, errors };
    return {
        sage: {
            sageId: sageId as string,
            name: raw.name as string,
            biasType: raw.biasType as SageBiasType,
            accuracyBase: accuracy as number,
            unlockCondition: raw.unlockCondition as SageDefinition['unlockCondition'],
        },
        errors: [],
    };
}

/** 讀取 { data: [...] } 格式的名士表；重複的 sageId 只保留第一筆並回報 */
export function parseSageTable(raw: unknown): SageTableResult {
    const list = isRecord(raw) && Array.isArray(raw.data) ? raw.data : [];
    const sages: SageDefinition[] = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    list.forEach((item, index) => {
        const result = validateSage(item, index);
        errors.push(...result.errors);
        if (!result.sage) return;
        if (seen.has(result.sage.sageId)) {
            errors.push(`#${index} sageId 重複：${result.sage.sageId}`);
            return;
        }
        seen.add(result.sage.sageId);
        sages.push(result.sage);
    });
    return { sages, errors };
}
