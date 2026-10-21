// @spec-source → 領地治理系統.md §E 功能 2（武將指派）、§I Governance.Assignments / Max_Task_Slots；WBS v16.2 GOV-04（PROG-2-0970）
/**
 * GovernanceAssignment — 太守府內政任務的武將指派服務（純邏輯，不依賴 cc）。
 *
 * - 每個內政任務（農耕／商業／外交／軍備／偵查）是一個任務格，最多放一位武將。
 * - 同一武將不可同時在兩個任務格；已用格數不可超過 maxSlots。
 * - 所有函式都回傳新清單，不改輸入。
 *
 * Unity 對照：像一個 Inventory 介面，每個 Slot 只能放一個 Item，
 * 拖放前先檢查「這格空不空」與「這個 Item 是不是已經在別格」。
 */
import { DomesticTaskId, isDomesticTaskId } from './DomesticTasks';

/** 規格範例的 Max_Task_Slots，呼叫端未指定時使用。 */
export const DEFAULT_MAX_TASK_SLOTS = 5;

export interface GovernanceAssignment {
    task: DomesticTaskId;
    generalUid: string;
}

export type GovernanceRejectReason =
    | 'unknown-task'
    | 'invalid-general'
    | 'task-occupied'
    | 'general-already-assigned'
    | 'no-free-slot';

export interface GovernanceResult {
    ok: boolean;
    reason?: GovernanceRejectReason;
    assignments: GovernanceAssignment[];
}

function rejected(current: readonly GovernanceAssignment[], reason: GovernanceRejectReason): GovernanceResult {
    return { ok: false, reason, assignments: current.map(a => ({ ...a })) };
}

/** 把武將指派到內政任務格；任務格已有人、武將已在別格、或格數已滿時拒絕。 */
export function assignGovernanceGeneral(
    current: readonly GovernanceAssignment[],
    task: string,
    generalUid: string,
    maxSlots: number = DEFAULT_MAX_TASK_SLOTS,
): GovernanceResult {
    if (!isDomesticTaskId(task)) return rejected(current, 'unknown-task');
    if (typeof generalUid !== 'string' || generalUid.length === 0) return rejected(current, 'invalid-general');
    if (current.some(a => a.task === task)) return rejected(current, 'task-occupied');
    if (current.some(a => a.generalUid === generalUid)) return rejected(current, 'general-already-assigned');
    if (current.length >= maxSlots) return rejected(current, 'no-free-slot');
    return {
        ok: true,
        assignments: [...current.map(a => ({ ...a })), { task, generalUid }],
    };
}

/** 卸下任務格的武將；該格本來就是空的時，回傳原清單的副本（ok 仍為 true）。 */
export function removeGovernanceAssignment(current: readonly GovernanceAssignment[], task: DomesticTaskId): GovernanceResult {
    return {
        ok: true,
        assignments: current.filter(a => a.task !== task).map(a => ({ ...a })),
    };
}

/** 任務格是否已有人。 */
export function isGovernanceTaskOccupied(current: readonly GovernanceAssignment[], task: DomesticTaskId): boolean {
    return current.some(a => a.task === task);
}
