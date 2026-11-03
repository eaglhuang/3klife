// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（武將點位刷新池）；幕府大廳 Q 版站位（UI-2-0136，UI-2-0123 子項）
/**
 * HallStagePlanner — 把點位上的武將（HallCharacterPresenter 的 spotIds）排到幕府大廳舞台上，純 TS，不依賴 cc。
 *
 * 站位、填位順序、面向中心線與圖檔候選路徑全部來自 hall-stage-spots.json，程式只負責套規則：
 * - 依 fillOrder 依序佔位，人數超過點位數時多的略過。
 * - 站在 faceCenterX 右側的人翻面，讓全員面向大廳中央。
 * - 輸出依腳底 y 由小到大排序（後排先畫、前排後畫）。
 * - 圖檔回傳候選清單（Q 版優先、頭像其次），由 View 依序嘗試載入。
 * Unity 對照：像把 spawn point 清單做成 ScriptableObject，Planner 只回傳每個角色的 Transform 與 Sprite 候選。
 */

export interface HallStageSpot {
    id: string;
    /** 腳底中心 x（設計座標，左上原點）。 */
    footX: number;
    /** 腳底 y（設計座標，左上原點，向下為正）。 */
    footY: number;
    /** 顯示高度（px）。 */
    height: number;
}

export interface HallStageLayout {
    canvas: { width: number; height: number };
    faceCenterX: number;
    spots: HallStageSpot[];
    fillOrder: string[];
    /** 圖檔路徑樣板，`{snake}` 會換成底線版武將 id。 */
    spriteCandidates: string[];
}

export interface HallStageGeneral {
    id: string;
    name: string;
    title?: string;
}

export interface HallStagePlacement {
    generalId: string;
    spotId: string;
    name: string;
    title: string | null;
    footX: number;
    footY: number;
    /** 中心原點、y 向上的腳底座標，給 Cocos 節點直接用。 */
    stageX: number;
    stageY: number;
    height: number;
    flip: boolean;
    hasTaskMark: boolean;
    spriteCandidates: string[];
}

/** kebab 版武將 id（zhang-fei）轉成資源檔名用的底線版（zhang_fei）。 */
export function generalIdToSnake(id: string): string {
    return id.trim().toLowerCase().replace(/[-\s]+/g, '_');
}

/**
 * 排出大廳舞台站位。不改輸入。
 * generals 依點位順序傳入（通常就是 spotIds 對應的武將）；taskMarkIds 為頭上要顯示「!」的武將。
 */
export function planHallStage(
    generals: readonly HallStageGeneral[],
    layout: Readonly<HallStageLayout>,
    taskMarkIds: ReadonlySet<string> = new Set(),
): HallStagePlacement[] {
    const spotById = new Map(layout.spots.map(s => [s.id, s] as const));
    const order = layout.fillOrder.filter(id => spotById.has(id));
    const halfW = layout.canvas.width / 2;
    const halfH = layout.canvas.height / 2;

    const placements: HallStagePlacement[] = [];
    const seen = new Set<string>();
    for (const general of generals) {
        if (placements.length >= order.length) break;
        if (seen.has(general.id)) continue;
        seen.add(general.id);
        const spot = spotById.get(order[placements.length])!;
        const snake = generalIdToSnake(general.id);
        placements.push({
            generalId: general.id,
            spotId: spot.id,
            name: general.name,
            title: general.title ? general.title : null,
            footX: spot.footX,
            footY: spot.footY,
            stageX: spot.footX - halfW,
            stageY: halfH - spot.footY,
            height: spot.height,
            flip: spot.footX > layout.faceCenterX,
            hasTaskMark: taskMarkIds.has(general.id),
            spriteCandidates: layout.spriteCandidates.map(t => t.split('{snake}').join(snake)),
        });
    }
    return placements.sort((a, b) => a.footY - b.footY);
}
