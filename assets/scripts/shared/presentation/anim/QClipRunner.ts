/**
 * QClipRunner.ts — 單一片段的「執行個體」：推進時間、發事件、取樣通道（引擎中立）
 *
 * 取樣是時間的純函式：同一個 clip、seed、時間序列必得同樣的通道值（驗收 1）。
 * 事件規則：循環片段的事件在「每個週期內該時間點」發出，落地事件掛在週期起點（t=0），
 * 所以走路每一步剛落地就發 land；種子相位偏移已算進去，落地事件永遠對得上畫面上的落地。
 */
import {
    getCurve,
    clamp01,
    hash01,
    type QCurveCache,
    type QCurveCtx,
    type QCurveFn,
    type QCurveOut,
} from './curves';
import {
    CH_FLIP,
    CH_ROT,
    CH_SCALE,
    CH_SHADOW,
    CH_Y,
    resetChannels,
    type QChannels,
    type QChannelSpec,
    type QClipDef,
    type QClipLibrary,
} from './types';

const EPS = 1e-9;

export interface QRunStartOpts {
    loop?: boolean;
    speed?: number;
    seed: number;
}

export class QClipRun {
    clipId = '';
    clip: QClipDef | null = null;
    loop = false;
    /** 週期（循環）或長度（單次），秒 */
    cycle = 1;
    speed = 1;
    seed = 0;
    done = false;
    /** 目前的連續時間（含種子相位偏移，循環片段不回捲） */
    T = 0;
    /** 種子造成的相位偏移（秒）；單次片段為 0 */
    offset = 0;
    private evT = 0;
    private readonly cache: QCurveCache = { switches: [] };
    private readonly ctx: QCurveCtx;
    private readonly out: QCurveOut = { a: 0, b: 0 };
    private fnY: QCurveFn | undefined;
    private fnRot: QCurveFn | undefined;
    private fnScale: QCurveFn | undefined;
    private fnShadow: QCurveFn | undefined;
    private fnFlip: QCurveFn | undefined;

    constructor() {
        this.ctx = { t: 0, u: 0, cycle: 1, loop: false, seed: 0, cache: this.cache, yNorm: 0 };
    }

    start(clipId: string, clip: QClipDef, opts: QRunStartOpts): void {
        this.clipId = clipId;
        this.clip = clip;
        this.loop = opts.loop ?? clip.loop;
        this.cycle = Math.max(1e-4, (this.loop ? clip.period ?? clip.duration : clip.duration ?? clip.period) ?? 1);
        this.speed = opts.speed ?? 1;
        this.seed = opts.seed;
        this.done = false;
        this.offset = this.loop ? hash01(opts.seed, 0x51ed) * this.cycle : 0;
        this.T = this.offset;
        this.evT = this.offset - 1e-6;
        this.cache.switches.length = 0;
        const ch = clip.channels;
        this.fnY = ch.y ? getCurve('y', ch.y.type) : undefined;
        this.fnRot = ch.rot ? getCurve('rot', ch.rot.type) : undefined;
        this.fnScale = ch.scale ? getCurve('scale', ch.scale.type) : undefined;
        this.fnShadow = ch.shadow ? getCurve('shadow', ch.shadow.type) : undefined;
        this.fnFlip = ch.flipX ? getCurve('flipX', ch.flipX.type) : undefined;
    }

    /**
     * 推進 dt 秒。
     * @param endAtCycle 循環片段且佇列有下一個時，推到本週期結束就停（done）
     * @param fireEvents LOD2 不發片段事件，只推時間
     * @param emit 事件回呼
     */
    advance(dt: number, endAtCycle: boolean, fireEvents: boolean, emit: (name: string) => void): void {
        if (this.done || !this.clip) return;
        let nextT = this.T + dt * this.speed;
        if (this.loop) {
            if (endAtCycle) {
                const boundary = (Math.floor((this.T + EPS) / this.cycle) + 1) * this.cycle;
                if (nextT >= boundary - EPS) {
                    nextT = boundary;
                    this.done = true;
                }
            }
        } else if (nextT >= this.cycle - EPS) {
            nextT = this.cycle;
            this.done = true;
        }
        if (fireEvents) this.fireEvents(this.evT, nextT, emit);
        this.evT = nextT;
        this.T = nextT;
    }

