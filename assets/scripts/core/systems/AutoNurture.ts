/**
 * AutoNurture — 自動培育（NUR-14，純邏輯，不依賴 cc）
 *
 * PM 暫定（2026-10-14）：
 * - 解鎖：主線第一次通過培育季後解鎖。
 * - 消耗：每次自動培育消耗 1 張自動培育券，執行一整季。
 * - 排程：沿用玩家上一次的手動排程；沒有排程時平均分配到最低屬性。
 * 規格（shard-a / shard-b F-5）：獲取量 ×0.7、教官 TP 加成 ×0.5、評級上限 A、不觸發事件。
 *
 * Unity 對照：像一個 AutoPlay 按鈕 — 先檢查解鎖與道具（CanStart），再用玩家存下的
 * 排程跑完整場 Coroutine，每一回合仍呼叫同一套 executeRound，只是帶了「自動模式」參數。
 */
import {
    NURTURE_TOTAL_ROUNDS,
    TRAINING_KINDS,
    capAutoRating,
    executeRound,
    type NurtureAction,
    type NurtureRoundLog,
    type NurtureSession,
    type TrainingKind,
} from './NurtureSystem';
import type { RandomSource } from './GeneralAging';

export { AUTO_NURTURE_RATING_CAP, AUTO_NURTURE_STAT_PENALTY, AUTO_NURTURE_TP_PENALTY, capAutoRating } from './NurtureSystem';

export const AUTO_NURTURE_TICKET_COST = 1;

export type AutoNurtureBlockReason = 'LOCKED' | 'NO_TICKET';

export interface AutoNurtureCheck {
    ok: boolean;
    blocked?: AutoNurtureBlockReason;
}

/** 解鎖：主線第一次通過培育季後即永久解鎖（旗標由存檔保存） */
export function isAutoNurtureUnlocked(mainlineNurtureSeasonClearedOnce: boolean): boolean {
    return mainlineNurtureSeasonClearedOnce === true;
}

/** 能否開始自動培育：先看解鎖，再看自動培育券是否足夠 */
export function canStartAutoNurture(unlocked: boolean, tickets: number): AutoNurtureCheck {
    if (!unlocked) return { ok: false, blocked: 'LOCKED' };
    if (!Number.isFinite(tickets) || tickets < AUTO_NURTURE_TICKET_COST) return { ok: false, blocked: 'NO_TICKET' };
    return { ok: true };
}

/** 扣除一次自動培育的券；券不足時回傳 null（不改輸入）。 */
export function consumeAutoNurtureTicket(tickets: number): number | null {
    const check = canStartAutoNurture(true, tickets);
    return check.ok ? tickets - AUTO_NURTURE_TICKET_COST : null;
}

/**
 * 解析自動培育排程（每回合一個動作，共 NURTURE_TOTAL_ROUNDS 筆）。
 * - 玩家手動排程長度正好 36 → 沿用。
 * - 否則平均分配到最低屬性：實力最低的屬性（同值全納入）依序輪流。
 */
export function resolveAutoSchedule(
    prowess: Record<TrainingKind, number>,
    manualSchedule?: readonly NurtureAction[],
): NurtureAction[] {
    if (manualSchedule && manualSchedule.length === NURTURE_TOTAL_ROUNDS) return [...manualSchedule];
    const minValue = Math.min(...TRAINING_KINDS.map((kind) => prowess[kind]));
    const lowest = TRAINING_KINDS.filter((kind) => prowess[kind] === minValue);
    return Array.from({ length: NURTURE_TOTAL_ROUNDS }, (_, index) => lowest[index % lowest.length]);
}

export interface AutoNurtureResult {
    session: NurtureSession;
    logs: NurtureRoundLog[];
}

/**
 * 跑完剩下的回合（自動模式，不改輸入）。
 * 排程第 i 筆對應第 i+1 回合；畢業評級的上限由呼叫端對 graduate 結果套用 capAutoRating。
 */
export function runAutoNurtureSeason(
    session: NurtureSession,
    schedule: readonly NurtureAction[],
    random: RandomSource,
): AutoNurtureResult {
    let current: NurtureSession = { ...session, auto: true };
    const logs: NurtureRoundLog[] = [];
    while (current.status === 'active') {
        const action = schedule[current.round];
        if (action === undefined) break;
        const step = executeRound(current, action, random, { auto: true });
        current = step.session;
        logs.push(step.log);
    }
    return { session: current, logs };
}
