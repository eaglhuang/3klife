// @spec-source → 主戰場UI規格補充_v3.md (doc_ui_0003) v3-2 控制列 Auto／x2／⚙；PROG-2-1867
/**
 * BattleTimeScale — 戰場 x2 加速
 *
 * 引擎每幀呼叫 director.tick(dt)；把 dt 乘上倍率，動畫、tween、scheduleOnce 與 Spine 會一起加速，
 * 戰鬥規則與回合結算不受影響。離開戰場時一定要還原成 1，否則大廳也會跟著快轉。
 *
 * Unity 對照：Time.timeScale = 2，離開場景前設回 1。
 */
import { director } from 'cc';

export interface Tickable {
    tick(dt: number): void;
}

const originals = new WeakMap<Tickable, (dt: number) => void>();
let currentScale = 1;
let userScale = 1;
let paused = false;

/** 暫停時不能用 0（setTimeScale 會把 0 當成不合法而還原成 1），改用極小值讓 tween 與 scheduleOnce 等同凍結 */
export const BATTLE_PAUSE_SCALE = 0.0001;

/** 把 target.tick 的 dt 乘上倍率；倍率 1（或不合法）時還原成原本的 tick */
export function setTimeScale(target: Tickable, scale: number): number {
    const next = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const original = originals.get(target);
    if (next === 1) {
        if (original) {
            target.tick = original;
            originals.delete(target);
        }
        return 1;
    }
    const base = original ?? target.tick;
    if (!original) originals.set(target, base);
    target.tick = (dt: number) => base.call(target, dt * next);
    return next;
}

function applyBattleScale(): void {
    currentScale = setTimeScale(director as unknown as Tickable, paused ? BATTLE_PAUSE_SCALE : userScale);
}

/** 戰場加速：作用在引擎 director 上；暫停中只記下倍率，恢復時才生效 */
export function setBattleTimeScale(scale: number): void {
    userScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    applyBattleScale();
}

/**
 * 暫停／恢復戰場（奧義 cut-in 播放期間，Issue #2139）。
 * 動畫、tween、scheduleOnce 與 Spine 一起凍結，恢復後回到玩家原本選的倍率；
 * 疊層自己的時間請用真實時鐘，不要吃 dt。
 */
export function setBattlePaused(next: boolean): void {
    paused = next;
    applyBattleScale();
}

export function isBattlePaused(): boolean {
    return paused;
}

/** 玩家選的倍率（不受暫停影響） */
export function battleTimeScale(): number {
    return userScale;
}
