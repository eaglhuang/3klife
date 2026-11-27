/**
 * QAnimManager.ts — Q 動畫管理器（QACT-01 第 2、7 章；引擎中立）
 *
 * - 全場唯一一個 update 迴圈：呼叫端每幀呼叫一次 `update(dt)`（Cocos 由一個 Component 的 update 轉呼叫）。
 *   禁止每顆頭各掛 schedule／tween。
 * - 管理器只認「演員＋通道＋片段」，不認武將、場景、符號；輸出是 QChannels，由演員的 `apply` 套到畫面。
 * - 播放／佇列／淡入淡出／停止、事件（land、hit、clipEnd…）、LOD 與預算表降級、暫停。
 * - 演員狀態走物件池：註冊／註銷 1000 次不增加物件數。
 *
 * Unity 對照：像一個中央 AnimatorController 系統；演員的 apply 相當於 Animator 寫回 Transform。
 */
import { QActorPool } from './QActorPool';
import { QClipRun, validateClipLibrary } from './QClipRunner';
import { smooth } from './curves';
import {
    CH_ALL,
    CH_FLIP,
    CH_ROT,
    CH_SCALE,
    CH_SHADOW,
    CH_Y,
    INVALID_HANDLE,
    createChannels,
    resetChannels,
    type ActorHandle,
    type IQActor,
    type PlayOpts,
    type QAnimBudget,
    type QAnimEventCb,
    type QChannels,
    type QClipLibrary,
    type QLod,
    type QTierBudget,
    type QTierName,
} from './types';

const QUEUE_CAP = 8;
const HANDLE_MASK = 0xffff;
const GEN_MAX = 0x7fff;

class ActorState {
    index = 0;
    gen = 1;
    alive = false;
    actor: IQActor | null = null;
    cur = new QClipRun();
    prev = new QClipRun();
    hasCur = false;
    hasPrev = false;
    fadeT = 0;
    fadeDur = 0;
    lod: QLod = 0;
    lodLocked = false;
    facing = 1;
    /** LOD1 隔幀更新時累積的 dt */
    accDt = 0;
    /** 已把中性值套過（避免空閒演員每幀重複 apply） */
    neutralApplied = false;
    frozenApplied = false;
    readonly out: QChannels = createChannels();
    readonly a: QChannels = createChannels();
    readonly b: QChannels = createChannels();
    readonly qIds: string[] = [];
    readonly qOpts: (PlayOpts | undefined)[] = [];
    qLen = 0;
}

export interface QAnimStats {
    frame: number;
    /** 本幀實際取樣＋套用的演員數 */
    updatedThisFrame: number;
    /** 累積取樣次數（LOD2 不增加） */
    sampleCount: number;
    lastUpdateMs: number;
    overBudgetFrames: number;
    alive: number;
}

export interface QAnimManagerOptions {
    tier?: QTierName;
    /** 時鐘（毫秒）；預設 performance.now，可注入以便測試 */
    now?: () => number;
}

export class QAnimManager {
    private readonly lib: QClipLibrary;
    private readonly budget: QAnimBudget;
    private tierName: QTierName;
    private tier: QTierBudget;
    private readonly slots: ActorState[] = [];
    private readonly pool: QActorPool<ActorState>;
    private readonly listeners: Record<string, QAnimEventCb[]> = {};
    private readonly lodScratch: ActorState[] = [];
    private readonly lod1Mask: number;
    private readonly now: () => number;
    private paused = false;
    private lodTimer = 0;
    private lodDirty = true;
    private curState: ActorState | null = null;
    readonly stats: QAnimStats = {
        frame: 0,
        updatedThisFrame: 0,
        sampleCount: 0,
        lastUpdateMs: 0,
        overBudgetFrames: 0,
        alive: 0,
    };

    private readonly emitFromRun = (name: string): void => {
        const s = this.curState;
        if (s) this.dispatch(s, name, s.cur.clipId);
    };

    constructor(lib: QClipLibrary, budget: QAnimBudget, opts: QAnimManagerOptions = {}) {
        const errs = validateClipLibrary(lib);
        if (errs.length > 0) throw new Error('q-motion-clips 驗證失敗：' + errs.join('；'));
        this.lib = lib;
        this.budget = budget;
        this.tierName = opts.tier ?? budget.defaultTier;
        this.tier = budget.tiers[this.tierName];
        const perf = (globalThis as { performance?: { now(): number } }).performance;
        this.now = opts.now ?? (perf ? () => perf.now() : () => Date.now());
        this.lod1Mask = QAnimManager.maskOf(budget.lod1.channels);
        this.pool = new QActorPool<ActorState>(
            () => {
                const s = new ActorState();
                s.index = this.slots.length;
                this.slots.push(s);
                return s;
            },
            this.tier.maxActors + budget.poolSpare,
            (s) => {
                s.alive = false;
                s.actor = null;
            },
        );
    }

