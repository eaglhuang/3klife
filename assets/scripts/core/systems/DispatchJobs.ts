// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §E-3、§F-2、§I（General_Dispatch）；PROG-2-1178（JRN-03）
/**
 * DispatchJobs — 派遣任務狀態：派遣、到期結算、冷卻（純邏輯，不依賴 cc）。
 *
 * - 派遣當下以 §F-2 評分快照分數，結算時依分數對到品質區間，不受之後武將變動影響（確定性）。
 * - 高風險任務不得自動代勞（§F-2 規則 3），玩家手動派遣才放行。
 * - 獎勵：品質決定結果區間（§F-2 規則 1），結構化獎勵依品質倍率發放（PROG-2-1182，暫定）；rewardText 為顯示用基準值。
 * - 冷卻時長、已完成紀錄上限、各品質日誌重要度為暫定。
 *
 * Unity 對照：像 Idle Dispatch Manager 的資料層，Update 不跑，登入時用時間差一次結算。
 */

import { canAutoDispatch, dispatchQualityOf, getDispatchScore, type DispatchGeneral, type DispatchJob, type DispatchQuality } from './DispatchQuality';

/** 暫定：完成後同一武將 1 小時內不可再派遣 */
export const DISPATCH_COOLDOWN_MS = 60 * 60 * 1000;
/** 暫定：已完成紀錄只留最近 20 筆 */
export const DISPATCH_COMPLETED_LIMIT = 20;
/** 暫定：派遣完成寫日誌時的重要度 */
export const DISPATCH_JOURNAL_PRIORITY: Readonly<Record<DispatchQuality, number>> = { POOR: 40, NORMAL: 50, GOOD: 60, EXCELLENT: 75 };

/** 派遣獎勵可入帳的資源：糧草、金幣（交呼叫端錢包）、名聲 */
export type DispatchRewardResource = 'food' | 'gold' | 'fame';

export interface DispatchReward {
    resource: DispatchRewardResource;
    amount: number;
}

/** 暫定：完成品質對獎勵的倍率 */
export const DISPATCH_REWARD_MULTIPLIER: Readonly<Record<DispatchQuality, number>> = { POOR: 0.5, NORMAL: 1, GOOD: 1.2, EXCELLENT: 1.5 };

export interface DispatchJobDef extends DispatchJob {
    durationMs: number;
    rewardText: string;
    /** 結構化獎勵（PROG-2-1182）；沒有時只寫日誌不發獎 */
    reward?: DispatchReward;
}

/** 依完成品質算實發數量（向下取整，最少 0） */
export function dispatchRewardAmount(reward: Readonly<DispatchReward>, quality: DispatchQuality): number {
    if (!Number.isFinite(reward.amount) || reward.amount <= 0) return 0;
    return Math.floor(reward.amount * DISPATCH_REWARD_MULTIPLIER[quality]);
}

export interface ActiveDispatchJob {
    jobId: string;
    name: string;
    generalId: string;
    startedAtMs: number;
    dueAtMs: number;
    score: number;
    rewardText: string;
}

export interface CompletedDispatchJob {
    jobId: string;
    name: string;
    generalId: string;
    completedAtMs: number;
    score: number;
    quality: DispatchQuality;
    rewardText: string;
}

export interface DispatchState {
    active: ActiveDispatchJob[];
    completed: CompletedDispatchJob[];
    /** 武將 id → 冷卻結束時間（毫秒） */
    cooldowns: Record<string, number>;
}

export const EMPTY_DISPATCH_STATE: Readonly<DispatchState> = { active: [], completed: [], cooldowns: {} };

export type DispatchStartReason = 'high-risk-auto' | 'general-busy' | 'general-cooldown' | 'job-active' | 'invalid-duration';

export interface DispatchStartResult {
    ok: boolean;
    reason?: DispatchStartReason;
    state: DispatchState;
}

function cloneState(state: Readonly<DispatchState>): DispatchState {
    return {
        active: state.active.map((j) => ({ ...j })),
        completed: state.completed.map((j) => ({ ...j })),
        cooldowns: { ...state.cooldowns },
    };
}

