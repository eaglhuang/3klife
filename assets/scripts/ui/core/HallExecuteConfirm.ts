// @spec-source → 大廳系統 E-9 §3（情報不足的執行確認）；PROG-2-0460
/**
 * HallExecuteConfirm — 任務詳情「執行」遇到情報不足時的確認流程（純邏輯，不依賴 cc）。
 *
 * - 情報未滿 100 時按執行，先跳出「探子回報尚不完整，是否再探一次？」（resolveExecutePress）。
 * - 三個選擇：再探一次後執行、直接執行、取消（applyIntelConfirmChoice）。
 * - 不改輸入，回傳新的情報度與要做的動作，由呼叫端決定如何呼叫 GameSession。
 *
 * Unity 對照：像一個 Confirm Popup 的 ViewModel。按鈕 onClick 只把選擇交給這裡，
 * 彈窗本身只負責顯示文字與關閉。
 */
import { intelAfterRescout, isFullIntel } from './HallDetailActionStates';

export const INTEL_CONFIRM_TEXT = '探子回報尚不完整，是否再探一次？';

export type IntelConfirmChoice = 'rescout-then-execute' | 'execute-now' | 'cancel';

/** 按下執行時：情報已滿直接執行；未滿則先要求確認。 */
export type ExecutePressResult = 'execute' | 'ask-intel-confirm';

export interface IntelConfirmOutcome {
    /** 這次選擇之後的情報度 */
    intelRevealPercent: number;
    /** 是否要接著執行任務 */
    shouldExecute: boolean;
    /** 是否要派探子再探一次（會把情報度刷新到滿） */
    shouldRescout: boolean;
}

export function resolveExecutePress(intelRevealPercent: number): ExecutePressResult {
    return isFullIntel(intelRevealPercent) ? 'execute' : 'ask-intel-confirm';
}

export function applyIntelConfirmChoice(intelRevealPercent: number, choice: IntelConfirmChoice): IntelConfirmOutcome {
    if (choice === 'cancel') {
        return { intelRevealPercent, shouldExecute: false, shouldRescout: false };
    }
    if (choice === 'execute-now') {
        return { intelRevealPercent, shouldExecute: true, shouldRescout: false };
    }
    return { intelRevealPercent: intelAfterRescout(), shouldExecute: true, shouldRescout: true };
}