    private static maskOf(names: string[]): number {
        let m = 0;
        for (const n of names) {
            if (n === 'y') m |= CH_Y;
            else if (n === 'rot') m |= CH_ROT;
            else if (n === 'scale') m |= CH_SCALE;
            else if (n === 'shadow') m |= CH_SHADOW;
            else if (n === 'flipX') m |= CH_FLIP;
        }
        return m;
    }

    // ─────────────────────────── 註冊 ───────────────────────────

    /** 註冊演員；池滿（已達本機等級可見頭數＋備用）回 INVALID_HANDLE，呼叫端要降級而不是硬加 */
    register(actor: IQActor): ActorHandle {
        const s = this.pool.acquire();
        if (!s) return INVALID_HANDLE;
        s.alive = true;
        s.actor = actor;
        s.hasCur = false;
        s.hasPrev = false;
        s.qLen = 0;
        s.fadeT = 0;
        s.fadeDur = 0;
        s.lod = 0;
        s.lodLocked = false;
        s.facing = 1;
        s.accDt = 0;
        s.neutralApplied = false;
        s.frozenApplied = false;
        s.cur.done = false;
        resetChannels(s.out);
        this.lodDirty = true;
        this.stats.alive++;
        return this.handleOf(s);
    }

    unregister(h: ActorHandle): void {
        const s = this.resolve(h);
        if (!s) return;
        s.gen = s.gen >= GEN_MAX ? 1 : s.gen + 1;
        this.pool.release(s);
        this.lodDirty = true;
        this.stats.alive--;
    }

    private handleOf(s: ActorState): ActorHandle {
        return (s.gen << 16) | s.index;
    }

    private resolve(h: ActorHandle): ActorState | null {
        if (h < 0) return null;
        const s = this.slots[h & HANDLE_MASK];
        if (!s || !s.alive || s.gen !== h >>> 16) return null;
        return s;
    }

    // ─────────────────────────── 播放控制 ───────────────────────────

    /** 立刻切到片段（清空佇列）；舊片段淡出、新片段淡入。未知片段回 false */
    play(h: ActorHandle, clipId: string, opts?: PlayOpts): boolean {
        const s = this.resolve(h);
        if (!s) return false;
        s.qLen = 0;
        return this.begin(s, clipId, opts);
    }

    /** 排進佇列：目前片段做完（單次＝播完、循環＝本週期結束）再接；沒有在播就直接播 */
    queue(h: ActorHandle, clipId: string, opts?: PlayOpts): boolean {
        const s = this.resolve(h);
        if (!s || !this.lib.clips[clipId]) return false;
        if (!s.hasCur) return this.begin(s, clipId, opts);
        if (s.qLen >= QUEUE_CAP) return false;
        s.qIds[s.qLen] = clipId;
        s.qOpts[s.qLen] = opts;
        s.qLen++;
        return true;
    }

    /** 停止：淡出到中性姿勢（預設淡出秒數取預算表；0＝立刻） */
    stop(h: ActorHandle, fadeSec?: number): void {
        const s = this.resolve(h);
        if (!s) return;
        s.qLen = 0;
        const fade = fadeSec ?? this.budget.defaultFadeSec;
        if (s.hasCur && fade > 0) {
            this.swapRuns(s);
            s.hasCur = false;
            s.hasPrev = true;
            s.fadeT = 0;
            s.fadeDur = fade;
        } else {
            s.hasCur = false;
            s.hasPrev = false;
        }
        s.neutralApplied = false;
    }

    setFacing(h: ActorHandle, dir: 1 | -1): void {
        const s = this.resolve(h);
        if (!s) return;
        s.facing = dir;
        s.neutralApplied = false;
    }

    /** 手動指定 LOD（之後不再被自動重算改動）；傳 'auto' 交還自動 */
    setLod(h: ActorHandle, lod: QLod | 'auto'): void {
        const s = this.resolve(h);
        if (!s) return;
        if (lod === 'auto') {
            s.lodLocked = false;
            this.lodDirty = true;
        } else {
            s.lodLocked = true;
            this.setStateLod(s, lod);
        }
    }

    getLod(h: ActorHandle): QLod | -1 {
        const s = this.resolve(h);
        return s ? s.lod : -1;
    }

    setPaused(paused: boolean): void {
        this.paused = paused;
    }

    isPaused(): boolean {
        return this.paused;
    }