    private fireEvents(a: number, b: number, emit: (name: string) => void): void {
        const evs = this.clip ? this.clip.events : undefined;
        if (!evs) return;
        for (let i = 0; i < evs.length; i++) {
            const e = evs[i].t;
            if (this.loop) {
                const k0 = Math.floor((a - e) / this.cycle);
                const k1 = Math.floor((b - e) / this.cycle + EPS);
                for (let k = k0; k <= k1; k++) {
                    const tk = e + k * this.cycle;
                    if (tk > a + EPS && tk <= b + EPS) emit(evs[i].name);
                }
            } else if (e > a + EPS && e <= b + EPS) {
                emit(evs[i].name);
            }
        }
    }

    /** 取樣成通道值。mask 內的通道才算，其餘維持中性值（LOD1 只算 y 與 scale） */
    sample(out: QChannels, mask: number): void {
        resetChannels(out);
        const clip = this.clip;
        if (!clip) return;
        const c = this.ctx;
        c.t = this.T;
        c.cycle = this.cycle;
        c.loop = this.loop;
        c.seed = this.seed;
        const ratio = this.T / this.cycle;
        c.u = this.loop ? ratio - Math.floor(ratio) : clamp01(ratio);
        c.yNorm = 0;
        const o = this.out;
        const ch = clip.channels;
        if ((mask & CH_Y) !== 0 && this.fnY) {
            this.fnY(ch.y as QChannelSpec, c, o);
            out.y = o.a;
            c.yNorm = o.b;
        }
        if ((mask & CH_ROT) !== 0 && this.fnRot) {
            this.fnRot(ch.rot as QChannelSpec, c, o);
            out.rot = o.a;
        }
        if ((mask & CH_SCALE) !== 0 && this.fnScale) {
            this.fnScale(ch.scale as QChannelSpec, c, o);
            out.scaleX = o.a;
            out.scaleY = o.b;
        }
        if ((mask & CH_SHADOW) !== 0 && this.fnShadow) {
            this.fnShadow(ch.shadow as QChannelSpec, c, o);
            out.shadowScale = o.a;
            out.shadowAlpha = o.b;
        }
        if ((mask & CH_FLIP) !== 0 && this.fnFlip) {
            this.fnFlip(ch.flipX as QChannelSpec, c, o);
            out.flipX = o.a;
        }
    }
}

/** 檢查片段庫：未知曲線、缺週期／長度、事件時間超界。回錯誤字串陣列（空＝通過） */
export function validateClipLibrary(lib: QClipLibrary): string[] {
    const errs: string[] = [];
    const kinds = ['y', 'rot', 'scale', 'shadow', 'flipX'] as const;
    for (const id of Object.keys(lib.clips)) {
        const clip = lib.clips[id];
        const cycle = clip.loop ? clip.period : clip.duration;
        if (!(typeof cycle === 'number' && cycle > 0)) {
            errs.push(`${id}: ${clip.loop ? 'period' : 'duration'} 必須是正數`);
            continue;
        }
        for (const kind of kinds) {
            const spec = clip.channels[kind];
            if (spec && !getCurve(kind, spec.type)) errs.push(`${id}.${kind}: 未知曲線 ${spec.type}`);
        }
        for (const ev of clip.events ?? []) {
            if (ev.t < 0 || ev.t > cycle + EPS) errs.push(`${id}: 事件 ${ev.name} 時間 ${ev.t} 超出 0..${cycle}`);
        }
    }
    return errs;
}
