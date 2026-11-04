// @spec-source → UI-2-0123／UI-2-0126（換季時勢力圖逐州聚焦事件）；UI-2-0151
/**
 * HallMapSeasonTurn — 他國季事件一路轉成大廳勢力圖的聚焦序列（純邏輯，不依賴 cc）。
 *
 * 串起 HallMapEventMapper（勢力事件 → 地圖事件）與 HallMapFocusPlanner（地圖事件 → 鏡頭序列）；
 * 勢力名、州名由呼叫端給，州中心取自 han13-provinces.json。
 *
 * Unity 對照：像把 GameEvent 交給 Timeline 產生器，回傳一段可直接播放的 PlayableAsset。
 */
import { HallMapEventCatalog, HallMapSourceEvent, mapSeasonEventsToHallMap } from './HallMapEventMapper';
import { HallMapLayout, HallMapTurnStep, planHallMapTurn, readProvinceCentroids } from './HallMapFocusPlanner';

export interface HallMapProvinceSource {
    readonly id: string;
    readonly name?: string;
    readonly centroid?: readonly number[];
}

export interface HallMapSeasonTurnConfig {
    readonly layout: HallMapLayout;
    readonly catalog: HallMapEventCatalog;
    readonly provinces: readonly HallMapProvinceSource[];
    readonly nationName: (id: string) => string | undefined;
}

export function buildHallMapTurnSteps(
    events: ReadonlyArray<HallMapSourceEvent>,
    config: HallMapSeasonTurnConfig,
): HallMapTurnStep[] {
    const names = new Map(config.provinces.map((p) => [p.id, p.name]));
    const mapEvents = mapSeasonEventsToHallMap(events, config.catalog, {
        nationName: config.nationName,
        provinceName: (id) => names.get(id),
    });
    return planHallMapTurn(mapEvents, readProvinceCentroids(config.provinces), config.layout);
}

/** 序列裡有沒有要聚焦的事件（只有一站 mini 時不必播） */
export function hasHallMapFocus(steps: readonly HallMapTurnStep[]): boolean {
    return steps.some((s) => s.mode === 'focus');
}
