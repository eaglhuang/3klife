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

/**
 * metaPrefix：回傳該列要加在獎勵前的標記（例「連續任務 2/3」；PROG-2-9966），空字串不加。
 * rewardHintOf：回傳任務卡目前看得到的獎勵提示（情報不足時是「糧草／武將經驗？」這類粗略字）；
 * 有值就優先顯示，讓新手在牆上就知道做這件事有什麼好處，不用只看到沒意義的「官階 1 以上」。
 */
export function buildLobbyHallWallView(rows: readonly HallTaskRow[], boardMax: number, metaPrefix?: (row: HallTaskRow) => string, rewardHintOf?: (row: HallTaskRow) => string): LobbyHallWallView {
    return {
        countText: `${rows.length} / ${boardMax}`,
        rows: rows.slice(0, LOBBY_HALL_WALL_ROWS).map((row) => ({
            title: row.title,
            meta: [metaPrefix?.(row) ?? '', rewardHintOf?.(row) || row.rewardText || row.requiredRankText].filter((x) => x.length > 0).join('・'),
            difficulty: row.difficultyText,
            pinned: row.accepted,
        })),
    };
}
