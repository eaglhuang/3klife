// @spec-source → 大廳系統 E-3 任務詳情視窗（Hall_Mission_Detail_Dialog）；WBS HALL-05；PROG-2-1007
/**
 * HallMissionDialogState — 大廳任務列 → 任務詳情彈窗的 state 與委任結果文字（純邏輯，不依賴 cc）。
 *
 * 彈窗的其餘欄位（成本、情報遮罩、環境偵察）沿用彈窗預設值，這裡只帶任務本身的文字。
 * Unity 對照：Presenter 把列資料轉成彈窗的 ViewModel，節點仍由彈窗自己綁定。
 */
import type { HallTaskRow } from '../../core/systems/HallMissionBoardPresenter';
import type { HallAutoAssignResult } from '../../core/systems/HallAutoAssign';
import type { HallBoardKey } from '../../core/systems/HallMissionBoard';

/** 彈窗頂部顯示的任務牆類型（與任務牆標題的長名稱分開）。 */
export const HALL_BOARD_TYPE_LABEL: Readonly<Record<HallBoardKey, string>> = Object.freeze({
    Military: '軍事',
    Domestic: '內政',
    Expedition: '天下沙盤',
});

export interface HallMissionDialogStatePatch {
    missionTypeLabel: string;
    missionTitle: string;
    missionBrief: string;
    rewardBaseLabel: string;
}

/** 列資料 → 彈窗 state 的片段；彈窗會與預設 state 合併。 */
export function hallMissionDialogStateOf(row: Readonly<HallTaskRow>, boardLabel: string): HallMissionDialogStatePatch {
    return {
        missionTypeLabel: boardLabel,
        missionTitle: row.title,
        missionBrief: row.brief,
        rewardBaseLabel: row.rewardText,
    };
}

/** 委任失敗原因 → 給玩家看的提示（暫定文案）。 */
export function hallAssignNoticeOf(result: HallAutoAssignResult): string {
    if (result.ok === true) return '已委任，由 AI 選將出戰';
    switch (result.reason) {
        case 'not-enabled':
            return '此任務未開放 AI 委任';
        case 'task-already-assigned':
            return '此任務已在委任中';
        case 'no-candidate':
            return '目前沒有可出戰的武將可委任';
    }
}
