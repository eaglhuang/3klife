/**
 * LightingTable.ts — 乘色表資料型別、解析與查詢（資料檔：assets/resources/data/life-lighting.json）。
 * 純邏輯，不依賴 Cocos。乘色、時鐘、轉場秒數、疊層清單全部由 JSON 決定。
 */
export type LightingSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export type LightingPhaseId = 'dawn' | 'day' | 'dusk' | 'night';

export const LIGHTING_PHASES: readonly LightingPhaseId[] = ['dawn', 'day', 'dusk', 'night'];

export interface RGB { r: number; g: number; b: number }

export interface LightingSlotDef { id: number; key: string; startHour: number; endHour: number }

export interface LightingTable {
    seasons: LightingSeason[];
    seasonClock: Record<LightingSeason, { nightStart: number; dawnStart: number }>;
    dawnDurationHours: number;
    duskLeadHours: number;
    slots: LightingSlotDef[];
    phaseTint: Record<LightingPhaseId, Record<LightingSeason, RGB>>;
    lightIntensity: Record<LightingPhaseId, number>;
    deepNightMultiplier: number;
    deepNightLightTags: string[];
    transition: { autoSeconds: number; manualSeconds: number; seasonSeconds: number };
    overlays: { seasonal: Record<LightingSeason, string[]>; atmosphere: string[] };
}

/** "FFE6D2" 或 "#FFE6D2" → RGB（0～255） */
export function parseHexColor(hex: string): RGB {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!m) throw new Error(`[LightingTable] 非法色碼：${hex}`);
    const v = parseInt(m[1], 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function need(cond: unknown, msg: string): void {
    if (!cond) throw new Error(`[LightingTable] ${msg}`);
}

/** 驗證並轉成執行期結構；壞資料丟出明確錯誤（含欄位路徑） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseLightingTable(raw: any): LightingTable {
    need(raw && typeof raw === 'object', '根節點必須是物件');
    const seasons = raw.seasons as LightingSeason[];
    need(Array.isArray(seasons) && seasons.length > 0, 'seasons 不可為空');
    const phaseTint = {} as LightingTable['phaseTint'];
    const lightIntensity = {} as LightingTable['lightIntensity'];
    for (const ph of LIGHTING_PHASES) {
        need(raw.phaseTint && raw.phaseTint[ph], `phaseTint.${ph} 缺漏`);
        need(raw.lightIntensity && typeof raw.lightIntensity[ph] === 'number', `lightIntensity.${ph} 缺漏`);
        phaseTint[ph] = {} as Record<LightingSeason, RGB>;
        for (const s of seasons) phaseTint[ph][s] = parseHexColor(raw.phaseTint[ph][s]);
        lightIntensity[ph] = raw.lightIntensity[ph];
    }
    const seasonClock = {} as LightingTable['seasonClock'];
    const seasonal = {} as LightingTable['overlays']['seasonal'];
    const ovSeasonal = raw.overlays && raw.overlays.seasonal;
    for (const s of seasons) {
        const c = raw.seasonClock && raw.seasonClock[s];
        need(c && typeof c.nightStart === 'number' && typeof c.dawnStart === 'number', `seasonClock.${s} 缺漏`);
        seasonClock[s] = { nightStart: c.nightStart, dawnStart: c.dawnStart };
        seasonal[s] = ovSeasonal && Array.isArray(ovSeasonal[s]) ? [...ovSeasonal[s]] : [];
    }
    need(Array.isArray(raw.slots) && raw.slots.length > 0, 'slots 不可為空');
    for (const k of ['dawnDurationHours', 'duskLeadHours', 'deepNightMultiplier']) {
        need(typeof raw[k] === 'number', `${k} 必須是數字`);
    }
    const tr = raw.transition;
    need(tr && tr.autoSeconds > 0 && tr.manualSeconds > 0 && tr.seasonSeconds > 0, 'transition 三個秒數須為正數');
    const atmosphere = raw.overlays && Array.isArray(raw.overlays.atmosphere) ? [...raw.overlays.atmosphere] : [];
    return {
        seasons,
        seasonClock,
        dawnDurationHours: raw.dawnDurationHours,
        duskLeadHours: raw.duskLeadHours,
        slots: raw.slots.map((s: LightingSlotDef) => ({ id: s.id, key: s.key, startHour: s.startHour, endHour: s.endHour })),
        phaseTint,
        lightIntensity,
        deepNightMultiplier: raw.deepNightMultiplier,
        deepNightLightTags: Array.isArray(raw.deepNightLightTags) ? [...raw.deepNightLightTags] : [],
        transition: { autoSeconds: tr.autoSeconds, manualSeconds: tr.manualSeconds, seasonSeconds: tr.seasonSeconds },
        overlays: { seasonal, atmosphere },
    };
}

export interface LightingTarget extends RGB {
    /** 光源強度 0～1 */
    intensity: number;
}

/** 某階段＋季節的目標乘色與光源強度；深夜乘色再乘 deepNightMultiplier */
export function resolveLightingTarget(
    table: LightingTable, phase: LightingPhaseId, season: LightingSeason, deepNight: boolean,
): LightingTarget {
    const base = table.phaseTint[phase][season];
    const k = deepNight ? table.deepNightMultiplier : 1;
    return { r: base.r * k, g: base.g * k, b: base.b * k, intensity: table.lightIntensity[phase] };
}

/** 深夜時某光源 tag 是否仍亮（客棧、酒館、戲館、賭坊、守夜處、路燈） */
export function isLightOnInDeepNight(table: LightingTable, tag: string): boolean {
    return table.deepNightLightTags.includes(tag);
}
