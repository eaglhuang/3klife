// @spec-source → 新手開場規格書 §4 分鏡 4（時空震盪與旋渦）、§9 演出清單（漩渦吸入、白閃轉場、轉蛋出貨）；WBS OPEN-04
/**
 * VortexTransition — 漩渦吸入與白閃轉場的階段時序（純邏輯，不依賴 cc）。
 *
 * 順序：白點 → 擴散成漩渦 → 舊畫面被吸入 → 白閃 → 轉蛋盤由遠至近飛出。
 * 本檔只回答「現在是哪一階段、這階段進度多少」，畫面層每幀讀取後自行套用粒子與貼圖。
 *
 * 暫定：每段時長為佔位值，待演出定稿後調整；特效貼圖與粒子由畫面層依 cocos 資源決定。
 *
 * Unity 對照：像一條 Timeline，每個 Clip 有固定長度；播放頭位置決定現在顯示哪個 Clip 的進度。
 */

export type VortexPhase = 'dot' | 'spread' | 'suck-in' | 'white-flash' | 'wheel-fly-out';

export interface VortexPhaseStep {
    phase: VortexPhase;
    /** 本階段時長（毫秒，暫定） */
    durationMs: number;
}

export interface VortexPhaseState {
    /** 播放完畢後為 null */
    phase: VortexPhase | null;
    /** 本階段進度 0–1；播放完畢時為 1 */
    progress: number;
}

export const VORTEX_TRANSITION_STEPS: readonly VortexPhaseStep[] = Object.freeze([
    { phase: 'dot', durationMs: 400 },
    { phase: 'spread', durationMs: 900 },
    { phase: 'suck-in', durationMs: 1200 },
    { phase: 'white-flash', durationMs: 300 },
    { phase: 'wheel-fly-out', durationMs: 900 },
]);

export function vortexTransitionTotalMs(steps: readonly VortexPhaseStep[] = VORTEX_TRANSITION_STEPS): number {
    return steps.reduce((sum, step) => sum + step.durationMs, 0);
}

/** 依已經過的毫秒數回傳目前階段與進度；負數視為 0，超過總長視為播完。 */
export function vortexPhaseAt(elapsedMs: number, steps: readonly VortexPhaseStep[] = VORTEX_TRANSITION_STEPS): VortexPhaseState {
    let remaining = Math.max(0, elapsedMs);
    for (const step of steps) {
        if (remaining < step.durationMs) {
            return { phase: step.phase, progress: remaining / step.durationMs };
        }
        remaining -= step.durationMs;
    }
    return { phase: null, progress: 1 };
}
