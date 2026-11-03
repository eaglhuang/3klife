// @spec-source → UI-2-0123／UI-2-0126（幕府大廳勢力圖：平時縮小、事件聚焦、開 UI 時關閉）
/**
 * HallMapFocusPlanner — 大廳勢力圖的縮放聚焦規劃（純邏輯，不依賴 cc）。
 *
 * - 版面三態（mini／focus／hidden）、放大倍率、停留秒數全部來自 hall-map-layout.json，程式不寫死數字。
 * - 州的中心點來自 han13-provinces.json 的 centroid（0~1，原點左上）。
 * - 輸出是與引擎無關的座標：地圖圖層相對視窗左上的位移與事件標記位置，Cocos／Unity 各自換算到自己的座標系。
 * - 換季時把事件排成聚焦序列；查不到的州直接略過，不丟錯，播完回到 mini。
 *
 * Unity 對照：像 Cinemachine 的鏡頭序列。這裡只算出每一站的 Follow 目標與停留時間，
 * 實際的 tween 交給場景元件去播。
 */

export type HallMapMode = 'mini' | 'focus' | 'hidden';

export interface HallMapModeRect {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
    visible: boolean;
}

export interface HallMapLayout {
    modes: Record<HallMapMode, HallMapModeRect>;
    transitionSec: number;
    seasonTurn: { dwellSec: number; maxEvents: number };
    /** 事件標記在視窗左側這個比例以內時，標籤改放右邊，避免超出地圖。 */
    labelSideSplit: number;
}

/** 州 id → 中心點（0~1，原點左上）。 */
export type HallProvinceCentroids = Record<string, readonly [number, number]>;

export interface HallMapFocusFrame {
    provinceId: string;
    /** 地圖圖層（放大後）左上角相對視窗左上的位移，≤ 0。 */
    contentOffsetX: number;
    contentOffsetY: number;
    /** 事件標記在設計解析度中的位置（含視窗本身的 x／y）。 */
    pingX: number;
    pingY: number;
    labelSide: 'left' | 'right';
}

export interface HallMapEvent {
    provinceId: string;
    label: string;
    glyph: string;
}

export interface HallMapTurnStep {
    mode: HallMapMode;
    startSec: number;
    event: HallMapEvent | null;
    focus: HallMapFocusFrame | null;
}

function clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
}

/** 把 han13-provinces.json 的 provinces[] 轉成 id → centroid 對照；缺 centroid 的州不收。 */
export function readProvinceCentroids(
    provinces: ReadonlyArray<{ id: string; centroid?: readonly number[] }>,
): HallProvinceCentroids {
    const out: HallProvinceCentroids = {};
    for (const p of provinces) {
        if (p.centroid && p.centroid.length >= 2) out[p.id] = [p.centroid[0], p.centroid[1]];
    }
    return out;
}

/**
 * 算出聚焦某州時地圖圖層的位移與事件標記位置。
 * 放大後盡量讓州中心落在視窗正中；靠邊的州會被夾住，不露出圖外空白，標記跟著偏離中心。
 */
export function computeHallMapFocus(
    provinceId: string,
    centroids: HallProvinceCentroids,
    layout: HallMapLayout,
): HallMapFocusFrame | null {
    const c = centroids[provinceId];
    if (!c) return null;
    const rect = layout.modes.focus;
    const zoom = Math.max(1, rect.zoom);
    const contentW = rect.width * zoom;
    const contentH = rect.height * zoom;
    // 與 CSS background-position 同一公式：p = (c·Z − 0.5)/(Z − 1)，夾在 0~1。
    const px = zoom > 1 ? clamp01((c[0] * zoom - 0.5) / (zoom - 1)) : 0.5;
    const py = zoom > 1 ? clamp01((c[1] * zoom - 0.5) / (zoom - 1)) : 0.5;
    const contentOffsetX = px * (rect.width - contentW);
    const contentOffsetY = py * (rect.height - contentH);
    const pingX = rect.x + contentOffsetX + c[0] * contentW;
    const pingY = rect.y + contentOffsetY + c[1] * contentH;
    const labelSide = pingX < rect.x + rect.width * layout.labelSideSplit ? 'right' : 'left';
    return { provinceId, contentOffsetX, contentOffsetY, pingX, pingY, labelSide };
}

/**
 * 換季（或下勢力指令）時的聚焦序列：每個事件一站 focus，最後一站回到 mini。
 * 查不到的州略過；超過 maxEvents 的事件不播（留給事件列表顯示）。沒有可播事件時只回一站 mini。
 */
export function planHallMapTurn(
    events: ReadonlyArray<HallMapEvent>,
    centroids: HallProvinceCentroids,
    layout: HallMapLayout,
): HallMapTurnStep[] {
    const steps: HallMapTurnStep[] = [];
    const { dwellSec, maxEvents } = layout.seasonTurn;
    let t = 0;
    for (const event of events) {
        if (steps.length >= maxEvents) break;
        const focus = computeHallMapFocus(event.provinceId, centroids, layout);
        if (!focus) continue;
        steps.push({ mode: 'focus', startSec: t, event, focus });
        t += dwellSec;
    }
    steps.push({ mode: 'mini', startSec: t, event: null, focus: null });
    return steps;
}
