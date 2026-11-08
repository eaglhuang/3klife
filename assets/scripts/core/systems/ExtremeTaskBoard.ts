// @spec-source → 裁決 2026-11-08 極限任務入口；極限任務掉落機率模型與獎勵權重分配規格書 (doc_spec_0415)（PROG-2-2101）
/**
 * ExtremeTaskBoard — 天下征鋒：每週挑戰次數、挑戰令、待領獎勵（純邏輯，不依賴 cc）。
 *
 * - 每週免費 3 次；用完後每張「極限挑戰令」換 1 次。
 * - 開戰就扣次數，輸了不退。通關才抽一次 rollExtremeTaskDrop，獎勵進待領清單。
 *
 * 暫定：每週一 00:00（UTC+8）刷新；BOSS 依週次輪替；挑戰令取得管道未定。
 * Unity 對照：像一個存在存檔裡的 Weekly Quota Model，戰鬥與發獎由 GameSession 串接。
 */
import type { ExtremeTaskDrop } from './ExtremeTaskDrop';

export const EXTREME_TASK_WEEKLY_ATTEMPTS = 3;
export const ITEM_EXTREME_CHALLENGE_ORDER = 'ITEM_EXTREME_CHALLENGE_ORDER';
/** 關卡資料在 encounters.json，標記 extreme: true；不進連環破主鏈 */
export const EXTREME_TASK_STAGE_IDS: readonly string[] = Object.freeze(['extreme-lu-bu', 'extreme-cao-cao', 'extreme-guan-yu']);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** 1970-01-01 是週四，往前 3 天對齊週一，再加 8 小時對齊 UTC+8 */
const WEEK_OFFSET_MS = (3 * 24 + 8) * 60 * 60 * 1000;

export interface ExtremeTaskState {
    weekIndex: number;
    freeUsed: number;
    /** 本週總開戰數，也用來區分每場的掉落序列 */
    attempts: number;
    /** 進行中的極限關卡；戰鬥結算後清空 */
    activeStageId: string | null;
    rewards: ExtremeTaskDrop[];
}

export type ExtremeTaskStartResult =
    | { ok: true; state: ExtremeTaskState; stageId: string; usedOrder: boolean }
    | { ok: false; reason: 'NO_ATTEMPTS' };

export function createExtremeTaskState(): ExtremeTaskState {
    return { weekIndex: -1, freeUsed: 0, attempts: 0, activeStageId: null, rewards: [] };
}

export function extremeWeekIndexOf(nowMs: number): number {
    return Math.floor((nowMs + WEEK_OFFSET_MS) / WEEK_MS);
}

export function extremeStageOfWeek(weekIndex: number): string {
    const count = EXTREME_TASK_STAGE_IDS.length;
    return EXTREME_TASK_STAGE_IDS[((weekIndex % count) + count) % count];
}

export function isExtremeStage(stageId: string | null | undefined): boolean {
    return typeof stageId === 'string' && EXTREME_TASK_STAGE_IDS.includes(stageId);
}

/** 跨週歸零次數；待領獎勵與進行中的關卡保留。 */
export function rolloverExtremeTask(state: Readonly<ExtremeTaskState>, nowMs: number): ExtremeTaskState {
    const weekIndex = extremeWeekIndexOf(nowMs);
    if (weekIndex === state.weekIndex) return { ...state, rewards: [...state.rewards] };
    return { ...state, weekIndex, freeUsed: 0, attempts: 0, rewards: [...state.rewards] };
}

export function extremeFreeAttemptsLeft(state: Readonly<ExtremeTaskState>, nowMs: number): number {
    return Math.max(0, EXTREME_TASK_WEEKLY_ATTEMPTS - rolloverExtremeTask(state, nowMs).freeUsed);
}

/** 開戰：先用免費次數，沒有才用挑戰令；都沒有就拒絕。不改輸入。 */
export function startExtremeTask(state: Readonly<ExtremeTaskState>, nowMs: number, orders: number): ExtremeTaskStartResult {
    const current = rolloverExtremeTask(state, nowMs);
    const usedOrder = current.freeUsed >= EXTREME_TASK_WEEKLY_ATTEMPTS;
    if (usedOrder && orders <= 0) return { ok: false, reason: 'NO_ATTEMPTS' };
    const stageId = extremeStageOfWeek(current.weekIndex);
    return {
        ok: true,
        stageId,
        usedOrder,
        state: { ...current, freeUsed: current.freeUsed + (usedOrder ? 0 : 1), attempts: current.attempts + 1, activeStageId: stageId },
    };
}

function normalizeDrop(value: unknown): ExtremeTaskDrop | null {
    if (typeof value !== 'object' || value === null) return null;
    const raw = value as { kind?: unknown; amount?: unknown; itemId?: unknown };
    if (raw.kind === 'gold' && typeof raw.amount === 'number' && Number.isFinite(raw.amount) && raw.amount > 0) {
        return { kind: 'gold', amount: Math.floor(raw.amount) };
    }
    if (raw.kind === 'item' && typeof raw.itemId === 'string' && raw.itemId.length > 0) {
        return { kind: 'item', itemId: raw.itemId, count: 1 };
    }
    return null;
}

/** 舊檔缺欄位或壞值時補成合法狀態。 */
export function normalizeExtremeTaskState(value: unknown): ExtremeTaskState {
    if (typeof value !== 'object' || value === null) return createExtremeTaskState();
    const raw = value as Partial<Record<keyof ExtremeTaskState, unknown>>;
    const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
    const rewards = Array.isArray(raw.rewards) ? raw.rewards.map(normalizeDrop).filter((d): d is ExtremeTaskDrop => d !== null) : [];
    return {
        weekIndex: typeof raw.weekIndex === 'number' && Number.isFinite(raw.weekIndex) ? Math.floor(raw.weekIndex) : -1,
        freeUsed: count(raw.freeUsed),
        attempts: count(raw.attempts),
        activeStageId: isExtremeStage(raw.activeStageId as string | null | undefined) ? (raw.activeStageId as string) : null,
        rewards,
    };
}
