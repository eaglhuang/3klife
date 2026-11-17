// @spec-source → 大廳系統 E-9（詳情四鈕）；doc_spec_0454（再探／委任）；PROG-2-9123
/**
 * HallMissionActionRouter — 任務詳情視窗四顆行動鈕「按下去要做什麼」（純邏輯，不依賴 cc）。
 *
 * 四個行動都有真實結果（PROG-2-9128，總PM裁決）：
 *   - 執行：沿用任務牆「接取」的派遣（暫定即時結算）；勾選 AI 委任時改走委任。
 *   - 委任：AI 選將並寫入委任紀錄。
 *   - 再探：耗糧草把情報度提到 100（規則在 HallMissionActions）。
 *   - 等待：本季先不處理，任務保留到下一季。
 * 任何一種結果都要讓玩家看得到（派遣、委任、提示三擇一），不能毫無反應。
 *
 * Unity 對照：像 Command 路由表，按鈕只丟 action，這裡回傳計畫，場景照計畫呼叫對應系統。
 */
import type { HallTask, HallTaskAction } from '../../core/systems/LobbyHubSchema';
import { canRevealFullHallTask, getHallTaskIntelRevealPercent } from '../../core/systems/HallTaskIntel';
import { effectiveHallIntelPercent, hallCostBarStateOf, type HallCostBarState } from '../../core/systems/HallMissionActions';
import { detailActionsFromTaskActions, type DetailActionKey } from './HallDetailActionStates';

export type HallMissionActionPlan =
    | { kind: 'dispatch'; generalId: string }
    | { kind: 'assign-ai' }
    | { kind: 'recon' }
    | { kind: 'wait' }
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
            return { kind: 'recon' };
        case 'wait':
            return { kind: 'wait' };
        default:
            return { kind: 'not-open' };
    }
}

/** 任務資料中決定詳情視窗按鈕、情報與耗費條的欄位（取自 LobbyHub 的 HallTask） */
export interface HallTaskDialogSource {
    Intel_Reveal_Percent: number;
    Available_Actions: readonly HallTaskAction[];
    /** 只有明確為 false 才讓委任鈕變暗（規格 §4.1：可委任時才亮）；缺值視為不限制 */
    AI_Assign_Enabled?: boolean;
    /** 有提供時耗費條讀任務自己的 Costs，否則沿用視窗預設值 */
    Costs?: HallTask['Costs'];
}

/**
 * 任務資料 → 詳情視窗 state 片段：按鈕開放項目、情報度與耗費條照任務資料，不用視窗預設值（PROG-2-9123／9128）。
 * savedIntel 是存檔裡再探後的情報度（沒有再探時傳 undefined），與資料底值取較大者。
 */
export function hallTaskDialogStateOf(task: Readonly<HallTaskDialogSource>, savedIntel?: number): Partial<HallCostBarState> & {
    availableActions: DetailActionKey[];
    intelRevealPercent: number;
    intelFogVisible: boolean;
} {
    const intelRevealPercent = effectiveHallIntelPercent({ Intel_Reveal_Percent: getHallTaskIntelRevealPercent({ Intel_Reveal_Percent: task.Intel_Reveal_Percent }) }, savedIntel);
    const actions = detailActionsFromTaskActions(task.Available_Actions)
        .filter((key) => key !== 'assign' || task.AI_Assign_Enabled !== false);
    return {
        availableActions: actions,
        intelRevealPercent,
        intelFogVisible: !canRevealFullHallTask({ Intel_Reveal_Percent: intelRevealPercent }),
        ...(task.Costs ? hallCostBarStateOf(task.Costs) : {}),
    };
}
