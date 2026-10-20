// @spec-source → 結緣系統（配種）.md §I Data Schema 需求（本機端 Breeding_Session／Child；Server 端表欄位）（BRD-12，PROG-2-0853）
/**
 * BreedingRecordSchema — 結緣會話、子嗣的本機端與 Server 端紀錄格式（純邏輯，不依賴 cc）
 *
 * 三件事：
 *   1. 本機端 Breeding_Session 與 Child 的型別與驗證（欄位名依規格 I 節）
 *   2. Server 端子嗣表列（Child_UID、Father_UID…）的型別，與本機端子嗣的轉換
 *   3. 序列化：本機端紀錄 ⇄ JSON 字串，讀回時再驗證，壞資料直接回報錯誤
 *
 * 規格兩端欄位名不同：本機用 Father_ID／UID，Server 用 Father_UID／Child_UID。
 * 轉換函式集中在這裡，避免各處各自改名。
 *
 * Unity 對照：像 ScriptableObject 的序列化與 OnValidate，存檔前後各驗一次。
 */

/** 規格 I 節：Breeding_Mode 只允許兩值 */
export const BREEDING_MODES = ['Standard', 'Peace_Lineage'] as const;
export type BreedingMode = (typeof BREEDING_MODES)[number];

/** 規格 I 節：子嗣出生後到開獎之間的季度數（Unveil_Season = Birth_Season + 20） */
export const UNVEIL_DELAY_SEASONS = 20;

/** 本機端結緣會話（Breeding_Session） */
export interface BreedingSessionRecord {
    Father_UID: string;
    Mother_UID: string;
    Breeding_Mode: BreedingMode;
    EP_Estimate: number;
    Oracle_Hints: Array<{ Sage: string; Comment: string }>;
}

/** 本機端子嗣（Child） */
export interface ChildRecord {
    UID: string;
    Father_ID: string;
    Mother_ID: string;
    Age: number;
    Status: string;
    EP_Actual: number;
    Is_Daqi: boolean;
    Omen_Type: string;
}