export function startDispatch(
    state: Readonly<DispatchState>,
    job: Readonly<DispatchJobDef>,
    generalId: string,
    general: Readonly<DispatchGeneral>,
    nowMs: number,
    auto = false,
): DispatchStartResult {
    const reject = (reason: DispatchStartReason): DispatchStartResult => ({ ok: false, reason, state: cloneState(state) });
    if (!Number.isFinite(job.durationMs) || job.durationMs <= 0) return reject('invalid-duration');
    if (auto && !canAutoDispatch(job)) return reject('high-risk-auto');
    if (state.active.some((j) => j.jobId === job.jobId)) return reject('job-active');
    if (state.active.some((j) => j.generalId === generalId)) return reject('general-busy');
    if ((state.cooldowns[generalId] ?? 0) > nowMs) return reject('general-cooldown');
    const next = cloneState(state);
    next.active.push({
        jobId: job.jobId,
        name: job.name,
        generalId,
        startedAtMs: nowMs,
        dueAtMs: nowMs + job.durationMs,
        score: getDispatchScore(job, general),
        rewardText: job.rewardText,
    });
    return { ok: true, state: next };
}

/** 到期（dueAtMs ≤ now）的任務轉為已完成，依到期先後排序；武將進入冷卻。 */
export function settleDueDispatches(state: Readonly<DispatchState>, nowMs: number): { state: DispatchState; completed: CompletedDispatchJob[] } {
    const next = cloneState(state);
    for (const [id, until] of Object.entries(next.cooldowns)) {
        if (until <= nowMs) delete next.cooldowns[id];
    }
    const due = next.active.filter((j) => j.dueAtMs <= nowMs).sort((a, b) => a.dueAtMs - b.dueAtMs);
    if (due.length === 0) return { state: next, completed: [] };
    const completed = due.map((j): CompletedDispatchJob => ({
        jobId: j.jobId,
        name: j.name,
        generalId: j.generalId,
        completedAtMs: j.dueAtMs,
        score: j.score,
        quality: dispatchQualityOf(j.score),
        rewardText: j.rewardText,
    }));
    next.active = next.active.filter((j) => j.dueAtMs > nowMs);
    next.completed = [...next.completed, ...completed].slice(-DISPATCH_COMPLETED_LIMIT);
    for (const job of completed) {
        const until = job.completedAtMs + DISPATCH_COOLDOWN_MS;
        if (until > nowMs) next.cooldowns[job.generalId] = until;
    }
    return { state: next, completed };
}

const QUALITIES: readonly DispatchQuality[] = ['POOR', 'NORMAL', 'GOOD', 'EXCELLENT'];

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

export function normalizeDispatchState(raw: unknown): DispatchState {
    if (!raw || typeof raw !== 'object') return cloneState(EMPTY_DISPATCH_STATE);
    const value = raw as Partial<Record<keyof DispatchState, unknown>>;
    const active = Array.isArray(value.active)
        ? value.active.filter((j): j is ActiveDispatchJob => !!j && isString(j.jobId) && typeof j.name === 'string' && isString(j.generalId)
            && isFiniteNumber(j.startedAtMs) && isFiniteNumber(j.dueAtMs) && isFiniteNumber(j.score) && typeof j.rewardText === 'string')
            .map((j) => ({ jobId: j.jobId, name: j.name, generalId: j.generalId, startedAtMs: j.startedAtMs, dueAtMs: j.dueAtMs, score: j.score, rewardText: j.rewardText }))
        : [];
    const completed = Array.isArray(value.completed)
        ? value.completed.filter((j): j is CompletedDispatchJob => !!j && isString(j.jobId) && typeof j.name === 'string' && isString(j.generalId)
            && isFiniteNumber(j.completedAtMs) && isFiniteNumber(j.score) && QUALITIES.includes(j.quality) && typeof j.rewardText === 'string')
            .map((j) => ({ jobId: j.jobId, name: j.name, generalId: j.generalId, completedAtMs: j.completedAtMs, score: j.score, quality: j.quality, rewardText: j.rewardText }))
            .slice(-DISPATCH_COMPLETED_LIMIT)
        : [];
    const cooldowns: Record<string, number> = {};
    if (value.cooldowns && typeof value.cooldowns === 'object') {
        for (const [id, until] of Object.entries(value.cooldowns as Record<string, unknown>)) {
            if (isString(id) && isFiniteNumber(until)) cooldowns[id] = until;
        }
    }
    return { active, completed, cooldowns };
}
