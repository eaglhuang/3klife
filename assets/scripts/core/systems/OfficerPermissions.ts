// @spec-source → 官職系統.md（F-2 階位表、§權限快照）；WBS OFC-04
/**
 * OfficerPermissions — 官職權限快照（純邏輯，不依賴 cc）
 *
 * 大廳、領地治理、世界沙盤與他國 AI 只能讀這份唯讀快照取得權限，
 * 不直接碰 OfficerState，所以權限規則只有一個出口。
 * 快照是凍結的副本：改它不會影響官職狀態。
 *
 * Unity 對照：像把 PlayerRank 的權限算成一個 readonly struct 再傳給 UI，
 * UI 拿到的是 struct 副本，改欄位也不會回寫到 ScriptableObject。
 */
import { officerUnlocksOf, normalizeOfficerSnapshot, type OfficerUnlocks } from './OfficerSnapshot';
import { toOfficerSnapshot, type OfficerState } from './OfficerState';

export interface OfficerPermissions extends OfficerUnlocks {
    /** 累積官職經驗（唯讀） */
    readonly officerExp: number;
    /** 已解鎖的階位（由低到高，唯讀） */
    readonly unlockHistory: readonly number[];
}

/** 由官職狀態算出唯讀權限快照；回傳值已凍結，陣列也是副本。 */
export function officerPermissionsOf(state: OfficerState): Readonly<OfficerPermissions> {
    const unlocks = officerUnlocksOf(normalizeOfficerSnapshot(toOfficerSnapshot(state)));
    return Object.freeze({
        ...unlocks,
        officerExp: state.officerExp,
        unlockHistory: Object.freeze([...state.unlockHistory]),
    });
}