/** Server 端子嗣表列（規格 I 節 Server 端表） */
export interface ServerChildRow {
    Child_UID: string;
    Father_UID: string;
    Mother_UID: string;
    Breeding_Mode: BreedingMode;
    EP_Actual: number;
    Is_Daqi: boolean;
    Birth_Season: number;
    Unveil_Season: number;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isBreedingMode(value: unknown): value is BreedingMode {
    return typeof value === 'string' && (BREEDING_MODES as readonly string[]).includes(value);
}

/** 驗證本機端結緣會話，回傳錯誤；空陣列代表通過 */
export function validateBreedingSession(record: Partial<BreedingSessionRecord>): string[] {
    const errors: string[] = [];
    if (!isNonEmptyString(record.Father_UID)) errors.push('Father_UID: 缺少父親 UID');
    if (!isNonEmptyString(record.Mother_UID)) errors.push('Mother_UID: 缺少母親 UID');
    if (!isBreedingMode(record.Breeding_Mode)) errors.push(`Breeding_Mode: 必須是 ${BREEDING_MODES.join('/')} 之一`);
    if (!isFiniteNumber(record.EP_Estimate) || record.EP_Estimate < 0) errors.push('EP_Estimate: 必須是非負有限數字');
    if (!Array.isArray(record.Oracle_Hints)) {
        errors.push('Oracle_Hints: 必須是陣列');
    } else if (record.Oracle_Hints.some((hint) => !hint || !isNonEmptyString(hint.Sage) || typeof hint.Comment !== 'string')) {
        errors.push('Oracle_Hints: 每筆需有 Sage 與 Comment');
    }
    return errors;
}

/** 驗證本機端子嗣，回傳錯誤；空陣列代表通過 */
export function validateChildRecord(record: Partial<ChildRecord>): string[] {
    const errors: string[] = [];
    if (!isNonEmptyString(record.UID)) errors.push('UID: 缺少子嗣唯一碼');
    if (!isNonEmptyString(record.Father_ID)) errors.push('Father_ID: 缺少父親 ID');
    if (!isNonEmptyString(record.Mother_ID)) errors.push('Mother_ID: 缺少母親 ID');
    if (!isFiniteNumber(record.Age) || record.Age < 0) errors.push('Age: 必須是非負有限數字');
    if (!isNonEmptyString(record.Status)) errors.push('Status: 缺少狀態');
    if (!isFiniteNumber(record.EP_Actual) || record.EP_Actual < 0) errors.push('EP_Actual: 必須是非負有限數字');
    if (typeof record.Is_Daqi !== 'boolean') errors.push('Is_Daqi: 必須是布林值');
    if (!isNonEmptyString(record.Omen_Type)) errors.push('Omen_Type: 缺少天象類型');
    return errors;
}

/**
 * 子嗣轉 Server 表列。會話決定 Breeding_Mode；Birth_Season 由呼叫端給（子嗣本機端沒有季度欄位）。
 * Unveil_Season 依規格固定為出生後 20 季。
 */
export function toServerChildRow(child: ChildRecord, session: BreedingSessionRecord, birthSeason: number): ServerChildRow {
    if (!Number.isInteger(birthSeason) || birthSeason < 0) {
        throw new Error(`[BreedingRecordSchema] Birth_Season 必須是非負整數，收到 ${birthSeason}`);
    }
    return {
        Child_UID: child.UID,
        Father_UID: child.Father_ID,
        Mother_UID: child.Mother_ID,
        Breeding_Mode: session.Breeding_Mode,
        EP_Actual: child.EP_Actual,
        Is_Daqi: child.Is_Daqi,
        Birth_Season: birthSeason,
        Unveil_Season: birthSeason + UNVEIL_DELAY_SEASONS,
    };
}

/** 驗證 Server 表列，回傳錯誤；Unveil_Season 必須等於 Birth_Season + 20 */
export function validateServerChildRow(row: Partial<ServerChildRow>): string[] {
    const errors: string[] = [];
    if (!isNonEmptyString(row.Child_UID)) errors.push('Child_UID: 缺少子嗣唯一碼');
    if (!isNonEmptyString(row.Father_UID)) errors.push('Father_UID: 缺少父親 UID');
    if (!isNonEmptyString(row.Mother_UID)) errors.push('Mother_UID: 缺少母親 UID');
    if (!isBreedingMode(row.Breeding_Mode)) errors.push(`Breeding_Mode: 必須是 ${BREEDING_MODES.join('/')} 之一`);
    if (!isFiniteNumber(row.EP_Actual) || row.EP_Actual < 0) errors.push('EP_Actual: 必須是非負有限數字');
    if (typeof row.Is_Daqi !== 'boolean') errors.push('Is_Daqi: 必須是布林值');
    if (!Number.isInteger(row.Birth_Season) || (row.Birth_Season as number) < 0) errors.push('Birth_Season: 必須是非負整數');
    if (!Number.isInteger(row.Unveil_Season)) {
        errors.push('Unveil_Season: 必須是整數');
    } else if (Number.isInteger(row.Birth_Season) && row.Unveil_Season !== (row.Birth_Season as number) + UNVEIL_DELAY_SEASONS) {
        errors.push(`Unveil_Season: 必須等於 Birth_Season + ${UNVEIL_DELAY_SEASONS}`);
    }
    return errors;
}

/**
 * 結緣紀錄序列化：會話與子嗣打包成一段 JSON 字串。
 * 寫入前先驗證，避免壞資料進存檔。
 */
export function serializeBreedingRecords(session: BreedingSessionRecord, children: readonly ChildRecord[]): string {
    const sessionErrors = validateBreedingSession(session);
    if (sessionErrors.length > 0) throw new Error(`[BreedingRecordSchema] 會話格式錯誤：${sessionErrors.join('；')}`);
    children.forEach((child, index) => {
        const errors = validateChildRecord(child);
        if (errors.length > 0) throw new Error(`[BreedingRecordSchema] 子嗣 #${index} 格式錯誤：${errors.join('；')}`);
    });
    return JSON.stringify({ Breeding_Session: session, Children: children });
}

/** 讀回序列化字串，驗證後回傳；格式錯誤時丟錯，不回傳半套資料 */
export function parseBreedingRecords(json: string): { session: BreedingSessionRecord; children: ChildRecord[] } {
    const raw = JSON.parse(json) as { Breeding_Session?: Partial<BreedingSessionRecord>; Children?: Partial<ChildRecord>[] };
    const sessionErrors = validateBreedingSession(raw.Breeding_Session ?? {});
    if (sessionErrors.length > 0) throw new Error(`[BreedingRecordSchema] 會話格式錯誤：${sessionErrors.join('；')}`);
    if (!Array.isArray(raw.Children)) throw new Error('[BreedingRecordSchema] Children 必須是陣列');
    raw.Children.forEach((child, index) => {
        const errors = validateChildRecord(child);
        if (errors.length > 0) throw new Error(`[BreedingRecordSchema] 子嗣 #${index} 格式錯誤：${errors.join('；')}`);
    });
    return { session: raw.Breeding_Session as BreedingSessionRecord, children: raw.Children as ChildRecord[] };
}
