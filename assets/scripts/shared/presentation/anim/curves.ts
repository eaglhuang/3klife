/**
 * curves.ts — 通道曲線庫（純函式，無引擎依賴）
 *
 * 片段 JSON 的 `channels.<通道>.type` 對應這裡的曲線。新增動作只改 JSON；
 * 只有要「新的曲線種類」時才在這裡 `registerCurve`（QACT-01 §0.3）。
 *
 * 曲線輸出寫進 QCurveOut：y／rot 用 a（y 另用 b 回報 0..1 的正規化高度給影子）、
 * scale 用 a＝scaleX、b＝scaleY、shadow 用 a＝縮放、b＝透明度、flipX 用 a。
 * 同一個種子與時間必得同一個值（不用 Math.random）。
 */
import type { QChannelSpec } from './types';

export type QCurveKind = 'y' | 'rot' | 'scale' | 'shadow' | 'flipX';

/** 單一片段執行個體的曲線快取（轉頭排程用；片段開始時清空） */
export interface QCurveCache {
    switches: number[];
}

export interface QCurveCtx {
    /** 片段時間（秒，已含速度與種子相位；循環片段不回捲，連續遞增） */
    t: number;
    /** 週期相位 0..1（循環）或進度 0..1（單次） */
    u: number;
    /** 週期或長度（秒） */
    cycle: number;
    loop: boolean;
    seed: number;
    cache: QCurveCache;
    /** y 通道算出的 0..1 正規化高度（影子用） */
    yNorm: number;
}

export interface QCurveOut {
    a: number;
    b: number;
}

export type QCurveFn = (spec: QChannelSpec, c: QCurveCtx, out: QCurveOut) => void;

// ─────────────────────────────── 小工具 ───────────────────────────────