    /** 目前播放中的片段 id（沒有回 null） */
    currentClip(h: ActorHandle): string | null {
        const s = this.resolve(h);
        return s && s.hasCur ? s.cur.clipId : null;
    }

    /** 讀目前輸出的通道值（唯讀） */
    getChannels(h: ActorHandle): Readonly<QChannels> | null {
        const s = this.resolve(h);
        return s ? s.out : null;
    }

    hasClip(clipId: string): boolean {
        return this.lib.clips[clipId] !== undefined;
    }

    // ─────────────────────────── 事件 ───────────────────────────

    /** 訂閱事件；名稱 '*' 收全部。回傳取消訂閱函式 */
    on(evt: string, cb: QAnimEventCb): () => void {
        (this.listeners[evt] ??= []).push(cb);
        return () => {
            const arr = this.listeners[evt];
            const i = arr ? arr.indexOf(cb) : -1;
            if (i >= 0) arr.splice(i, 1);
        };
    }

    private dispatch(s: ActorState, name: string, clipId: string): void {
        const h = this.handleOf(s);
        const actor = s.actor;
        if (actor && actor.onEvent) actor.onEvent(name, clipId);
        const a = this.listeners[name];
        if (a) for (let i = 0; i < a.length; i++) a[i](h, name, clipId);
        const all = this.listeners['*'];
        if (all) for (let i = 0; i < all.length; i++) all[i](h, name, clipId);
    }

    // ─────────────────────────── 預算與 LOD ───────────────────────────

    setTier(name: QTierName): void {
        this.tierName = name;
        this.tier = this.budget.tiers[name];
        this.pool.setMaxSize(this.tier.maxActors + this.budget.poolSpare);
        this.lodDirty = true;
    }

    getTier(): QTierName {
        return this.tierName;
    }

    getTierBudget(): Readonly<QTierBudget> {
        return this.tier;
    }

    /** 物件池資訊（測試與除錯：驗證註冊／註銷不增長） */
    getPoolInfo(): { created: number; inUse: number; max: number } {
        return { created: this.pool.created, inUse: this.pool.inUse, max: this.pool.getMaxSize() };
    }

    /**
     * 重算 LOD（update 內每 lodRecomputeSec 才跑一次，不是每幀）：
     * 畫面外／被蓋住 → LOD2；其餘依離焦點距離排序，最近的 lod0Actors 顆 → LOD0，剩下 → LOD1。
     * 手動指定過 LOD 的演員不動。
     */
    recomputeLod(): void {
        const arr = this.lodScratch;
        arr.length = 0;
        for (const s of this.slots) {
            if (!s.alive || s.lodLocked) continue;
            if (s.actor && s.actor.culled) this.setStateLod(s, 2);
            else arr.push(s);
        }
        arr.sort((x, y) => {
            const dx = x.actor && x.actor.focusDistance !== undefined ? x.actor.focusDistance : Infinity;
            const dy = y.actor && y.actor.focusDistance !== undefined ? y.actor.focusDistance : Infinity;
            if (dx !== dy) return dx < dy ? -1 : 1;
            return x.index - y.index;
        });
        const n0 = this.tier.lod0Actors;
        for (let i = 0; i < arr.length; i++) this.setStateLod(arr[i], i < n0 ? 0 : 1);
        this.lodDirty = false;
        this.lodTimer = 0;
    }

    private setStateLod(s: ActorState, lod: QLod): void {
        if (s.lod === lod) return;
        s.lod = lod;
        s.frozenApplied = false;
        s.neutralApplied = false;
    }

    // ─────────────────────────── 每幀更新 ───────────────────────────

    update(dt: number): void {
        if (this.paused) return;
        const t0 = this.now();
        const st = this.stats;
        st.frame++;
        st.updatedThisFrame = 0;
        const step = dt > this.budget.maxDtSec ? this.budget.maxDtSec : dt;
        this.lodTimer += step;
        if (this.lodDirty || this.lodTimer >= this.budget.lodRecomputeSec) this.recomputeLod();
        for (let i = 0; i < this.slots.length; i++) {
            const s = this.slots[i];
            if (s.alive) this.tick(s, step);
        }
        st.lastUpdateMs = this.now() - t0;
        if (st.lastUpdateMs > this.tier.frameBudgetMs) st.overBudgetFrames++;
    }

