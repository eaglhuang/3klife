/**
 * SceneLightingController.ts — 場景日夜四季調色控制器（QLIFE-01 第 3.5 節）。
 * 純邏輯，不依賴 Cocos；對圖層的「乘色」透過 ILightingTintTarget 介面套用（Cocos 端見 SpriteTintTarget.ts）。
 *
 * 行為：
 *   - enter(quarter, slot)：進入場景，直接用當下時段算出階段並套用，無過場。
 *   - setSlot(slot)：生活時鐘自動換時段；換階段時前 15 秒把乘色與光源強度 lerp 到新值。
 *   - setSlot(slot, true)：右上角手動切時段，0.6 秒 lerp，不載入新圖。
 *   - setQuarter(quarter)：遊戲季度推進（1 春 2 夏 3 秋 4 冬），換季同步疊層並短 lerp。
 *   - update(dt)：每幀推進 lerp。
 * 遮罩換色 effect 與店家光源開關只留接口（IMaskRecolorEffect、IShopLightSwitch），本包不實作。
 */
import { phaseOfSlot, seasonOfQuarter } from './LightingPhase';
import { resolveLightingTarget } from './LightingTable';
import type { LightingPhaseId, LightingSeason, LightingTable, LightingTarget } from './LightingTable';
import type { OverlayLifecycle } from './OverlayLifecycle';

/** 對一個圖層（L0 天空、L1 底圖、L2 前景）乘色的薄層 */
export interface ILightingTintTarget {
    applyTint(r: number, g: number, b: number): void;
}

/** 光源圖集／星空等加色圖層：只吃強度 0～1 */
export interface ILightIntensityTarget {
    applyIntensity(intensity: number): void;
}

/** 接口（未實作）：樹冠／積雪遮罩換色 effect，依季節切參數 */
export interface IMaskRecolorEffect {
    setSeason(season: LightingSeason): void;
}

/** 接口（未實作）：店家光源依營業與深夜規則開關 */
export interface IShopLightSwitch {
    setDeepNight(deepNight: boolean, allowedTags: readonly string[]): void;
}

export interface SceneLightingOptions {
    tintTargets?: ILightingTintTarget[];
    lightTargets?: ILightIntensityTarget[];
    lifecycle?: OverlayLifecycle;
    maskEffect?: IMaskRecolorEffect;
    shopLights?: IShopLightSwitch;
}

export interface SceneLightingState {
    season: LightingSeason;
    slot: number;
    phase: LightingPhaseId;
    deepNight: boolean;
    /** 目前實際顯示的乘色（0～255 浮點）與光源強度 */
    current: LightingTarget;
    /** 轉場目標 */
    target: LightingTarget;
    transitioning: boolean;
}

function sameTarget(a: LightingTarget, b: LightingTarget): boolean {
    return a.r === b.r && a.g === b.g && a.b === b.b && a.intensity === b.intensity;
}

function lerpTarget(a: LightingTarget, b: LightingTarget, t: number): LightingTarget {
    return {
        r: a.r + (b.r - a.r) * t,
        g: a.g + (b.g - a.g) * t,
        b: a.b + (b.b - a.b) * t,
        intensity: a.intensity + (b.intensity - a.intensity) * t,
    };
}

export class SceneLightingController {
    private season: LightingSeason;
    private slot = 1;
    private phase: LightingPhaseId = 'day';
    private deepNight = false;
    private current: LightingTarget;
    private from: LightingTarget;
    private target: LightingTarget;
    private elapsed = 0;
    private duration = 0;
    private active = false;
    private entered = false;

    constructor(private readonly table: LightingTable, private readonly opts: SceneLightingOptions = {}) {
        this.season = table.seasons[0];
        this.current = resolveLightingTarget(table, 'day', this.season, false);
        this.from = this.current;
        this.target = this.current;
    }

    /** 進入場景：以當下季度與時段直接生成狀態，立即套用，不做過場 */
    enter(quarter: number, slot: number): void {
        this.season = seasonOfQuarter(this.table, quarter);
        this.resolveSlot(slot);
        this.current = this.target;
        this.from = this.target;
        this.active = false;
        this.entered = true;
        this.syncOverlays();
        this.opts.maskEffect?.setSeason(this.season);
        this.opts.shopLights?.setDeepNight(this.deepNight, this.table.deepNightLightTags);
        this.applyCurrent();
    }

    /** 換時段：自動輪替 15 秒 lerp；手動切換 0.6 秒 lerp。階段與季節沒變、目標值相同則不動 */
    setSlot(slot: number, manual = false): void {
        this.assertEntered();
        const wasDeep = this.deepNight;
        this.resolveSlot(slot);
        this.syncOverlays();
        if (wasDeep !== this.deepNight) this.opts.shopLights?.setDeepNight(this.deepNight, this.table.deepNightLightTags);
        this.beginTransition(manual ? this.table.transition.manualSeconds : this.table.transition.autoSeconds);
    }

    /** 遊戲季度推進：換季，短 lerp；季度沒變則不動 */
    setQuarter(quarter: number): void {
        this.assertEntered();
        const next = seasonOfQuarter(this.table, quarter);
        if (next === this.season) return;
        this.season = next;
        this.resolveSlot(this.slot);
        this.syncOverlays();
        this.opts.maskEffect?.setSeason(this.season);
        this.beginTransition(this.table.transition.seasonSeconds);
    }

    /** 每幀推進；dt 為真實秒數 */
    update(dt: number): void {
        if (!this.active) return;
        this.elapsed += Math.max(0, dt);
        const t = Math.min(1, this.elapsed / this.duration);
        this.current = t >= 1 ? this.target : lerpTarget(this.from, this.target, t);
        if (t >= 1) this.active = false;
        this.applyCurrent();
    }

    getState(): SceneLightingState {
        return {
            season: this.season,
            slot: this.slot,
            phase: this.phase,
            deepNight: this.deepNight,
            current: { ...this.current },
            target: { ...this.target },
            transitioning: this.active,
        };
    }

    private resolveSlot(slot: number): void {
        const res = phaseOfSlot(this.table, this.season, slot);
        this.slot = slot;
        this.phase = res.phase;
        this.deepNight = res.deepNight;
        this.target = resolveLightingTarget(this.table, res.phase, this.season, res.deepNight);
    }

    private beginTransition(seconds: number): void {
        if (sameTarget(this.current, this.target)) {
            this.active = false;
            return;
        }
        this.from = this.current;
        this.elapsed = 0;
        this.duration = seconds;
        this.active = true;
    }

    private syncOverlays(): void {
        this.opts.lifecycle?.sync(this.season, this.slot);
    }

    private applyCurrent(): void {
        const { r, g, b, intensity } = this.current;
        const cr = Math.round(r);
        const cg = Math.round(g);
        const cb = Math.round(b);
        for (const t of this.opts.tintTargets ?? []) t.applyTint(cr, cg, cb);
        for (const t of this.opts.lightTargets ?? []) t.applyIntensity(intensity);
    }

    private assertEntered(): void {
        if (!this.entered) throw new Error('[SceneLightingController] 請先呼叫 enter()');
    }
}
