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
import type { HallBoardKey } from './HallMissionBoard';
import { judgeHallMissionSuccess } from './HallMissionDispatch';

export interface HallAutoAssignCandidate {
    generalId: string;
    power: number;
}

export type HallAssignOutcome = 'success' | 'failure';

export interface HallAutoAssignRecord {
    taskId: string;
    generalId: string;
    assignedAt: string;
    /** 結算結果；尚未結算時缺省。由呼叫端依戰鬥結果傳入，季結由 settleOpenAssignsForSeason 推算。 */
    outcome?: HallAssignOutcome;
    settledAt?: string;
    /** 任務難度與任務牆，委任時一併記下，季結自動結算要用；舊紀錄可能缺省（缺省難度視為失敗）。 */
    difficulty?: string;
    board?: HallBoardKey;
}

/** 委任時用到的任務欄位：難度與任務牆為選填，缺省時季結依未知難度判定。 */
export type HallAutoAssignTaskInput = Readonly<HallTaskIntelInput & { taskId: string; Difficulty?: string; board?: HallBoardKey }>;

export type HallAutoAssignResult =
    | { ok: true; record: HallAutoAssignRecord }
    | { ok: false; reason: 'not-enabled' | 'no-candidate' | 'task-already-assigned' };

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

/**
 * 委任一個任務；未開啟委任、同一任務已有未結算委任、或沒有可選武將時拒絕，不產生紀錄。
 * 候選武將若已在其他未結算的委任上，視為忙碌，不列入選將（PM 裁定）。
 */
export function autoAssignHallTask(
    task: HallAutoAssignTaskInput,
    candidates: readonly HallAutoAssignCandidate[],
    assignedAt: string,
    log: readonly HallAutoAssignRecord[] = [],
): HallAutoAssignResult {
    if (!isAutoAssignEnabled(task)) return { ok: false, reason: 'not-enabled' };
    if (log.some(record => record.taskId === task.taskId && record.outcome === undefined)) {
        return { ok: false, reason: 'task-already-assigned' };
    }
    const busy = new Set(log.filter(record => record.outcome === undefined).map(record => record.generalId));
    const generalId = pickAutoAssignGeneral(candidates.filter(candidate => !busy.has(candidate.generalId)));
    if (generalId === null) return { ok: false, reason: 'no-candidate' };
    const record: HallAutoAssignRecord = { taskId: task.taskId, generalId, assignedAt };
    if (typeof task.Difficulty === 'string') record.difficulty = task.Difficulty;
    if (task.board !== undefined) record.board = task.board;
    return { ok: true, record };
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

export interface HallSeasonSettleResult {
    log: HallAutoAssignRecord[];
    /** 本次新結算的紀錄：難度與任務牆（可能缺省）與成敗，供呼叫端入帳官職經驗。 */
    settled: { difficulty?: string; board?: HallBoardKey; success: boolean }[];
}

/**
 * 季結自動結算：所有未結算的委任依武將戰力判定成敗（比照派遣即結算的門檻），釋放武將。
 * powerOf 回傳武將戰力；武將已不在名冊（陣亡或離開）時呼叫端應回傳 0，判為失敗。
 * 回傳新陣列，不改動輸入；已結算的紀錄原樣保留。
 */
export function settleOpenAssignsForSeason(
    log: readonly HallAutoAssignRecord[],
    powerOf: (generalId: string) => number,
    settledAt: string,
): HallSeasonSettleResult {
    const settled: HallSeasonSettleResult['settled'] = [];
    const next = log.map((record): HallAutoAssignRecord => {
        if (record.outcome !== undefined) return { ...record };
        const success = judgeHallMissionSuccess(record.difficulty ?? '', powerOf(record.generalId));
        settled.push({ difficulty: record.difficulty, board: record.board, success });
        return { ...record, outcome: success ? 'success' : 'failure', settledAt };
    });
    return { log: next, settled };
}
