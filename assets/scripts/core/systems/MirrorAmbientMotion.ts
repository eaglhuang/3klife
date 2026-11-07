/**
 * MirrorAmbientMotion — 血脈命鏡低頻動效參數與取樣（命鏡過場規格補遺 v3「中可行」；BMV3-04；PROG-2-2068）
 *
 * 規格：中央門霧化流動、定心者 aura 呼吸光、右側英靈邊緣淡閃，
 * 先做低頻、低成本的 tween／sprite opacity，不追求重特效。
 * 這裡只定義每種動效作用的節點、週期與透明度下限，並算出某時間點的透明度倍率；
 * 套到節點由 ui/core/UIMirrorAmbientMotion 負責。
 */

export type MirrorAmbientEffectId = 'gateMist' | 'coreBreath' | 'spiritFlicker';

export interface MirrorAmbientEffectSpec {
    id: MirrorAmbientEffectId;
    /** 命鏡 layout 內的節點名 */
    nodeName: string;
    /** 一次明暗循環的秒數 */
    periodSec: number;
    /** 最暗時的透明度倍率（0~1），越接近 1 越不搶眼 */
    minFactor: number;
    /** 起始相位（0~1 個週期），錯開三種動效 */
    phase: number;
}

/** 暫定值：週期都在 3 秒以上，最暗不低於原透明度的 70%，避免干擾閱讀 */
export const MIRROR_AMBIENT_EFFECTS: readonly MirrorAmbientEffectSpec[] = [
    { id: 'gateMist', nodeName: 'MirrorGate', periodSec: 6, minFactor: 0.8, phase: 0 },
    { id: 'coreBreath', nodeName: 'VesselCore', periodSec: 3.2, minFactor: 0.7, phase: 0.25 },
    { id: 'spiritFlicker', nodeName: 'SpiritHero', periodSec: 4.5, minFactor: 0.85, phase: 0.5 },
];

/** 時間 tSec 時的透明度倍率：相位 0 為最亮（1），半個週期後最暗（minFactor） */
export function mirrorAmbientFactor(spec: MirrorAmbientEffectSpec, tSec: number): number {
    const angle = 2 * Math.PI * (tSec / spec.periodSec + spec.phase);
    return spec.minFactor + (1 - spec.minFactor) * (0.5 + 0.5 * Math.cos(angle));
}
