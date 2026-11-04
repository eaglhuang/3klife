// @spec-source → WBS v3 HALL-03（雙牆任務板可見性與置頂）；UI-2-0153（UI-2-0123 子項：幕府大廳左右任務牆）
/**
 * LobbyHallWallView — 任務板列資料 → 幕府大廳牆面顯示（純邏輯，不依賴 cc）。
 *
 * 牆面只放得下 LOBBY_HALL_WALL_ROWS 列；計數顯示「可見任務數 / 任務板上限」。
 * 已接取的任務會置頂（buildHallBoardRows 已排好），顯示置頂標記。
 *
 * Unity 對照：像 ViewModel，把 Model 的列資料轉成 UI Text 要顯示的字串。
 */
import type { HallTaskRow } from './HallMissionBoardPresenter';

/** 設計稿每面牆的任務列數 */
export const LOBBY_HALL_WALL_ROWS = 4;
/** 已接取任務的置頂標記文字（暫定，與設計稿一致） */
export const LOBBY_HALL_WALL_PIN_TEXT = '已接取 · 置頂';

export interface LobbyHallWallRowView {
    readonly title: string;
    readonly meta: string;
    readonly difficulty: string;
    readonly pinned: boolean;
}

export interface LobbyHallWallView {
    readonly countText: string;
    readonly rows: readonly LobbyHallWallRowView[];
}

export function buildLobbyHallWallView(rows: readonly HallTaskRow[], boardMax: number): LobbyHallWallView {
    return {
        countText: `${rows.length} / ${boardMax}`,
        rows: rows.slice(0, LOBBY_HALL_WALL_ROWS).map((row) => ({
            title: row.title,
            meta: row.rewardText || row.requiredRankText,
            difficulty: row.difficultyText,
            pinned: row.accepted,
        })),
    };
}
