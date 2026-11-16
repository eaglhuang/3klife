// @spec-source → 大廳系統 E-9（詳情四鈕）；doc_spec_0454（再探／委任）；PROG-2-9123
/**
 * HallMissionActionRouter — 任務詳情視窗四顆行動鈕「按下去要做什麼」（純邏輯，不依賴 cc）。
 *
 * 規格與既有系統已支援的行為才接真功能：
 *   - 執行：沿用任務牆「接取」的派遣（暫定即時結算）；勾選 AI 委任時改走委任。
 *   - 委任：AI 選將並寫入委任紀錄。
 *   - 再探、等待：再探的耗費（規格只寫「少量」）與等待的規則都沒有數值，先回報「尚未開放」。
 * 任何一種結果都要讓玩家看得到（派遣、委任、提示三擇一），不能毫無反應。
 *
 * Unity 對照：像 Command 路由表，按鈕只丟 action，這裡回傳計畫，場景照計畫呼叫對應系統。
 */
import type { HallTaskAction } from '../../core/systems/LobbyHubSchema';
import { canRevealFullHallTask, getHallTaskIntelRevealPercent } from '../../core/systems/HallTaskIntel';
import { detailActionsFromTaskActions, type DetailActionKey } from './HallDetailActionStates';

export type HallMissionActionPlan =
    | { kind: 'dispatch'; generalId: string }
    | { kind: 'assign-ai' }
    | { kind: 'not-open' }
    | { kind: 'notice'; text: string };

export const HALL_ACTION_NEED_GENERAL_TEXT = '請先選擇武將，或勾選 AI 委任';
export const HALL_ACTION_ALREADY_ACCEPTED_TEXT = '此任務已接取';

export interface HallMissionActionContext {
    selectedGeneralId: string | null;
    aiDelegateChecked: boolean;
    /** 任務是否已被指派（GameSession.hallAssignments） */
    alreadyAccepted: boolean;
}

export function planHallMissionAction(action: DetailActionKey, ctx: Readonly<HallMissionActionContext>): HallMissionActionPlan {
    switch (action) {
        case 'assign':
            return ctx.alreadyAccepted ? { kind: 'notice', text: HALL_ACTION_ALREADY_ACCEPTED_TEXT } : { kind: 'assign-ai' };
        case 'execute':
            if (ctx.alreadyAccepted) return { kind: 'notice', text: HALL_ACTION_ALREADY_ACCEPTED_TEXT };
            if (ctx.aiDelegateChecked) return { kind: 'assign-ai' };
            if (ctx.selectedGeneralId) return { kind: 'dispatch', generalId: ctx.selectedGeneralId };
            return { kind: 'notice', text: HALL_ACTION_NEED_GENERAL_TEXT };
        case 're-scout':
        case 'wait':
        default:
            return { kind: 'not-open' };
    }
}

/** 任務資料中決定詳情視窗按鈕與情報顯示的欄位（取自 LobbyHub 的 HallTask） */
export interface HallTaskDialogSource {
    Intel_Reveal_Percent: number;
    Available_Actions: readonly HallTaskAction[];
}

/** 任務資料 → 詳情視窗 state 片段：按鈕開放項目與情報度照任務資料，不用視窗預設值（PROG-2-9123）。 */
export function hallTaskDialogStateOf(task: Readonly<HallTaskDialogSource>): {
    availableActions: DetailActionKey[];
    intelRevealPercent: number;
    intelFogVisible: boolean;
} {
    const intelRevealPercent = getHallTaskIntelRevealPercent({ Intel_Reveal_Percent: task.Intel_Reveal_Percent });
    return {
        availableActions: detailActionsFromTaskActions(task.Available_Actions),
        intelRevealPercent,
        intelFogVisible: !canRevealFullHallTask({ Intel_Reveal_Percent: intelRevealPercent }),
    };
}
