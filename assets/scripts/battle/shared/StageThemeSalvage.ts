// @spec-source → 戰場四大主題關卡機制與戰術物資結算規格書.md（doc_spec_0353）；PROG-2-2039
/**
 * StageThemeSalvage — 四主題關卡配置與戰術物資結算（純邏輯，不依賴 cc）
 *
 * - §1 四主題（峽谷／水淹／夜襲／森林埋伏）的關鍵物件數量與夜襲視野。
 * - §2 SalvageGain = 基礎獎勵 + 物件加成 + 斬將加成；戰中只暫存，按「收兵回營」才一次寫入。
 * - §3 無陣亡大勝 ×1.2，向下取整。
 * 糧草記入既有 SalvageTotals.supply（見 StageSalvage：補給即糧草）。
 */
import type { SalvageTotals } from '../../core/systems/StrategistHud';
import { addStageSalvage, emptyStageSalvage } from './StageSalvage';

export type StageThemeId = 'Canyon' | 'Floodgate' | 'Night_Raid' | 'Ambush';
export type StageThemeObjectType = 'Rockfall_Node' | 'Floodgate' | 'Camp_Target' | 'Trap_Cluster';

export interface StageThemeConfig {
    themeId: StageThemeId;
    keyObjectType: StageThemeObjectType;
    keyObjectCount: number;
    /** 夜襲視野半徑（格）；其他主題不限 */
    visionRadius: number | null;
}

export const STAGE_THEME_CONFIGS: Readonly<Record<StageThemeId, StageThemeConfig>> = {
    Canyon: { themeId: 'Canyon', keyObjectType: 'Rockfall_Node', keyObjectCount: 2, visionRadius: null },
    Floodgate: { themeId: 'Floodgate', keyObjectType: 'Floodgate', keyObjectCount: 1, visionRadius: null },
    Night_Raid: { themeId: 'Night_Raid', keyObjectType: 'Camp_Target', keyObjectCount: 2, visionRadius: 3 },
    Ambush: { themeId: 'Ambush', keyObjectType: 'Trap_Cluster', keyObjectCount: 3, visionRadius: null },
};

/** 主題關的玩家視野半徑；不是四主題或該主題不限時回傳 null */
export function stageThemeVisionRadius(themeId: string | undefined): number | null {
    if (!themeId || !Object.prototype.hasOwnProperty.call(STAGE_THEME_CONFIGS, themeId)) return null;
    return STAGE_THEME_CONFIGS[themeId as StageThemeId].visionRadius;
}

/** §2 物件與斬將加成 */
export const SALVAGE_STONE_PER_ROCKFALL = 150;
export const SALVAGE_WOOD_PER_CAMP_OR_GATE = 200;
export const SALVAGE_GRAIN_PER_GRANARY = 500;
export const SALVAGE_INTEL_PER_GENERAL_KILL = 1;
export const FLAWLESS_VICTORY_MULTIPLIER = 1.2;

export interface StageBattleTally {
    rockfallsDestroyed: number;
    campsOrGatesTaken: number;
    granariesTaken: number;
    generalsKilled: number;
}

export interface StageSalvageResult {
    gain: SalvageTotals;
    isFlawlessVictory: boolean;
}

function count(n: number): number {
    return Math.max(0, Math.floor(n));
}

export function computeStageSalvage(base: Partial<SalvageTotals>, tally: StageBattleTally, isFlawlessVictory: boolean): StageSalvageResult {
    const gain = emptyStageSalvage();
    addStageSalvage(gain, base);
    addStageSalvage(gain, {
        stone: count(tally.rockfallsDestroyed) * SALVAGE_STONE_PER_ROCKFALL,
        wood: count(tally.campsOrGatesTaken) * SALVAGE_WOOD_PER_CAMP_OR_GATE,
        supply: count(tally.granariesTaken) * SALVAGE_GRAIN_PER_GRANARY,
        intel: count(tally.generalsKilled) * SALVAGE_INTEL_PER_GENERAL_KILL,
    });
    if (isFlawlessVictory) {
        for (const key of Object.keys(gain) as (keyof SalvageTotals)[]) {
            gain[key] = Math.floor(gain[key] * FLAWLESS_VICTORY_MULTIPLIER);
        }
    }
    return { gain, isFlawlessVictory };
}

/** 倉庫寫入接口；commit 一次呼叫，失敗時呼叫端不得部分寫入 */
export type SalvageWarehouseWriter = (gain: SalvageTotals) => void;

/** §2 戰中暫存：只有 commitOnReturn（收兵回營）才寫倉庫；退出或失敗一律丟棄 */
export class StageSalvageSession {
    private _pending: SalvageTotals = emptyStageSalvage();
    private _closed = false;

    public stage(gain: Partial<SalvageTotals>): void {
        if (this._closed) return;
        addStageSalvage(this._pending, gain);
    }

    public pending(): SalvageTotals {
        return { ...this._pending };
    }

    public abandon(): void {
        this._closed = true;
        this._pending = emptyStageSalvage();
    }

    /** 回傳是否寫入；同一場只寫一次 */
    public commitOnReturn(writer: SalvageWarehouseWriter): boolean {
        if (this._closed) return false;
        this._closed = true;
        writer({ ...this._pending });
        return true;
    }
}
