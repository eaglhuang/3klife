// @spec-source → 戰法場景規格書.md (doc_spec_0039)；PROG-2-1429 依建檔紀錄補標出處
/**
 * 場景戰法發動判定（WBS v7 SCN-03，PROG-2-0596）
 *
 * 成功率 P = min(95%, 50% + (INT - INT門檻) × 2%)。
 * INT 未達門檻或情報未達門檻時不可發動（成功率為 0）。
 * 門檻數值可用參數傳入，或用 SCENE_GAMBIT_GATES 依戰法查表（PROG-2-1749）。
 */

import { BattleTactic } from '../config/Constants';

export const SCENE_GAMBIT_BASE_RATE = 0.5;
export const SCENE_GAMBIT_RATE_PER_POINT = 0.02;
export const SCENE_GAMBIT_MAX_RATE = 0.95;

/**
 * 六種場景戰法的發動門檻（規格 B-3，PROG-2-1749）。
 * 情報門檻只有森林埋伏（45）與夜襲（40）有定義，其餘場景規格未列，暫記 0（不設門檻）。
 */
export interface SceneGambitGate {
    sceneId: string;
    intThreshold: number;
    intelThreshold: number;
}

export const SCENE_GAMBIT_GATES: Readonly<Partial<Record<BattleTactic, SceneGambitGate>>> = Object.freeze({
    [BattleTactic.AmbushAttack]: { sceneId: 'SCENE_FOREST_AMBUSH', intThreshold: 75, intelThreshold: 45 },
    [BattleTactic.NightRaid]: { sceneId: 'SCENE_NIGHT_RAID', intThreshold: 70, intelThreshold: 40 },
    [BattleTactic.RockSlide]: { sceneId: 'SCENE_CANYON_ROCK', intThreshold: 65, intelThreshold: 0 },
    [BattleTactic.FloodAttack]: { sceneId: 'SCENE_FLOOD', intThreshold: 80, intelThreshold: 0 },
    [BattleTactic.FireAttack]: { sceneId: 'SCENE_FIRE_RAID', intThreshold: 75, intelThreshold: 0 },
    [BattleTactic.Siege]: { sceneId: 'SCENE_SIEGE', intThreshold: 60, intelThreshold: 0 },
});

/** 依戰法查門檻；一般戰鬥或未列場景回傳 null。 */
export function sceneGambitGateOf(tactic: BattleTactic): SceneGambitGate | null {
    const gate = SCENE_GAMBIT_GATES[tactic];
    return gate ? { ...gate } : null;
}

/** 依戰法查表後判定成功率；沒有門檻資料的戰法回傳 0。 */
export function sceneGambitChanceFor(tactic: BattleTactic, intelligence: number, intel: number): number {
    const gate = SCENE_GAMBIT_GATES[tactic];
    return gate ? canTriggerSceneGambit(intelligence, gate.intThreshold, intel, gate.intelThreshold) : 0;
}

/** INT 達門檻時的發動成功率；未達門檻回傳 0。 */
export function sceneGambitSuccessRate(intelligence: number, intThreshold: number): number {
    if (!(intelligence >= intThreshold)) return 0;
    const rate = SCENE_GAMBIT_BASE_RATE + (intelligence - intThreshold) * SCENE_GAMBIT_RATE_PER_POINT;
    return Math.min(SCENE_GAMBIT_MAX_RATE, rate);
}

/** INT 與情報都達門檻才可發動，回傳成功率；否則回傳 0。 */
export function canTriggerSceneGambit(
    intelligence: number,
    intThreshold: number,
    intel: number,
    intelThreshold: number,
): number {
    if (!(intel >= intelThreshold)) return 0;
    return sceneGambitSuccessRate(intelligence, intThreshold);
}
