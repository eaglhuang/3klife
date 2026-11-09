// @spec-source → 戰法場景規格書.md (doc_spec_0039) B-1、B-2；WBS SCN-04；PROG-2-2103
/**
 * HallSceneGambit — 軍事任務帶來的場景戰法（純邏輯，不依賴 cc）。
 *
 * 接取帶 Scene_Gambit 的軍事任務且成功後，記下一筆待發動；進入下一場戰鬥時判定：
 * - INT 或情報未達門檻：本場不發動，保留到下一場（玩家可換主將或累積情報）。
 * - 達門檻：擲成功率。不論成敗都用掉這一筆。
 *
 * Unity 對照：像一個 ScriptableObject 查表後回傳判定結果的 static 工具，存取與 UI 都在外面。
 */

import type { BattleTactic } from '../config/Constants';
import { sceneGambitChanceFor, sceneGambitGateOf } from './SceneGambitRules';

export interface PendingSceneGambit {
    taskId: string;
    tactic: BattleTactic;
    /** 玩家在出征編制取消勾選：開戰不判定、保留到下一場。接到新任務會換成新的一筆，自動恢復勾選 */
    disarmed?: boolean;
}

export type SceneGambitOutcome =
    | { kind: 'triggered'; tactic: BattleTactic; rate: number }
    | { kind: 'failed'; tactic: BattleTactic; rate: number }
    | { kind: 'blocked'; tactic: BattleTactic; reason: 'int' | 'intel'; current: number; required: number };

/** 任務資料的 Scene_Gambit 是否為有門檻定義的場景戰法 */
export function isSceneGambitTactic(value: unknown): value is BattleTactic {
    return typeof value === 'string' && sceneGambitGateOf(value as BattleTactic) !== null;
}

/** 任務帶的場景戰法；沒有或資料無效時回傳 null */
export function pendingSceneGambitOfTask(task: { Task_ID: string; Scene_Gambit?: string }): PendingSceneGambit | null {
    return isSceneGambitTactic(task.Scene_Gambit) ? { taskId: task.Task_ID, tactic: task.Scene_Gambit } : null;
}

export function normalizePendingSceneGambit(raw: unknown): PendingSceneGambit | null {
    const value = raw as Partial<PendingSceneGambit> | null | undefined;
    if (!value || typeof value.taskId !== 'string' || value.taskId.length === 0) return null;
    if (!isSceneGambitTactic(value.tactic)) return null;
    const pending: PendingSceneGambit = { taskId: value.taskId, tactic: value.tactic };
    if (value.disarmed === true) pending.disarmed = true;
    return pending;
}

/** roll 為 [0,1) 亂數，小於成功率即發動 */
export function resolveSceneGambit(tactic: BattleTactic, intelligence: number, intel: number, roll: number): SceneGambitOutcome {
    const gate = sceneGambitGateOf(tactic);
    if (gate && !(intelligence >= gate.intThreshold)) {
        return { kind: 'blocked', tactic, reason: 'int', current: Math.floor(intelligence), required: gate.intThreshold };
    }
    if (gate && !(intel >= gate.intelThreshold)) {
        return { kind: 'blocked', tactic, reason: 'intel', current: Math.floor(intel), required: gate.intelThreshold };
    }
    const rate = sceneGambitChanceFor(tactic, intelligence, intel);
    return roll < rate ? { kind: 'triggered', tactic, rate } : { kind: 'failed', tactic, rate };
}
