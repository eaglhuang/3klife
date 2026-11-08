// @spec-source → 英靈世家系統 MCQ Q51 幼兒低效內政、Q52 戰場單場覺醒上限（SPI-13，PROG-2-1930）
/**
 * SpiritMcqRules — 兩條 MCQ 裁決的純規則（不依賴 cc）。
 *
 * - Q51：未滿 15 歲的幼兒可被指派，但只能做「低效內政」；成年才能做一般工作。
 * - Q52：每場戰鬥最多覺醒 1 個潛藏因子，避免故意挨打刷滿因子格。
 *
 * 暫定：哪些內政算低效、效率折扣多少規格未給，由呼叫端傳入；治理選角池與戰場覺醒接線另卡。
 * Q32（姓氏匹配保證戰法提示，PT-20%）的 PT 意義待確認，本卡不做。
 * Unity 對照：像每場戰鬥開始時重置的計數器，加上一個依年齡切換的指派白名單。
 */

export const CHILD_ASSIGNMENT_AGE = 15;
export const MAX_BATTLE_AWAKENINGS = 1;

export type ChildAssignmentResult =
    | { ok: true; efficiency: number }
    | { ok: false; reason: 'CHILD_ONLY_LOW_EFFICIENCY' };

/** 指派內政：成年照常（效率 1）；未滿 15 歲只能做低效內政，效率用折扣倍率（夾在 0~1）。 */
export function assignDomesticTask(age: number, taskIsLowEfficiency: boolean, childEfficiency: number): ChildAssignmentResult {
    if (age >= CHILD_ASSIGNMENT_AGE) return { ok: true, efficiency: 1 };
    if (!taskIsLowEfficiency) return { ok: false, reason: 'CHILD_ONLY_LOW_EFFICIENCY' };
    const e = Number.isFinite(childEfficiency) ? Math.max(0, Math.min(1, childEfficiency)) : 0;
    return { ok: true, efficiency: e };
}

/** Q51 暫定：幼兒可做的低效內政（規格未列，暫取農耕、商業這類輕活；PROG-2-2090） */
export const CHILD_LOW_EFFICIENCY_TASKS: readonly string[] = ['farming', 'commerce'];
/** Q51 暫定：幼兒做低效內政的效率倍率 */
export const CHILD_TASK_EFFICIENCY = 0.5;

/** 依年齡與內政任務判斷能否指派與效率；缺年齡的舊資料視為成年。 */
export function domesticAssignmentFor(age: number | undefined, task: string): ChildAssignmentResult {
    if (typeof age !== 'number' || !Number.isFinite(age)) return { ok: true, efficiency: 1 };
    return assignDomesticTask(age, CHILD_LOW_EFFICIENCY_TASKS.includes(task), CHILD_TASK_EFFICIENCY);
}

/** 單場戰鬥的覺醒計數；每場開戰時重新建立。 */
export interface BattleAwakeningBudget {
    used: number;
}

export function createBattleAwakeningBudget(): BattleAwakeningBudget {
    return { used: 0 };
}

/**
 * 結算資料層的 Q52 額度檢查（PROG-2-1991）：本場已覺醒 awakenedSoFar 個，還能不能再覺醒一個。
 * 只管「單場 ≤ 1」；規格括號的「同一個戰法只能覺醒一次」要戰鬥內的戰法呼叫點，戰鬥模組解鎖後再接。
 */
export function checkAwakeningQuota(awakenedSoFar: number, max: number = MAX_BATTLE_AWAKENINGS): boolean {
    return awakenedSoFar < max;
}

/** 嘗試覺醒一個因子：本場還有額度就扣 1 並回 true，否則回 false。 */
export function tryConsumeBattleAwakening(budget: BattleAwakeningBudget): boolean {
    if (budget.used >= MAX_BATTLE_AWAKENINGS) return false;
    budget.used += 1;
    return true;
}
