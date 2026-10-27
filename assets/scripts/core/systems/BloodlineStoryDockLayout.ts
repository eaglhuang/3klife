// @spec-source → 武將人物介面規格書 §6.4 StoryDock 三態、§BloodlineTabContent 版面（StoryDock 底部 8%~22% 高）；WBS GDUI-06（PROG-2-1264）
/**
 * BloodlineStoryDockLayout — 命頁故事抽屜（StoryDock）的三態切換與版面高度（純邏輯，不依賴 cc）
 *
 * 三態：COLLAPSED（只露標題、把手與第一格）、HALF（3 格）、EXPANDED（6 格完整故事條）。
 * 展開時主血統區依剩餘高度縮放（layout reflow），抽屜本身不覆蓋 14 人血統圖。
 *
 * 暫定：
 *   - 三態高度比例取規格範圍 8%~22% 的兩端與中點：COLLAPSED 0.08、HALF 0.15、EXPANDED 0.22。
 *   - 規格寫 EXPANDED 顯示 5~6 格，本檔取 6（與故事條格數一致）。
 *   - 拖拉每次手勢只跨一態，超過兩端時夾住。實際拖拉門檻與動畫由 View 決定。
 *
 * Unity 對照：像一個有三個 Snap 點的 Bottom Sheet，手勢只決定跳到哪一個 Snap，版面由 Snap 高度算出。
 */

export const STORY_DOCK_STATE_ORDER = ['COLLAPSED', 'HALF', 'EXPANDED'] as const;
export type StoryDockStateName = (typeof STORY_DOCK_STATE_ORDER)[number];

/** 各態抽屜高度占命頁總高度的比例（暫定，見檔頭） */
export const STORY_DOCK_HEIGHT_RATIO: Readonly<Record<StoryDockStateName, number>> = {
    COLLAPSED: 0.08,
    HALF: 0.15,
    EXPANDED: 0.22,
};

/** 各態顯示的故事格數（暫定：EXPANDED 取 6） */
export const STORY_DOCK_VISIBLE_CELLS: Readonly<Record<StoryDockStateName, number>> = {
    COLLAPSED: 1,
    HALF: 3,
    EXPANDED: 6,
};

export type StoryDockGesture = 'up' | 'down';

/** 一次拖拉手勢只跨一態，到頂或到底時維持原態 */
export function nextStoryDockState(state: StoryDockStateName, gesture: StoryDockGesture): StoryDockStateName {
    const index = STORY_DOCK_STATE_ORDER.indexOf(state);
    const next = gesture === 'up' ? index + 1 : index - 1;
    const clamped = Math.max(0, Math.min(STORY_DOCK_STATE_ORDER.length - 1, next));
    return STORY_DOCK_STATE_ORDER[clamped];
}

export interface StoryDockLayout {
    topBarHeight: number;
    stageHeight: number;
    dockHeight: number;
}

/**
 * 依命頁總高度與目前態算出三塊高度：頂欄固定、抽屜依比例、主血統區吃剩下的高度。
 * 三塊加總等於 containerHeight；主血統區不為負。
 */
export function storyDockLayout(
    containerHeight: number,
    topBarHeight: number,
    state: StoryDockStateName,
): StoryDockLayout {
    const total = Math.max(0, containerHeight);
    const top = Math.min(total, Math.max(0, topBarHeight));
    const dock = Math.min(total - top, Math.round(total * STORY_DOCK_HEIGHT_RATIO[state]));
    return { topBarHeight: top, stageHeight: total - top - dock, dockHeight: dock };
}
