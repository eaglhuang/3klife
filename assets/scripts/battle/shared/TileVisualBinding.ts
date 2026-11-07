// @spec-source → 戰場地格動態圖層VFX與Decal掛載規格書.md（doc_spec_0348）；PROG-2-2034
/**
 * TileVisualBinding — 地格效果標籤 → 貼花／粒子／音效的綁定表與池化配額（純邏輯，不依賴 cc）
 *
 * - §1 戰鬥邏輯只給 effectTag；這裡回傳資源路徑，實際掛節點由畫面端做。
 * - §3 池化：Decal 16、VFX 8，戰鬥中不新建；超過配額就不再配發。
 * - §3 FPS < 30 時關閉 VFX，只保留 Decal。
 * 註冊表用實例而非 static（與 FormulaRuntime 一致，測試可各自建立）。
 */

export type TileVisualPlayMode = 'loop' | 'once';

export interface TileVisualConfig {
    effectTag: string;
    decalFramePath: string;
    vfxPrefabPath: string;
    playMode: TileVisualPlayMode;
    /** once 模式的長度（秒） */
    durationSec?: number;
    sfxLoopCue?: string;
}

/** §2 預設四組 */
export const DEFAULT_TILE_VISUALS: readonly TileVisualConfig[] = [
    { effectTag: 'hazard_fire', decalFramePath: 'sprites/battle/decal/decal_ground_scorched', vfxPrefabPath: 'vfx/vfx_flame_burst', playMode: 'loop', sfxLoopCue: 'sfx_fire_burn_loop' },
    { effectTag: 'hazard_poison', decalFramePath: 'sprites/battle/decal/decal_ground_toxic', vfxPrefabPath: 'vfx/vfx_poison_mist', playMode: 'loop', sfxLoopCue: 'sfx_acid_bubble' },
    { effectTag: 'force_move_water', decalFramePath: 'sprites/battle/decal/decal_water_ripple', vfxPrefabPath: 'vfx/vfx_water_surge', playMode: 'once', durationSec: 0.4, sfxLoopCue: 'sfx_water_flood' },
    { effectTag: 'stealth_mist', decalFramePath: 'sprites/battle/decal/decal_mist_patch', vfxPrefabPath: 'vfx/vfx_dense_fog', playMode: 'loop', sfxLoopCue: 'sfx_wind_whistle' },
];

export const TILE_VISUAL_POOL = { decal: 16, vfx: 8 };
/** §3 淡出秒數（opacity 255 → 0） */
export const TILE_VISUAL_FADE_OUT_SEC = 0.3;
/** §3 低於此 FPS 關閉 VFX */
export const TILE_VFX_MIN_FPS = 30;

export class TileVisualRegistry {
    private readonly _configs = new Map<string, TileVisualConfig>();

    constructor(configs: readonly TileVisualConfig[] = DEFAULT_TILE_VISUALS) {
        for (const config of configs) this.register(config);
    }

    public register(config: TileVisualConfig): void {
        this._configs.set(config.effectTag, config);
    }

    public get(effectTag: string): TileVisualConfig | undefined {
        return this._configs.get(effectTag);
    }
}

export function shouldShowTileVfx(fps: number): boolean {
    return fps >= TILE_VFX_MIN_FPS;
}

/** 一個地格目前佔用的池槽 */
export interface TileVisualLease {
    tileKey: string;
    effectTag: string;
    hasVfx: boolean;
}

/**
 * 池化配額：同一格同時只掛一組；配額用完時 acquire 回 null（不新建節點）。
 * release 由畫面端在 0.3 秒淡出完成後呼叫。
 */
export class TileVisualPool {
    private readonly _active = new Map<string, TileVisualLease>();
    private _vfxInUse = 0;

    constructor(private readonly _capacity = TILE_VISUAL_POOL) {}

    public acquire(tileKey: string, effectTag: string, showVfx: boolean): TileVisualLease | null {
        if (this._active.has(tileKey)) this.release(tileKey);
        if (this._active.size >= this._capacity.decal) return null;
        const hasVfx = showVfx && this._vfxInUse < this._capacity.vfx;
        const lease = { tileKey, effectTag, hasVfx };
        this._active.set(tileKey, lease);
        if (hasVfx) this._vfxInUse++;
        return lease;
    }

    public release(tileKey: string): boolean {
        const lease = this._active.get(tileKey);
        if (!lease) return false;
        this._active.delete(tileKey);
        if (lease.hasVfx) this._vfxInUse--;
        return true;
    }

    public get activeDecals(): number {
        return this._active.size;
    }

    public get activeVfx(): number {
        return this._vfxInUse;
    }
}
