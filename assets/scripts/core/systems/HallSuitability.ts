// @spec-source → 武將人物介面規格補遺_2026-04-14 §4.1 推薦標籤（Suitability Badge）；WBS HUM-07（PROG-2-2074）
/**
 * HallSuitability — 人物頁「自薦推薦」：找出武將自告奮勇、且還開著的大廳任務，純 TS，不依賴 cc。
 *
 * 判定：任務的 Volunteer_General_UIDs 含這位武將、任務列可見且未接取、任務沒有指定武將，
 * 武將本身也沒有被派去別的任務（§4.1「已開啟但未派遣」）。依牆別順序、列順序取第一個。
 * 回傳牆別與列號，畫面層用來直接跳到任務牆那一列。
 * Unity 對照：像查一張 Dictionary 找第一筆符合的任務，回傳的是 UI 定位用的索引，不是資料本身。
 */
import type { HallBoardKey } from './HallMissionBoard';
import type { HallTaskRow } from './HallMissionBoardPresenter';
import type { HallTask } from './LobbyHubSchema';

/** 人物頁側邊按鈕文字（欄寬只放得下短字） */
export const SUITABILITY_BADGE_LABEL = '🔥自薦';

export function suitabilityBadgeText(taskTitle: string): string {
    return `🔥 自薦推薦：${taskTitle}`;
}

export interface HallSuitabilityBoard {
    board: HallBoardKey;
    /** 目前可見的任務列（含指派狀態覆蓋） */
    rows: readonly HallTaskRow[];
    tasks: readonly HallTask[];
}

export interface HallVolunteerTaskRef {
    board: HallBoardKey;
    /** 該牆任務列的列號 */
    index: number;
    taskId: string;
    taskTitle: string;
}

export function findVolunteerTask(
    boards: readonly HallSuitabilityBoard[],
    generalId: string,
    dispatchedGeneralIds: ReadonlySet<string>,
): HallVolunteerTaskRef | null {
    if (!generalId || dispatchedGeneralIds.has(generalId)) return null;
    for (const { board, rows, tasks } of boards) {
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            if (row.accepted) continue;
            const task = tasks.find((t) => t.Task_ID === row.taskId);
            if (!task || task.Selected_General_UID || !(task.Volunteer_General_UIDs ?? []).includes(generalId)) continue;
            return { board, index, taskId: task.Task_ID, taskTitle: row.title };
        }
    }
    return null;
}
