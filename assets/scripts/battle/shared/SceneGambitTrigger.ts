/**
 * 場景戰法發動判定（WBS v7 SCN-03，PROG-2-0596）
 *
 * 成功率 P = min(95%, 50% + (INT - INT門檻) × 2%)。
 * INT 未達門檻或情報未達門檻時不可發動（成功率為 0）。
 * 門檻數值由場景表（SCN-01）提供，這裡以參數傳入。
 */

export const SCENE_GAMBIT_BASE_RATE = 0.5;
export const SCENE_GAMBIT_RATE_PER_POINT = 0.02;
export const SCENE_GAMBIT_MAX_RATE = 0.95;

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
