/**
 * QSymbolMotion.ts — 11 種符號動態的純公式（QLIFE-01 §5.2）
 *
 * 全部是 (圖層, 元素序號, 時間) → 狀態 的純函式，無狀態、可重現。
 * 座標單位 H（頭高）；角度為度。
 */
import { SpriteState, SymbolLayerDef } from './types';

const TAU = Math.PI * 2;

export function frac(x: number): number {
    return x - Math.floor(x);
}

/** 淡入淡出包絡：p 在 [0,1]，fade=[淡入結束, 淡出開始] */
export function fadeEnvelope(p: number, fade: [number, number]): number {
    const a = fade[0];
    const b = fade[1];
    if (a > 0 && p < a) return p / a;
    if (b < 1 && p > b) return (1 - p) / (1 - b);
    return 1;
}

/** 解出元素 i 的圖集部件 */
export function partOf(layer: SymbolLayerDef, i: number): string {
    return Array.isArray(layer.part) ? layer.part[i % layer.part.length] : layer.part;
}

export function layerCount(layer: SymbolLayerDef): number {
    return Math.max(1, Math.floor(layer.count ?? 1));
}

/**
 * 計算圖層第 i 個元素（共 n 個）在時間 t（秒）的狀態。
 * @param part 已解出的圖集部件 id（含 weaponFromGeneral 的代換）
 */
export function evalMotion(layer: SymbolLayerDef, i: number, n: number, t: number, part: string): SpriteState {
    const period = layer.period && layer.period > 0 ? layer.period : 1;
    const phase = layer.phase ?? 0;
    const size = layer.size ?? 1;
    const ox = layer.offset ? layer.offset[0] : 0;
    const oy = layer.offset ? layer.offset[1] : 0;
    const baseAlpha = layer.alpha ?? 1;
    const u = t / period + phase; // 以週期為單位的時間
    const st: SpriteState = { part, x: ox, y: oy, scaleX: size, scaleY: size, rot: 0, alpha: baseAlpha, flipX: false };

    switch (layer.motion) {
        case 'floatUp': {
            const p = frac(u + i / n);
            const rise = layer.rise ?? 0.8;
            const sway = layer.sway ?? 0;
            const grow = layer.grow ?? 0;
            st.y = oy + rise * p;
            st.x = ox + sway * Math.sin(TAU * p) * (i % 2 === 0 ? 1 : -1);
            const s = size * (1 + grow * p);
            st.scaleX = s;
            st.scaleY = s;
            st.alpha = baseAlpha * fadeEnvelope(p, layer.fade ?? [0.2, 0.8]);
            break;
        }
        case 'orbit': {
            const a = TAU * (u + i / n);
            const r = layer.radius ?? 0.9;
            const ratio = layer.ratio ?? 0.35;
            st.x = ox + r * Math.cos(a);
            st.y = oy + r * ratio * Math.sin(a);
            st.rot = (layer.spin ?? 0) * (t / period);
            break;
        }
        case 'pour': {
            const ang = layer.angle ?? [0, 60];
            const k = 0.5 - 0.5 * Math.cos(TAU * u); // 0→1→0 往返
            st.rot = -(ang[0] + (ang[1] - ang[0]) * k);
            break;
        }
        case 'pulse': {
            const amp = layer.amp ?? 0.1;
            const s = size * (1 + amp * Math.sin(TAU * (u + i / n)));
            st.scaleX = s;
            st.scaleY = s;
            break;
        }
        case 'wobble': {
            const amp = layer.amp ?? 12;
            st.rot = amp * Math.sin(TAU * (u + i * 0.25));
            break;
        }
        case 'shoot': {
            const draw = layer.draw ?? 0.3;
            const fly = layer.fly ?? 0.5;
            const pull = layer.pull ?? 0.15;
            const dist = layer.dist ?? 1.2;
            const local = frac(u) * period; // 本週期內經過秒數
            if (local < draw) {
                st.x = ox - pull * (local / draw);
            } else if (local < draw + fly) {
                const k = (local - draw) / fly;
                st.x = ox - pull + (dist + pull) * k;
                st.alpha = baseAlpha * (k < 0.7 ? 1 : (1 - k) / 0.3);
            } else {
                st.x = ox + dist;
                st.alpha = 0; // 回彈期箭不可見
            }
            break;
        }
        case 'spark': {
            const burst = layer.burst ?? 0.4;
            const cyc = Math.floor(u);
            const p = frac(u);
            if (p < burst) {
                const k = p / burst;
                const a = TAU * (i / n) + 0.5 + 0.7 * cyc;
                const r = (layer.radius ?? 0.5) * k;
                st.x = ox + r * Math.cos(a);
                st.y = oy + r * Math.sin(a);
                const s = size * (1 - 0.5 * k);
                st.scaleX = s;
                st.scaleY = s;
                st.alpha = baseAlpha * (1 - k);
            } else {
                st.alpha = 0;
            }
            break;
        }
        case 'drift': {
            const p = frac(u + i / n);
            const dir = layer.dir ?? [0.35, 0.35];
            st.x = ox + dir[0] * p + (layer.wiggle ?? 0.1) * Math.sin(TAU * p * 2);
            st.y = oy + dir[1] * p;
            st.alpha = baseAlpha * Math.sin(Math.PI * p);
            break;
        }
        case 'bounce': {
            const amp = layer.amp ?? 0.15;
            const stagger = layer.stagger ?? 1 / n;
            st.y = oy + amp * Math.abs(Math.sin(Math.PI * (u + i * stagger)));
            break;
        }
        case 'swing': {
            st.rot = (layer.amp ?? 10) * Math.sin(TAU * u);
            break;
        }
        case 'flip': {
            const c = Math.cos(TAU * u);
            st.scaleX = size * Math.abs(c);
            st.flipX = c < 0;
            break;
        }
    }
    if (layer.spread) st.x += layer.spread * (i - (n - 1) / 2);
    return st;
}
