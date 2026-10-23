// @spec-source → 結緣系統（配種）.md（Breeding_Session / Child 本機端紀錄）；WBS BRD-12
/**
 * BreedingBirthRecord — 結緣成功時產生本機端紀錄（BRD-12，純函式，不依賴 cc）
 *
 * 只在「結緣成功產生子嗣」時呼叫：把 BreedingResult 轉成 BreedingRecordSchema 的會話與子嗣紀錄，
 * 並用同一份 schema 驗證。不送 server。
 *
 * 暫定：
 * - Oracle_Hints 先給空陣列（名士批語的記錄格式待定）
 * - 子嗣 Status 沒有時寫 'Unknown'；Is_Daqi 取 fate.lateBloomer，沒有則 false
 *
 * Unity 對照：像 Breeding 命令執行完後的一次 Event 紀錄，只寫本機資料，驗證失敗就不寫入。
 */
import type { BreedingResult } from './BreedingSystem';
import type { OmenKind } from './SageRemarks';
import {
    validateBreedingSession,
    validateChildRecord,
    type BreedingSessionRecord,
    type ChildRecord,
} from '../models/BreedingRecordSchema';

export interface BreedingBirthRecord {
    session: BreedingSessionRecord;
    child: ChildRecord;
}

export interface BreedingBirthBuildResult {
    /** 驗證通過才有值 */
    record: BreedingBirthRecord | null;
    errors: string[];
}

/** 只有結緣成功（conceived 且有子嗣）才產生紀錄；其餘回傳 null，不算錯誤 */
export function buildBreedingBirthRecord(result: BreedingResult, omen: OmenKind): BreedingBirthBuildResult | null {
    const child = result.child;
    if (result.outcome !== 'conceived' || !child) return null;

    const session: BreedingSessionRecord = {
        Father_UID: result.father.id,
        Mother_UID: result.mother.id,
        Breeding_Mode: result.breedingMode ?? 'Standard',
        EP_Estimate: result.ep?.ep ?? 0,
        Oracle_Hints: [],
    };
    const childRecord: ChildRecord = {
        UID: child.id,
        Father_ID: result.father.id,
        Mother_ID: result.mother.id,
        Age: child.age ?? 0,
        Status: String(child.status ?? 'Unknown'),
        EP_Actual: result.ep?.ep ?? 0,
        Is_Daqi: Boolean((child as { fate?: { lateBloomer?: boolean } }).fate?.lateBloomer),
        Omen_Type: omen,
    };

    const errors = [...validateBreedingSession(session), ...validateChildRecord(childRecord)];
    return errors.length > 0 ? { record: null, errors } : { record: { session, child: childRecord }, errors: [] };
}
