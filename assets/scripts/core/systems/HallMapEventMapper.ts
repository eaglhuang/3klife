// @spec-source → UI-2-0123／UI-2-0126（換季時勢力圖逐州聚焦事件）；他國勢力季度行動見 RivalNations
/**
 * HallMapEventMapper — 把他國勢力的季度事件轉成大廳勢力圖的聚焦事件（純邏輯，不依賴 cc）。
 *
 * - 勢力在哪一州、事件用什麼字章與標籤，全部來自 hall-map-events.json；程式不認識任何勢力或州名。
 * - 查不到根據地的勢力、或沒設定的事件種類，直接略過，不丟錯（地圖少播一站，事件列表照樣顯示）。
 * - 同一州同一種事件只播一次，避免一季內地圖在同一處來回。
 *
 * Unity 對照：像把 GameEvent 透過 ScriptableObject 對照表轉成鏡頭標記，事件系統本身不知道鏡頭存在。
 */
import type { HallMapEvent } from './HallMapFocusPlanner';

export interface HallMapEventKindStyle {
    glyph: string;
    /** 標籤樣板，可用 {nation}、{province}。 */
    label: string;
}

export interface HallMapEventCatalog {
    /** 勢力 id → 根據地州 id。 */
    nationSeats: Record<string, string>;
    eventKinds: Record<string, HallMapEventKindStyle>;
}

/** 呼叫端給的最小事件形狀（RivalNations.SeasonEvent 相容）。 */
export interface HallMapSourceEvent {
    nationId: string;
    kind: string;
}

export interface HallMapNameLookup {
    nationName(id: string): string | undefined;
    provinceName(id: string): string | undefined;
}

function fillTemplate(template: string, values: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

export function mapSeasonEventsToHallMap(
    events: ReadonlyArray<HallMapSourceEvent>,
    catalog: HallMapEventCatalog,
    names: HallMapNameLookup,
): HallMapEvent[] {
    const out: HallMapEvent[] = [];
    const seen = new Set<string>();
    for (const e of events) {
        const provinceId = catalog.nationSeats[e.nationId];
        const style = catalog.eventKinds[e.kind];
        if (!provinceId || !style) continue;
        const key = `${provinceId}|${e.kind}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const label = fillTemplate(style.label, {
            nation: names.nationName(e.nationId) ?? e.nationId,
            province: names.provinceName(provinceId) ?? provinceId,
        });
        out.push({ provinceId, label, glyph: style.glyph });
    }
    return out;
}
