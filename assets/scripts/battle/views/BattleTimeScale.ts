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
let userScale = 1;
let paused = false;
// QA 專用（PROG-2-9405）：與玩家 x2 倍率相乘、與奧義暫停各自獨立；預設 1／false = 正式流程完全不受影響
let qaMultiplier = 1;
let qaFrozen = false;

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
    const frozen = paused || qaFrozen;
    setTimeScale(director as unknown as Tickable, frozen ? BATTLE_PAUSE_SCALE : userScale * qaMultiplier);
}

/** QA 慢動作倍率（0.05～1，呼叫端已夾值）；離開戰場呼叫 setBattleTimeScale(1) 也不會清掉，QA 倍率全程有效 */
export function setQaTimeMultiplier(multiplier: number): void {
    qaMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
    applyBattleScale();
}

export function qaTimeMultiplier(): number {
    return qaMultiplier;
}

/** QA 定格／解除定格：和奧義暫停同機制（dt 乘極小值），畫面仍會照常繪製 */
export function setQaTimeFrozen(next: boolean): void {
    qaFrozen = next;
    applyBattleScale();
}

export function isQaTimeFrozen(): boolean {
    return qaFrozen;
}

/** 繞過倍率直接推進 target 一個 dt（QA step 用）；沒掛倍率時等同原本的 tick */
export function tickUnscaled(target: Tickable, dt: number): void {
    (originals.get(target) ?? target.tick).call(target, dt);
}

/** 對引擎 director 推進 dt 秒清單（不吃倍率與定格）；清單由 QaTimeScale.planStepSlices 算出 */
export function stepDirector(slices: readonly number[]): void {
    for (const dt of slices) tickUnscaled(director as unknown as Tickable, dt);
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
