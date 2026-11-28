// @spec-source → Q版社會總規格書 QSOC-01 第 4 章、Q版生活系統規格書 QLIFE-01 第 4 章；PROG-2-10212
/**
 * SceneRegistry — 生活層場景註冊表（純邏輯，不依賴 cc）
 *
 * 職責：7 區、72 個場景 id、名稱 i18n key、所屬區、有無美術旗標；資料來自 life-area-maps.json。
 * 不負責：大圖載入、光照（WP5 life-lighting.json）、場景內人物與活動（WP3）。
 * 場景 id 一律「區代碼_名稱」，區代碼就是 id 底線前的前綴，用來防止資料寫錯區。
 */
import areaMapsData from '../../../resources/data/life-area-maps.json';

export type LifeAreaId = 'gov' | 'mil' | 'mkt' | 'edu' | 'home' | 'out' | 'mtn';

export interface LifeSceneDef {
    readonly id: string;
    readonly areaId: LifeAreaId;
    /** i18n key：life.scene.<id> */
    readonly nameKey: string;
    /** false＝尚未有美術，顯示通用佔位底圖＋施工中 */
    readonly hasArt: boolean;
    /** 子活動：不是獨立店面，而是某場景內的活動（例如驛站是馬市（一）的子活動）；值為母場景 id */
    readonly subActivityOf?: string;
}

export interface LifeAreaDef {
    readonly id: LifeAreaId;
    /** i18n key：life.scene.area.<id> */
    readonly nameKey: string;
    readonly order: number;
    readonly sceneIds: readonly string[];
}

export interface LifeAreaMapsData {
    schema: string;
    defaultSceneId: string;
    /** 市井大街熱區 id → 場景 id（QSOC-01 第 10.2 節；兩棟馬市都指向 mkt_horse） */
    hotspotToScene?: Record<string, string>;
    areas: Array<{
        id: string;
        nameKey: string;
        order: number;
        scenes: Array<{ id: string; nameKey: string; hasArt: boolean; subActivityOf?: string }>;
    }>;
}

export const LIFE_AREA_IDS: readonly LifeAreaId[] = ['gov', 'mil', 'mkt', 'edu', 'home', 'out', 'mtn'];
export const LIFE_SCENE_TOTAL = 72;

export function validateAreaMaps(data: LifeAreaMapsData): string[] {
    const errors: string[] = [];
    const seen = new Set<string>();
    const areaIds = new Set<string>();
    for (const area of data.areas) {
        if (!LIFE_AREA_IDS.includes(area.id as LifeAreaId)) errors.push(`unknown area id ${area.id}`);
        if (areaIds.has(area.id)) errors.push(`duplicate area id ${area.id}`);
        areaIds.add(area.id);
        if (area.nameKey !== `life.scene.area.${area.id}`) errors.push(`area ${area.id} nameKey mismatch`);
        for (const sc of area.scenes) {
            if (seen.has(sc.id)) errors.push(`duplicate scene id ${sc.id}`);
            seen.add(sc.id);
            if (!sc.id.startsWith(`${area.id}_`)) errors.push(`scene ${sc.id} prefix does not match area ${area.id}`);
            if (sc.nameKey !== `life.scene.${sc.id}`) errors.push(`scene ${sc.id} nameKey mismatch`);
        }
    }
    for (const id of LIFE_AREA_IDS) if (!areaIds.has(id)) errors.push(`missing area ${id}`);
    if (seen.size !== LIFE_SCENE_TOTAL) errors.push(`scene count should be ${LIFE_SCENE_TOTAL}, got ${seen.size}`);
    for (const area of data.areas) {
        for (const sc of area.scenes) {
            if (sc.subActivityOf !== undefined && (!seen.has(sc.subActivityOf) || sc.subActivityOf === sc.id)) {
                errors.push(`scene ${sc.id} subActivityOf ${sc.subActivityOf} not a registered parent scene`);
            }
        }
    }
    for (const [hotspot, sceneId] of Object.entries(data.hotspotToScene ?? {})) {
        if (!seen.has(sceneId)) errors.push(`hotspot ${hotspot} maps to unregistered scene ${sceneId}`);
    }
    if (!seen.has(data.defaultSceneId)) errors.push(`defaultSceneId ${data.defaultSceneId} not registered`);
    return errors;
}

export class SceneRegistry {
    private readonly _areas: LifeAreaDef[] = [];
    private readonly _scenes = new Map<string, LifeSceneDef>();
    private readonly _defaultSceneId: string;
    private readonly _hotspotToScene = new Map<string, string>();

    public constructor(data: LifeAreaMapsData = areaMapsData as unknown as LifeAreaMapsData) {
        const errors = validateAreaMaps(data);
        if (errors.length > 0) throw new Error(`[SceneRegistry] life-area-maps.json validation failed: ${errors.join('; ')}`);
        this._defaultSceneId = data.defaultSceneId;
        for (const [hotspot, sceneId] of Object.entries(data.hotspotToScene ?? {})) this._hotspotToScene.set(hotspot, sceneId);
        for (const area of [...data.areas].sort((a, b) => a.order - b.order)) {
            const areaId = area.id as LifeAreaId;
            this._areas.push({ id: areaId, nameKey: area.nameKey, order: area.order, sceneIds: area.scenes.map((s) => s.id) });
            for (const sc of area.scenes) {
                this._scenes.set(sc.id, { id: sc.id, areaId, nameKey: sc.nameKey, hasArt: sc.hasArt, subActivityOf: sc.subActivityOf });
            }
        }
    }

    public get defaultSceneId(): string { return this._defaultSceneId; }
    public get sceneCount(): number { return this._scenes.size; }

    public getAreas(): readonly LifeAreaDef[] { return this._areas; }

    public getArea(areaId: string): LifeAreaDef | undefined {
        return this._areas.find((a) => a.id === areaId);
    }

    public getScene(sceneId: string): LifeSceneDef | undefined {
        return this._scenes.get(sceneId);
    }

    /** 熱區 id 對應的場景 id；沒登記回 undefined */
    public sceneOfHotspot(hotspotId: string): string | undefined {
        return this._hotspotToScene.get(hotspotId);
    }

    /** 子活動（如驛站）回母場景 id；一般場景回 undefined */
    public parentSceneOf(sceneId: string): string | undefined {
        return this._scenes.get(sceneId)?.subActivityOf;
    }

    public hasScene(sceneId: string): boolean {
        return this._scenes.has(sceneId);
    }

    public areaOf(sceneId: string): LifeAreaId | undefined {
        return this._scenes.get(sceneId)?.areaId;
    }

    public getScenesOfArea(areaId: string): LifeSceneDef[] {
        const area = this.getArea(areaId);
        if (!area) return [];
        return area.sceneIds.map((id) => this._scenes.get(id) as LifeSceneDef);
    }

    public getAllScenes(): LifeSceneDef[] {
        return Array.from(this._scenes.values());
    }

    /** 區的「一鍵進入」目標：該區第一個場景 */
    public firstSceneOfArea(areaId: string): LifeSceneDef | undefined {
        return this.getScenesOfArea(areaId)[0];
    }
}

let _shared: SceneRegistry | null = null;
export function getSceneRegistry(): SceneRegistry {
    if (!_shared) _shared = new SceneRegistry();
    return _shared;
}
