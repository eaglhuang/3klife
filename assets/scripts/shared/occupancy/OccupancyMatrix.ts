// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 第 3.5 節 OCC 新增 nursing／mentorAssign；家業規格 (doc_spec_1181) 第 10.1 節矩陣；PROG-2-9442
/**
 * OccupancyMatrix — 人員占用互斥矩陣（occupancy-matrix.json）的解析與判定（零依賴純函式）。
 *
 * 規則放設定檔，不寫死在程式：
 * - activities：玩家能「指派」的活動名稱表（出征 sortie、太守 gov、傭兵 mercenary…）。
 * - kindActivity：每一種占用種類代表哪個活動（用來判斷兩種占用能不能同時掛在同一個人身上）。
 * - rules：每種占用的 blocks（擋哪些活動）與 allows（放行哪些活動）；沒列到的活動一律視為擋（保守，與 MVP 全互斥一致）。
 *
 * 判定：
 * - 活動指派（activityBlockedBy）：某人身上的任一占用沒有明列放行該活動，就擋下。
 * - 占用並存（kindsCompatible）：兩種占用任一方明列 blocks 對方活動就互斥；沒人明列 blocks、且至少一方明列 allows 才並存。
 * 與其他設定檔的容錯不同：缺欄位或不一致 fail-fast（OccupancyMatrixError 列出全部問題）。
 */
import { READONLY_OCCUPANCY_KINDS, WRITABLE_OCCUPANCY_KINDS, type OccupancyKind, type OccupancyRecord } from './OccupancyTypes';

export const OCCUPANCY_MATRIX_JSON = 'data/occupancy-matrix';
export const OCCUPANCY_MATRIX_SCHEMA = 'occupancy-matrix.v1' as const;

export interface OccupancyKindRule {
    blocks: string[];
    allows: string[];
}

export interface OccupancyMatrixV1 {
    schema: typeof OCCUPANCY_MATRIX_SCHEMA;
    activities: string[];
    kindActivity: Record<OccupancyKind, string>;
    rules: Partial<Record<OccupancyKind, OccupancyKindRule>>;
}

export class OccupancyMatrixError extends Error {
    public readonly issues: string[];

    public constructor(issues: string[]) {
        super(`[OccupancyMatrix] occupancy-matrix.json 不合格（${issues.length} 項）：${issues.join('；')}`);
        this.name = 'OccupancyMatrixError';
        this.issues = issues;
    }
}

const ALL_KINDS: readonly OccupancyKind[] = [...WRITABLE_OCCUPANCY_KINDS, ...READONLY_OCCUPANCY_KINDS];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] | null {
    return Array.isArray(value) && value.every((v) => typeof v === 'string' && v !== '') ? (value as string[]) : null;
}

/** 解析並檢查；任何缺欄位、未知名稱、blocks 與 allows 重疊都累積成一個 OccupancyMatrixError 丟出 */
export function parseOccupancyMatrix(raw: unknown): OccupancyMatrixV1 {
    const issues: string[] = [];
    if (!isRecord(raw)) throw new OccupancyMatrixError(['整份設定不是物件']);
    if (raw.schema !== OCCUPANCY_MATRIX_SCHEMA) issues.push(`schema 必須是 ${OCCUPANCY_MATRIX_SCHEMA}`);

    const activities = stringList(raw.activities) ?? [];
    if (activities.length === 0) issues.push('activities 缺少或不是非空字串陣列');
    if (new Set(activities).size !== activities.length) issues.push('activities 有重複名稱');
    const known = new Set(activities);

    const kindActivity = {} as Record<OccupancyKind, string>;
    const kaSrc = isRecord(raw.kindActivity) ? raw.kindActivity : null;
    if (!kaSrc) issues.push('kindActivity 缺少或不是物件');
    for (const kind of ALL_KINDS) {
        const value = kaSrc ? kaSrc[kind] : undefined;
        if (typeof value !== 'string' || !known.has(value)) issues.push(`kindActivity.${kind} 缺少或不在 activities 內`);
        else kindActivity[kind] = value;
    }

    const rules: Partial<Record<OccupancyKind, OccupancyKindRule>> = {};
    const rulesSrc = isRecord(raw.rules) ? raw.rules : null;
    if (!rulesSrc) issues.push('rules 缺少或不是物件');
    if (rulesSrc) {
        for (const key of Object.keys(rulesSrc)) {
            if ((ALL_KINDS as readonly string[]).indexOf(key) < 0) issues.push(`rules.${key} 不是已知的占用種類`);
        }
        // 可寫入登記表的種類都必須有規則（只讀轉接器那六種可以沒有，沒有就是全擋）
        for (const kind of ALL_KINDS) {
            const entry = rulesSrc[kind];
            const required = (WRITABLE_OCCUPANCY_KINDS as readonly string[]).indexOf(kind) >= 0;
            if (entry === undefined) {
                if (required) issues.push(`rules.${kind} 缺少（可寫入登記表的種類必須有規則）`);
                continue;
            }
            if (!isRecord(entry)) { issues.push(`rules.${kind} 不是物件`); continue; }
            const blocks = stringList(entry.blocks);
            const allows = stringList(entry.allows);
            if (!blocks) issues.push(`rules.${kind}.blocks 缺少或不是字串陣列`);
            if (!allows) issues.push(`rules.${kind}.allows 缺少或不是字串陣列`);
            if (!blocks || !allows) continue;
            for (const name of [...blocks, ...allows]) if (!known.has(name)) issues.push(`rules.${kind} 內的 ${name} 不在 activities`);
            for (const name of allows) if (blocks.indexOf(name) >= 0) issues.push(`rules.${kind} 的 ${name} 同時在 blocks 與 allows`);
            rules[kind] = { blocks: [...blocks], allows: [...allows] };
        }
    }

    if (issues.length > 0) throw new OccupancyMatrixError(issues);
    return { schema: OCCUPANCY_MATRIX_SCHEMA, activities, kindActivity, rules };
}

/** 活動名稱是否在矩陣的活動表內 */
export function isKnownActivity(matrix: OccupancyMatrixV1, activity: string): boolean {
    return matrix.activities.indexOf(activity) >= 0;
}

/** 兩種占用能否同時掛在同一個人身上：任一方明列 blocks 對方就互斥；至少一方明列 allows 才並存 */
export function kindsCompatible(matrix: OccupancyMatrixV1, a: OccupancyKind, b: OccupancyKind): boolean {
    const ruleA = matrix.rules[a];
    const ruleB = matrix.rules[b];
    const actA = matrix.kindActivity[a];
    const actB = matrix.kindActivity[b];
    if (ruleA && ruleA.blocks.indexOf(actB) >= 0) return false;
    if (ruleB && ruleB.blocks.indexOf(actA) >= 0) return false;
    return !!((ruleA && ruleA.allows.indexOf(actB) >= 0) || (ruleB && ruleB.allows.indexOf(actA) >= 0));
}

/**
 * 某人目前的占用中，第一筆擋下該活動的紀錄（沒有 → null＝可指派）。
 * 該種占用沒有規則、或規則沒明列放行這個活動，都算擋。
 */
export function activityBlockedBy(matrix: OccupancyMatrixV1, records: readonly OccupancyRecord[], activity: string): OccupancyRecord | null {
    for (const record of records) {
        const rule = matrix.rules[record.kind];
        if (!rule || rule.allows.indexOf(activity) < 0) return record;
    }
    return null;
}
