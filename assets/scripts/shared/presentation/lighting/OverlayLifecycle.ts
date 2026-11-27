/**
 * OverlayLifecycle.ts — 疊層載入／卸載生命週期（QLIFE-01 第 3.5.7 節）。純邏輯，不依賴 Cocos。
 *
 * 規則：
 *   1. 只常駐「當季」的疊層、補丁、樹枝、粒子；其餘三季不載入。
 *   2. 光源圖集與星空（atmosphere）只在需要的時段前後持有：
 *      需要＝該時段階段為 晨／昏／夜（光源強度 > 0）。
 *      提前一個時段載入（昏階段前一個時段），晚一個時段卸載（晨階段後一個時段），
 *      讓前後 15 秒的 lerp 淡入淡出不會因為資源被卸載而閃爍。
 *      日間（前後時段都不需要）完全不持有。
 *   3. 實際載入／卸載由外部 IOverlayLoader 執行（Cocos 端接 resources.load／release），此處只算差集。
 */
import { phaseOfSlot } from './LightingPhase';
import type { LightingSeason, LightingTable } from './LightingTable';

export interface IOverlayLoader {
    load(id: string): void;
    unload(id: string): void;
}

/** 時段 id 環狀相鄰：1→2→…→7→1（晨、上午、午、下午、傍晚、夜、深夜） */
function neighborSlots(table: LightingTable, slot: number): { prev: number; next: number } {
    const ids = table.slots.map(s => s.id);
    const i = ids.indexOf(slot);
    if (i < 0) throw new Error(`[OverlayLifecycle] 未知時段：${slot}`);
    return { prev: ids[(i - 1 + ids.length) % ids.length], next: ids[(i + 1) % ids.length] };
}

/** 此時段本身需要光源（階段非日間） */
export function slotNeedsLights(table: LightingTable, season: LightingSeason, slot: number): boolean {
    return phaseOfSlot(table, season, slot).phase !== 'day';
}

/** 光源圖集與星空是否應被持有（含前一個時段預載、後一個時段延遲卸載） */
export function shouldHoldAtmosphere(table: LightingTable, season: LightingSeason, slot: number): boolean {
    const { prev, next } = neighborSlots(table, slot);
    return slotNeedsLights(table, season, slot)
        || slotNeedsLights(table, season, next)
        || slotNeedsLights(table, season, prev);
}

/** 該季＋時段應持有的疊層 id 清單（當季疊層＋視時段而定的光源／星空） */
export function desiredOverlayIds(table: LightingTable, season: LightingSeason, slot: number): string[] {
    const ids = [...table.overlays.seasonal[season]];
    if (shouldHoldAtmosphere(table, season, slot)) ids.push(...table.overlays.atmosphere);
    return ids;
}

export class OverlayLifecycle {
    private readonly heldSet = new Set<string>();

    constructor(private readonly table: LightingTable, private readonly loader: IOverlayLoader) {}

    /** 依當季與時段同步：先卸載不再需要的，再載入新增的（卸載優先，避免峰值記憶體疊加） */
    sync(season: LightingSeason, slot: number): void {
        const want = new Set(desiredOverlayIds(this.table, season, slot));
        for (const id of Array.from(this.heldSet)) {
            if (!want.has(id)) {
                this.heldSet.delete(id);
                this.loader.unload(id);
            }
        }
        want.forEach(id => {
            if (!this.heldSet.has(id)) {
                this.heldSet.add(id);
                this.loader.load(id);
            }
        });
    }

    held(): string[] {
        return Array.from(this.heldSet);
    }

    isHeld(id: string): boolean {
        return this.heldSet.has(id);
    }

    /** 離開生活層：全部卸載 */
    releaseAll(): void {
        for (const id of Array.from(this.heldSet)) this.loader.unload(id);
        this.heldSet.clear();
    }
}
