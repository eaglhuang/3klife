// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（頭頂姓名與官職）、E-3／F-2（自告奮勇）；UI-2-0138（UI-2-0123 子項）
/**
 * HallStageFeed — 把大廳點位列換成 HallStagePlanner 的輸入，純 TS，不依賴 cc。
 *
 * 誰在場由 HallCharacterPresenter 決定（HallSpotRow），這裡只補上姓名／官職，
 * 並用自告奮勇判定（HallVolunteer）找出頭頂要掛「!」的武將：
 * 對任一開放任務成立 shouldShowVolunteerEvent、且尚未被派任務者才掛。
 * Unity 對照：像一個 ViewModel Builder，把 Model 的清單轉成 View 要的 DTO。
 */
import type { HallSpotRow } from './HallCharacterPresenter';
import type { HallStageGeneral } from './HallStagePlanner';
import { HallVolunteerTask, shouldShowVolunteerEvent } from './HallVolunteer';

export interface HallStageProfile {
    name: string;
    title?: string | null;
    roleTags: readonly string[];
    mood: string;
}

export interface HallStageFeed {
    generals: HallStageGeneral[];
    taskMarkIds: Set<string>;
}

/** 查不到檔案的武將略過（資料尚未載入或已離開）。 */
export function buildHallStageFeed(
    rows: readonly HallSpotRow[],
    profileOf: (generalId: string) => HallStageProfile | null,
    openTasks: readonly HallVolunteerTask[],
): HallStageFeed {
    const generals: HallStageGeneral[] = [];
    const taskMarkIds = new Set<string>();
    for (const row of rows) {
        const profile = profileOf(row.id);
        if (!profile) continue;
        generals.push(profile.title ? { id: row.id, name: profile.name, title: profile.title } : { id: row.id, name: profile.name });
        if (row.assigned) continue;
        const general = { id: row.id, roleTags: profile.roleTags, mood: profile.mood };
        if (openTasks.some(task => shouldShowVolunteerEvent(task, general))) taskMarkIds.add(row.id);
    }
    return { generals, taskMarkIds };
}
