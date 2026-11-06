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

/** 戰場加速：作用在引擎 director 上 */
export function setBattleTimeScale(scale: number): void {
    currentScale = setTimeScale(director as unknown as Tickable, scale);
}

export function battleTimeScale(): number {
    return currentScale;
}
