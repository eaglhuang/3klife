// @spec-source → UI-2-0143（UI-2-0123 子項）：幕府大廳季節粒子 runtime 特效
/**
 * HallSeasonFxLayer — 大廳季節粒子的畫面元件（薄殼）。
 *
 * 粒子資料與推進在 HallSeasonFx，這裡每幀用同一個 Graphics 重畫全部粒子（一個 draw call）。
 * 掛在大廳畫布下、與畫布同大小的中心錨點節點；換季呼叫 setSeason，重新撒一次粒子。
 * Unity 對照：像一個只負責 Draw 的 ParticleSystemRenderer，模擬交給純 C# 類別。
 */
import { _decorator, Color, Component, Graphics, sys } from 'cc';
import {
    HallSeason,
    HallSeasonFxConfig,
    HallSeasonParticle,
    hallSeasonDrawsGlow,
    hallSeasonParticleCount,
    hallSeasonParticleX,
    HALL_FX_REDRAW_INTERVAL_SEC,
    spawnHallSeasonParticles,
    stepHallSeasonParticles,
} from '../../core/systems/HallSeasonFx';

const { ccclass } = _decorator;

@ccclass('HallSeasonFxLayer')
export class HallSeasonFxLayer extends Component {
    private _config: HallSeasonFxConfig | null = null;
    private _season: HallSeason | null = null;
    private _particles: HallSeasonParticle[] = [];
    private _graphics: Graphics | null = null;
    private _color = new Color();
    /** 距上次重畫累積的時間（秒）；累到間隔才推進並重畫 */
    private _pendingDt = 0;
    private readonly _fill = new Color();

    public configure(config: HallSeasonFxConfig): void {
        this._config = config;
        if (this._season) this.setSeason(this._season);
    }

    public setSeason(season: HallSeason): void {
        this._season = season;
        if (!this._config) return;
        this._particles = spawnHallSeasonParticles(this._config, season, hallSeasonParticleCount(this._config, sys.isMobile));
        this._pendingDt = 0;
        Color.fromHEX(this._color, this._config.seasons[season].color);
        this._draw();
    }

    public clear(): void {
        this._particles = [];
        this._graphics?.clear();
    }

    protected onLoad(): void {
        this._graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
    }

    protected update(dt: number): void {
        if (!this._config || !this._season || this._particles.length === 0) return;
        // 降頻：累到約 1/30 秒才推進一次並重畫，推進時帶入累積時間，速度不變
        this._pendingDt += dt;
        if (this._pendingDt < HALL_FX_REDRAW_INTERVAL_SEC) return;
        const step = Math.min(this._pendingDt, 0.25);
        this._pendingDt = 0;
        stepHallSeasonParticles(this._particles, this._config, this._season, step);
        this._draw();
    }

    private _draw(): void {
        const g = this._graphics;
        const config = this._config;
        const season = this._season;
        if (!g || !config || !season) return;
        const style = config.seasons[season];
        g.clear();
        const glow = hallSeasonDrawsGlow(style);
        const fill = this._fill;
        for (const p of this._particles) {
            const x = hallSeasonParticleX(p, style);
            // 重用同一個 Color，不在每顆每幀 new（手機 GC 壓力）
            if (glow) {
                fill.set(this._color.r, this._color.g, this._color.b, Math.round(p.opacity * 255 * 0.25));
                g.fillColor = fill;
                g.ellipse(x, p.y, p.width / 2 + style.glowPx, p.height / 2 + style.glowPx);
                g.fill();
            }
            fill.set(this._color.r, this._color.g, this._color.b, Math.round(p.opacity * 255));
            g.fillColor = fill;
            g.ellipse(x, p.y, p.width / 2, p.height / 2);
            g.fill();
        }
    }
}
