// @spec-source → 武將人物介面規格書 §6.4 StoryDock（COLLAPSED／HALF／EXPANDED 三態；展開時主血統區 reflow 縮放、不可 overlay 蓋住血統圖）、§6.4 第 8 點故事條節奏；WBS GDUI-06；PROG-2-1046
/**
 * StoryDockView — 命頁底部 StoryDock 的三態模型（純邏輯，不依賴 cc）。
 *
 * - 三態：COLLAPSED（只露標題、把手與第一格預覽）、HALF（3 格）、EXPANDED（完整故事條）。
 * - 故事條節奏固定為五段（規格 §6.4-8）；EXPANDED 顯示全部五格。
 * - storyDockLayout 把總高度切成「血統區」與「故事條」兩段，展開時血統區縮小，不做疊加。
 * - 拖拉把手：向上拖展開一階、向下拖收合一階，到頂或到底就停住。
 *
 * Unity 對照：像一個 Layout Group 的兩個 child，展開時改 preferredHeight，另一個 child 自動 reflow；不用 overlay。
 */

export type StoryDockState = 'COLLAPSED' | 'HALF' | 'EXPANDED';

export type StoryDockDrag = 'UP' | 'DOWN';

/** 故事條節奏（規格 §6.4-8）：五段依序為歷史人生、命運轉折、血脈暗示、祖靈牽引、未來伏筆。 */
export const STORY_STRIP_RHYTHM: readonly string[] = Object.freeze(['歷史人生', '命運轉折', '血脈暗示', '祖靈牽引', '未來伏筆']);

/** 各態顯示的故事格數；EXPANDED 為全部五段。 */
export const STORY_DOCK_VISIBLE_CELLS: Readonly<Record<StoryDockState, number>> = Object.freeze({
    COLLAPSED: 1,
    HALF: 3,
    EXPANDED: STORY_STRIP_RHYTHM.length,
});

/**
 * 各態的故事條高度（設計像素，暫定）。
 * COLLAPSED 只留標題與把手；HALF 容納 3 格；EXPANDED 容納 5 格。實際數值待 Codex 實機微調。
 */
export const STORY_DOCK_HEIGHT: Readonly<Record<StoryDockState, number>> = Object.freeze({
    COLLAPSED: 96,
    HALF: 260,
    EXPANDED: 420,
});

const ORDER: readonly StoryDockState[] = Object.freeze(['COLLAPSED', 'HALF', 'EXPANDED']);

/** 故事格：依節奏順序取前 visibleCells 格，文字不足時補空字串（不補假故事）。 */
export function storyDockCells(stories: readonly string[], state: StoryDockState): { label: string; text: string }[] {
    const count = STORY_DOCK_VISIBLE_CELLS[state];
    return STORY_STRIP_RHYTHM.slice(0, count).map((label, index) => ({ label, text: stories[index] ?? '' }));
}

/** 把總高度切成血統區與故事條；血統區永遠拿剩下的高度，不被蓋住。 */
export function storyDockLayout(state: StoryDockState, totalHeight: number): { bloodlineHeight: number; dockHeight: number } {
    const dockHeight = Math.min(STORY_DOCK_HEIGHT[state], Math.max(0, totalHeight));
    return { bloodlineHeight: Math.max(0, totalHeight - dockHeight), dockHeight };
}

/** 拖拉把手：向上拖展開一階、向下拖收合一階，到頂或到底停住。 */
export function nextStoryDockState(current: StoryDockState, drag: StoryDockDrag): StoryDockState {
    const index = ORDER.indexOf(current);
    if (drag === 'UP') return ORDER[Math.min(index + 1, ORDER.length - 1)];
    return ORDER[Math.max(index - 1, 0)];
}
