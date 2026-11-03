// @spec-source → UI-2-0123／UI-2-0126（幕府大廳勢力圖：每一站聚焦的畫面姿態）
/**
 * HallMapStagePose — 把勢力圖的模式與聚焦站換算成畫面姿態（純邏輯，不依賴 cc）。
 *
 * - 輸入是 HallMapFocusPlanner 的設計座標（1920×1080，原點左上、y 向下）。
 * - 輸出是「畫布中心為原點、y 向上」的座標，Cocos 節點可直接拿來設 position；
 *   Unity 的 RectTransform 以中心錨點擺放時也是同一套數字。
 * - 三個節點：viewport（遮罩視窗）、content（地圖圖層，掛在 viewport 底下）、ping（事件標記，掛在畫布底下）。
 *
 * Unity 對照：像 ScrollRect 的 viewport／content 結構，content 的 localPosition 與 scale 決定看到地圖哪一塊。
 */
import type { HallMapFocusFrame, HallMapLayout, HallMapMode } from './HallMapFocusPlanner';

export interface HallMapCanvasSize {
    width: number;
    height: number;
}

export interface HallMapStagePose {
    viewport: { x: number; y: number; width: number; height: number; visible: boolean };
    /** content 以中心錨點、掛在 viewport 底下；width／height 為放大後尺寸。 */
    content: { x: number; y: number; width: number; height: number };
    ping: { x: number; y: number; visible: boolean; labelSide: 'left' | 'right' };
}

export function hallMapStagePose(
    mode: HallMapMode,
    focus: HallMapFocusFrame | null,
    layout: HallMapLayout,
    canvas: HallMapCanvasSize,
): HallMapStagePose {
    const rect = layout.modes[mode];
    const zoom = Math.max(1, rect.zoom);
    const halfW = canvas.width / 2;
    const halfH = canvas.height / 2;
    const contentW = rect.width * zoom;
    const contentH = rect.height * zoom;
    const useFocus = mode === 'focus' && focus !== null;
    // 沒有聚焦目標時置中（放大時看地圖正中央）。
    const offsetX = useFocus ? focus.contentOffsetX : (rect.width - contentW) / 2;
    const offsetY = useFocus ? focus.contentOffsetY : (rect.height - contentH) / 2;
    return {
        viewport: {
            x: rect.x + rect.width / 2 - halfW,
            y: halfH - (rect.y + rect.height / 2),
            width: rect.width,
            height: rect.height,
            visible: rect.visible,
        },
        content: {
            x: offsetX + contentW / 2 - rect.width / 2,
            y: -(offsetY + contentH / 2 - rect.height / 2),
            width: contentW,
            height: contentH,
        },
        ping: {
            x: useFocus ? focus.pingX - halfW : 0,
            y: useFocus ? halfH - focus.pingY : 0,
            visible: useFocus && rect.visible,
            labelSide: useFocus ? focus.labelSide : 'left',
        },
    };
}