    private tick(s: ActorState, dtIn: number): void {
        let dt = dtIn;
        if (s.lod === 1) {
            s.accDt += dt;
            if ((this.stats.frame + s.index) % this.budget.lod1.everyNFrames !== 0) return;
            dt = s.accDt;
            s.accDt = 0;
        } else if (s.accDt > 0) {
            dt += s.accDt;
            s.accDt = 0;
        }

        // 推進淡入淡出
        if (s.hasPrev) {
            s.fadeT += dt;
            s.prev.advance(dt, false, false, noop);
            if (s.fadeT >= s.fadeDur) s.hasPrev = false;
        }
        // 推進目前片段（LOD2 只推時間、不發片段事件）
        if (s.hasCur) {
            this.curState = s;
            s.cur.advance(dt, s.qLen > 0, s.lod !== 2, this.emitFromRun);
            this.curState = null;
            if (!s.alive) return;
            if (s.cur.done) this.finishCurrent(s);
            if (!s.alive) return;
        }

        if (s.lod === 2) {
            if (!s.frozenApplied) {
                resetChannels(s.out);
                this.finalize(s);
                s.frozenApplied = true;
            }
            return;
        }

        if (!s.hasCur && !s.hasPrev) {
            if (s.neutralApplied) return;
            resetChannels(s.out);
            s.neutralApplied = true;
        } else {
            this.compose(s);
            s.neutralApplied = false;
        }
        this.finalize(s);
        this.stats.updatedThisFrame++;
    }

    /** 目前片段結束：有佇列接下一個（舊的淡出），沒有就回中性；最後才發 clipEnd，讓回呼看到一致狀態 */
    private finishCurrent(s: ActorState): void {
        const endedId = s.cur.clipId;
        if (s.qLen > 0) {
            const id = s.qIds[0];
            const opts = s.qOpts[0];
            for (let i = 1; i < s.qLen; i++) {
                s.qIds[i - 1] = s.qIds[i];
                s.qOpts[i - 1] = s.qOpts[i];
            }
            s.qLen--;
            if (!this.begin(s, id, opts)) s.hasCur = false;
        } else {
            s.hasCur = false;
        }
        this.dispatch(s, 'clipEnd', endedId);
    }

    private compose(s: ActorState): void {
        const mask = s.lod === 1 ? this.lod1Mask : CH_ALL;
        const a = s.a;
        if (s.hasCur) s.cur.sample(a, mask);
        else resetChannels(a);
        this.stats.sampleCount++;
        const o = s.out;
        if (s.hasPrev) {
            const b = s.b;
            s.prev.sample(b, mask);
            const w = s.fadeDur > 0 ? smooth(s.fadeT / s.fadeDur) : 1;
            const iw = 1 - w;
            o.y = b.y * iw + a.y * w;
            o.rot = b.rot * iw + a.rot * w;
            o.scaleX = b.scaleX * iw + a.scaleX * w;
            o.scaleY = b.scaleY * iw + a.scaleY * w;
            o.shadowScale = b.shadowScale * iw + a.shadowScale * w;
            o.shadowAlpha = b.shadowAlpha * iw + a.shadowAlpha * w;
            o.flipX = b.flipX * iw + a.flipX * w;
        } else {
            o.y = a.y;
            o.rot = a.rot;
            o.scaleX = a.scaleX;
            o.scaleY = a.scaleY;
            o.shadowScale = a.shadowScale;
            o.shadowAlpha = a.shadowAlpha;
            o.flipX = a.flipX;
        }
    }

    /** 套上面向與不對稱旗標後交給演員 */
    private finalize(s: ActorState): void {
        const actor = s.actor;
        if (!actor) return;
        const o = s.out;
        // noFlip：頭圖左右不對稱，不做負 scale 翻轉（朝向改由呼叫端用傾斜與位移表現）
        o.flipX = actor.noFlip ? 1 : o.flipX * s.facing;
        actor.apply(o);
    }

    // ─────────────────────────── 內部 ───────────────────────────

    private swapRuns(s: ActorState): void {
        const t = s.prev;
        s.prev = s.cur;
        s.cur = t;
    }

    private begin(s: ActorState, clipId: string, opts?: PlayOpts): boolean {
        const clip = this.lib.clips[clipId];
        if (!clip || !s.actor) return false;
        const fade = opts?.fadeInSec ?? clip.fadeInSec ?? this.budget.defaultFadeSec;
        if (s.hasCur) {
            this.swapRuns(s);
            s.hasPrev = true;
        }
        if (s.hasPrev) {
            if (fade > 0) {
                s.fadeT = 0;
                s.fadeDur = fade;
            } else {
                s.hasPrev = false;
            }
        }
        s.cur.start(clipId, clip, { loop: opts?.loop, speed: opts?.speed, seed: opts?.seed ?? s.actor.seed });
        s.hasCur = true;
        s.neutralApplied = false;
        return true;
    }
}

function noop(): void {
    /* 淡出中的舊片段不發事件 */
}
