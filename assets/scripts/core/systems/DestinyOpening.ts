// @spec-source → WBS v5 OPEN-05 接 OPEN-01（宿命轉蛋接上新手開場流程）；PROG-2-0339（暫定）
/**
 * DestinyOpening — 把宿命轉蛋接上開場流程控制器，純 TS，不依賴 cc。
 *
 * - destinyLockedEvent：轉蛋確認鎖定後才產生離開事件；未鎖定或只是重置都回傳 null。
 * - destinyOpeningPhase：產生一幕，進入條件由呼叫端指定，離開條件固定為 destiny-locked。
 * 正式開場順序與劇本尚未定義，這裡不決定幕的先後，只提供接線用的事件與幕設定。
 * Unity 對照：像 Animator 的狀態機，轉蛋 UI 只在「確認」時送出 Trigger，狀態機據此離開本幕。
 */
import type { OpeningFlowEvent, OpeningPhase } from '../config/OpeningFlowConfig';
import type { DestinyGachaState } from './DestinyGacha';

export const DESTINY_LOCKED_EVENT_TYPE = 'destiny-locked';

/** 轉蛋已鎖定時回傳離開事件；其他狀態回傳 null，不產生事件。 */
export function destinyLockedEvent(state: Readonly<DestinyGachaState>): OpeningFlowEvent | null {
    return state.phase === 'locked' ? { type: DESTINY_LOCKED_EVENT_TYPE } : null;
}

/**
 * 宿命轉蛋幕：enterType 為進入這一幕的事件類型，離開事件固定為 destiny-locked。
 * 回傳的幕可直接放進 OpeningFlowConfig.phases。
 */
export function destinyOpeningPhase(id: string, enterType: string): OpeningPhase {
    return {
        id,
        enterWhen: (event: OpeningFlowEvent) => event.type === enterType,
        leaveWhen: (event: OpeningFlowEvent) => event.type === DESTINY_LOCKED_EVENT_TYPE,
    };
}