export function clamp01(x: number): number {
    return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function lerp(a: number, b: number, w: number): number {
    return a + (b - a) * w;
}

/** smoothstep：兩端斜率為 0 的平滑過渡 */
export function smooth(x: number): number {
    const v = clamp01(x);
    return v * v * (3 - 2 * v);
}

/** 確定性雜湊 → [0,1)。同 (seed,k) 永遠同值，取代 Math.random */
export function hash01(seed: number, k: number): number {
    let h = (seed | 0) ^ Math.imul(k | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

export function num(spec: QChannelSpec, key: string, def: number): number {
    const v = spec[key];
    return typeof v === 'number' ? v : def;
}

export function pair(spec: QChannelSpec, key: string, def: readonly [number, number]): readonly [number, number] {
    const v = spec[key];
    if (Array.isArray(v) && v.length >= 2 && typeof v[0] === 'number' && typeof v[1] === 'number') {
        return [v[0], v[1]];
    }
    return def;
}

const ONE: readonly [number, number] = [1, 1];

// ─────────────────────────────── 純量曲線（y、rot 共用） ───────────────────────────────

const none: QCurveFn = (_s, _c, out) => {
    out.a = 0;
    out.b = 0;
};

/** 每週期落地一次的彈跳：u=0 落地、u=0.5 最高 */
const bounce: QCurveFn = (s, c, out) => {
    const amp = num(s, 'amp', 0.1);
    const v = Math.pow(Math.sin(Math.PI * c.u), num(s, 'sharp', 0.85));
    out.a = amp * v;
    out.b = v;
};

/** 單次跳躍弧線：preSec 預備蹲、之後飛行、最後 landSec 為落地回彈（落地瞬間＝duration − landSec） */
const arc: QCurveFn = (s, c, out) => {
    const amp = num(s, 'amp', 0.6);
    const fs = num(s, 'preSec', 0.08);
    const fe = c.cycle - num(s, 'landSec', 0.08);
    const p = fe > fs ? (c.t - fs) / (fe - fs) : 0;
    const v = p > 0 && p < 1 ? 4 * p * (1 - p) : 0;
    out.a = amp * v;
    out.b = v;
};

const hold: QCurveFn = (s, _c, out) => {
    out.a = num(s, 'value', 0);
    out.b = 0;
};

/** 連續正弦：週期 `period`（秒，沒給就用片段週期），用連續時間所以循環不會跳 */
const sine: QCurveFn = (s, c, out) => {
    const period = num(s, 'period', c.cycle);
    out.a = num(s, 'amp', 1) * Math.sin((2 * Math.PI * c.t) / period);
    out.b = 0;
};

/** 左右交替：兩個週期才完成一個正弦（走路歪頭隨腳步左右換邊） */
const sineAlt: QCurveFn = (s, c, out) => {
    out.a = num(s, 'amp', 1) * Math.sin((Math.PI * c.t) / c.cycle);
    out.b = 0;
};

/** 單次衰減振盪（搖頭、點頭）：在片段長度內振 cycles 次、振幅線性衰減 */
const sineBurst: QCurveFn = (s, c, out) => {
    out.a = num(s, 'amp', 1) * Math.sin(2 * Math.PI * num(s, 'cycles', 2) * c.u) * (1 - c.u);
    out.b = 0;
};

/** 單次鐘形（拜：前傾再回） */
const bell: QCurveFn = (s, c, out) => {
    out.a = num(s, 'amp', 1) * Math.sin(Math.PI * c.u);
    out.b = 0;
};

// ─────────────────────────────── 縮放曲線 ───────────────────────────────

/** 落地壓扁 → 彈回最高點拉長 → 緩回 1（走路時間比 0.06 : 0.08 : 其餘） */
const squashStretch: QCurveFn = (s, c, out) => {
    const land = pair(s, 'land', [1.12, 0.88]);
    const apex = pair(s, 'apex', [0.94, 1.08]);
    const ls = num(s, 'landSec', 0.06);
    const rb = num(s, 'reboundSec', 0.08);
    const tc = c.u * c.cycle;
    let sx: number;
    let sy: number;
    if (tc < ls) {
        sx = land[0];
        sy = land[1];
    } else if (tc < ls + rb) {
        const w = smooth((tc - ls) / rb);
        sx = lerp(land[0], apex[0], w);
        sy = lerp(land[1], apex[1], w);
    } else {
        const rest = Math.max(1e-6, c.cycle - ls - rb);
        const w = smooth((tc - ls - rb) / rest);
        sx = lerp(apex[0], 1, w);
        sy = lerp(apex[1], 1, w);
    }
    out.a = sx;
    out.b = sy;
};

/** 起跳前蹲 → 飛行拉長 → 落地壓扁回彈 */
const anticipate: QCurveFn = (s, c, out) => {
    const pre = pair(s, 'pre', [1.15, 0.85]);
    const land = pair(s, 'land', [1.18, 0.82]);
    const stretch = pair(s, 'stretch', [0.94, 1.08]);
    const preSec = num(s, 'preSec', 0.08);
    const landSec = num(s, 'landSec', 0.08);
    const fe = c.cycle - landSec;
    let sx: number;
    let sy: number;
    if (c.t < preSec) {
        const w = smooth(c.t / preSec);
        sx = lerp(1, pre[0], w);
        sy = lerp(1, pre[1], w);
    } else if (c.t < fe) {
        const w = smooth(((c.t - preSec) / Math.max(1e-6, fe - preSec)) * 4);
        sx = lerp(pre[0], stretch[0], w);
        sy = lerp(pre[1], stretch[1], w);
    } else {
        const w = smooth((c.t - fe) / Math.max(1e-6, landSec));
        sx = lerp(land[0], 1, w);
        sy = lerp(land[1], 1, w);
    }
    out.a = sx;
    out.b = sy;
};

/** 呼吸：整個週期 min→max→min；Y 變化大、X 只有一半，看起來像胸腔起伏 */
const breath: QCurveFn = (s, c, out) => {
    const mn = num(s, 'min', 1);
    const mx = num(s, 'max', 1.03);
    const v = mn + (mx - mn) * (0.5 - 0.5 * Math.cos(2 * Math.PI * c.u));
    out.a = 1 + (v - 1) * 0.5;
    out.b = v;
};

const holdScale: QCurveFn = (s, _c, out) => {
    const to = pair(s, 'to', ONE);
    out.a = to[0];
    out.b = to[1];
};

// ─────────────────────────────── 影子與翻轉 ───────────────────────────────

/** 影子跟著 y：越高越小越淡，落地回 1 */
const followY: QCurveFn = (s, c, out) => {
    out.a = 1 - (1 - num(s, 'scaleMin', 0.78)) * c.yNorm;
    out.b = 1 - (1 - num(s, 'alphaMin', 0.55)) * c.yNorm;
};

/** 空中旋轉：cos 模擬繞垂直軸轉（不做 3D）。deg=180 轉半圈、360 轉整圈回正 */
const spin: QCurveFn = (s, c, out) => {
    if (s.enable === false) {
        out.a = 1;
        return;
    }
    const preSec = num(s, 'preSec', 0.08);
    const fe = c.cycle - num(s, 'landSec', 0.08);
    const p = clamp01((c.t - preSec) / Math.max(1e-6, fe - preSec));
    out.a = Math.cos((num(s, 'deg', 360) / 180) * Math.PI * p);
};

/**
 * 待機左右轉頭：每隔 minSec～maxSec（確定性隨機）水平翻轉一次，轉身經過 turnSec 的 cos 過渡。
 * 排程只依 (seed, 序號)，是時間的純函式；不需要的演員（noFlip）由管理器直接蓋成 1。
 */
const lookAround: QCurveFn = (s, c, out) => {
    const minSec = num(s, 'minSec', 4);
    const maxSec = num(s, 'maxSec', 9);
    const turn = Math.max(1e-3, num(s, 'turnSec', 0.12));
    const sw = c.cache.switches;
    if (sw.length === 0) sw.push(minSec + hash01(c.seed, 100) * (maxSec - minSec));
    while (sw[sw.length - 1] <= c.t) {
        const i = sw.length;
        sw.push(sw[i - 1] + minSec + hash01(c.seed, 100 + i) * (maxSec - minSec));
    }
    // 目前是第 k 次切換之後（sw[k-1] <= t < sw[k]）
    let k = 0;
    while (k < sw.length && sw[k] <= c.t) k++;
    const signNew = k % 2 === 0 ? 1 : -1;
    if (k > 0 && c.t < sw[k - 1] + turn) {
        out.a = -signNew * Math.cos((Math.PI * (c.t - sw[k - 1])) / turn);
    } else {
        out.a = signNew;
    }
};

// ─────────────────────────────── 登記表 ───────────────────────────────

const SCALAR: Record<string, QCurveFn> = { none, bounce, arc, hold, sine, sineAlt, sineBurst, bell };

const REGISTRY: Record<QCurveKind, Record<string, QCurveFn>> = {
    y: { ...SCALAR },
    rot: { ...SCALAR },
    scale: { none, squashStretch, anticipate, breath, hold: holdScale },
    shadow: { none, followY },
    flipX: { none, spin, spinHalf: (s, c, o) => spin({ ...s, deg: 180 }, c, o), lookAround },
};

export function getCurve(kind: QCurveKind, type: string): QCurveFn | undefined {
    return REGISTRY[kind][type];
}

/** 擴充曲線種類（只有需要新曲線時才呼叫；新動作本身只改 JSON） */
export function registerCurve(kind: QCurveKind, type: string, fn: QCurveFn): void {
    REGISTRY[kind][type] = fn;
}
