// @spec-source → 大廳系統 F-5（AI 委任與委任回看紀錄）；WBS HALL-05；PROG-2-0479
/**
 * HallAutoAssign — 委任流程與委任回看紀錄（純邏輯，不依賴 cc）。
 *
 * - 只有任務 AI_Assign_Enabled 為 true 才能委任（判斷沿用 HallTaskIntel.isAutoAssignEnabled）。
 * - AI 選將：戰力最高者優先，同分取 generalId 字典序較小者（暫定，規格未寫選將權重）。
 * - 委任產生一筆紀錄，只記錄「誰、何時、接哪個任務」；結算結果由後續系統寫入，這裡不做。
 * - 紀錄不可變：append 回傳新陣列，list 回傳副本，依新到舊排序。
 *
 * Unity 對照：像一個 Service，輸入任務與候選清單，輸出結果與新的紀錄列表，不直接改任何狀態。
 */
import { isAutoAssignEnabled, HallTaskIntelInput } from './HallTaskIntel';

export interface HallAutoAssignCandidate {
    generalId: string;
    power: number;
}

export type HallAssignOutcome = 'success' | 'failure';

export interface HallAutoAssignRecord {
    taskId: string;
    generalId: string;
    assignedAt: string;
    /** 結算結果；尚未結算時缺省。由呼叫端依戰鬥結果傳入，本模組不推算。 */
    outcome?: HallAssignOutcome;
    settledAt?: string;
}

export type HallAutoAssignResult =
    | { ok: true; record: HallAutoAssignRecord }
    | { ok: false; reason: 'not-enabled' | 'no-candidate' };

/** 選將：忽略非有限戰力；戰力高者優先，同分取 generalId 字典序較小者；沒有候選回傳 null。 */
export function pickAutoAssignGeneral(candidates: readonly HallAutoAssignCandidate[]): string | null {
    let best: HallAutoAssignCandidate | null = null;
    for (const candidate of candidates) {
        if (!Number.isFinite(candidate.power)) continue;
        if (
            best === null ||
            candidate.power > best.power ||
            (candidate.power === best.power && candidate.generalId < best.generalId)
        ) {
            best = candidate;
        }
    }
    return best ? best.generalId : null;
}

/** 委任一個任務；未開啟委任或沒有可選武將時拒絕，不產生紀錄。 */
export function autoAssignHallTask(
    task: Readonly<HallTaskIntelInput & { taskId: string }>,
    candidates: readonly HallAutoAssignCandidate[],
    assignedAt: string,
): HallAutoAssignResult {
    if (!isAutoAssignEnabled(task)) return { ok: false, reason: 'not-enabled' };
    const generalId = pickAutoAssignGeneral(candidates);
    if (generalId === null) return { ok: false, reason: 'no-candidate' };
    return { ok: true, record: { taskId: task.taskId, generalId, assignedAt } };
}

/** 追加一筆委任紀錄；回傳新陣列，不改動輸入。 */
export function appendAssignRecord(
    log: readonly HallAutoAssignRecord[],
    record: Readonly<HallAutoAssignRecord>,
): HallAutoAssignRecord[] {
    return [...log, { ...record }];
}

/** 回看委任紀錄，新到舊；taskId 缺省時回傳全部。回傳副本。 */
export function listAssignRecords(
    log: readonly HallAutoAssignRecord[],
    taskId?: string,
): HallAutoAssignRecord[] {
    const matched = taskId === undefined ? log : log.filter(record => record.taskId === taskId);
    return matched.slice().reverse().map(record => ({ ...record }));
}

export type HallAssignSettleResult =
    | { ok: true; log: HallAutoAssignRecord[] }
    | { ok: false; reason: 'no-open-record' };

/** 結算同一任務最新一筆未結算的委任紀錄；沒有未結算紀錄時拒絕。回傳新陣列，不改動輸入。 */
export function settleLatestAssign(
    log: readonly HallAutoAssignRecord[],
    taskId: string,
    outcome: HallAssignOutcome,
    settledAt: string,
): HallAssignSettleResult {
    let target = -1;
    for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].taskId === taskId && log[i].outcome === undefined) {
            target = i;
            break;
        }
    }
    if (target < 0) return { ok: false, reason: 'no-open-record' };
    const next = log.map((record, i) => (i === target ? { ...record, outcome, settledAt } : { ...record }));
    return { ok: true, log: next };
}
