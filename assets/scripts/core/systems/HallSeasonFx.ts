// @spec-source → UI-2-0143（UI-2-0123 子項）：幕府大廳設計稿 .fx 季節粒子改由 runtime 特效繪製
/**
 * HallSeasonFx — 大廳季節粒子的資料與逐幀推進，純 TS，不依賴 cc。
 *
 * 產生：照設計稿用固定種子的偽亂數撒在整張畫布（數量、大小、透明度來自 hall-season-fx.json），
 *       夏季螢火用固定尺寸。
 * 推進：每顆依季節的下落速度與橫向漂移移動，另加正弦左右擺動；出畫布一側就從另一側繞回，數量不變。
 * 座標為中心原點、y 向上（與 Cocos UI 節點一致）。
 * Unity 對照：像 ParticleSystem 的 Emission＋Velocity over Lifetime，只是自己算位置、交給 View 畫。
 */

export type HallSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface HallSeasonStyle {
    color: string;
    /** 非 null 時所有粒子用這個寬高（夏季螢火）。 */
    fixedSize: number | null;
    glowPx: number;
    /** 每秒下落像素，負值為上飄。 */
    fallPx: number;
    /** 每秒橫向漂移像素。 */
    driftPx: number;
    swayPx: number;
    swayPeriodSec: number;
}

export interface HallSeasonFxConfig {
    canvas: { width: number; height: number };
    count: number;
    seed: number;
    size: { min: number; max: number; aspect: number };
    opacity: { min: number; max: number };
    seasons: Record<HallSeason, HallSeasonStyle>;
}

export interface HallSeasonParticle {
    /** 不含擺動的基準位置。 */
    baseX: number;
    y: number;
    width: number;
    height: number;
    rotationDeg: number;
    opacity: number;
    /** 擺動相位（秒）。 */
    phaseSec: number;
}

/** 與設計稿相同的偽亂數：sin(k * 12.9898) * 43758.5453 取小數。 */
function designRandom(seed: number): () => number {
    let k = Math.floor(seed * 1000);
    return () => {
        const x = Math.sin(++k * 12.9898) * 43758.5453;
        return x - Math.floor(x);
    };
}

export function spawnHallSeasonParticles(config: Readonly<HallSeasonFxConfig>, season: HallSeason): HallSeasonParticle[] {
    const rnd = designRandom(config.seed);
    const style = config.seasons[season];
    const { width: W, height: H } = config.canvas;
    const period = style.swayPeriodSec > 0 ? style.swayPeriodSec : 1;
    const out: HallSeasonParticle[] = [];
    for (let i = 0; i < config.count; i++) {
        const z = config.size.min + rnd() * (config.size.max - config.size.min);
        const x = rnd() * W - W / 2;
        const y = H / 2 - rnd() * H;
        const rotationDeg = rnd() * 360;
        const opacity = config.opacity.min + rnd() * (config.opacity.max - config.opacity.min);
        const fixed = style.fixedSize;
        out.push({
            baseX: x,
            y,
            width: fixed ?? z,
            height: fixed ?? z * config.size.aspect,
            rotationDeg,
            opacity,
            phaseSec: (i / Math.max(1, config.count)) * period,
        });
    }
    return out;
}

/** 推進一幀（就地更新），回傳同一個陣列。 */
export function stepHallSeasonParticles(
    particles: HallSeasonParticle[],
    config: Readonly<HallSeasonFxConfig>,
    season: HallSeason,
    dtSec: number,
): HallSeasonParticle[] {
    const style = config.seasons[season];
    const halfW = config.canvas.width / 2;
    const halfH = config.canvas.height / 2;
    for (const p of particles) {
        p.y -= style.fallPx * dtSec;
        p.baseX += style.driftPx * dtSec;
        p.phaseSec += dtSec;
        const marginY = p.height;
        const marginX = p.width + style.swayPx;
        if (p.y < -halfH - marginY) p.y += config.canvas.height + marginY * 2;
        else if (p.y > halfH + marginY) p.y -= config.canvas.height + marginY * 2;
        if (p.baseX < -halfW - marginX) p.baseX += config.canvas.width + marginX * 2;
        else if (p.baseX > halfW + marginX) p.baseX -= config.canvas.width + marginX * 2;
    }
    return particles;
}

/** 含擺動的繪製位置。 */
export function hallSeasonParticleX(p: Readonly<HallSeasonParticle>, style: Readonly<HallSeasonStyle>): number {
    const period = style.swayPeriodSec > 0 ? style.swayPeriodSec : 1;
    return p.baseX + Math.sin((p.phaseSec / period) * Math.PI * 2) * style.swayPx;
}
