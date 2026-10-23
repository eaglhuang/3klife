// @spec-source → 大廳系統.md §E-2（任務可見性）、§F（派遣）；WBS HALL-03 任務流程段
/**
 * HallMissionDispatch — 大廳任務派遣條件與成敗判定（純邏輯，不依賴 cc）
 *
 * - canDispatchHallTask：能不能派遣（可見、未接取、有武將）。
 * - judgeHallMissionSuccess：結果判定，依武將戰力與任務難度門檻比較，不用亂數，同樣輸入同樣結果。
 *
 * 暫定（規格缺，可逆）：
 * - 成敗判定：武將戰力 >= 難度門檻即成功；門檻數值為暫定，待企劃定稿。
 * - 派遣不限時長，一次派遣即結算（完成或失敗）。
 *
 * Unity 對照：像任務面板的 CanStart 檢查加上 Resolve 函式，
 * Resolve 不呼叫 Random，方便重播與測試。
 */
import { getVisibleHallTasks, type HallBoardKey, type HallGateTask, type HallPlayerState } from './HallMissionBoard';
import type { HallMissionOutcome } from './HallMissionSettlement';

export type HallDispatchBlockReason = 'NOT_VISIBLE' | 'ALREADY_ACCEPTED' | 'NO_GENERAL';

export type HallDispatchCheck = { ok: true } | { ok: false; reason: HallDispatchBlockReason };

/** 派遣條件：任務必須在目前牆面可見、尚未被接取、且指派了一位武將。 */
export function canDispatchHallTask(
    task: HallGateTask,
    player: Readonly<HallPlayerState>,
    board: HallBoardKey,
    generalId: string | null,
): HallDispatchCheck {
    if (getVisibleHallTasks(player, [task], board).length === 0) return { ok: false, reason: 'NOT_VISIBLE' };
    if (task.Is_Accepted) return { ok: false, reason: 'ALREADY_ACCEPTED' };
    if (!generalId) return { ok: false, reason: 'NO_GENERAL' };
    return { ok: true };
}

export type HallDispatchResult = { ok: true; outcome: HallMissionOutcome } | { ok: false; reason: HallDispatchBlockReason };

/** 派遣並判定結果（暫定：派遣即結算）；通過條件才判定，阻擋時不產生結果。 */
export function resolveHallDispatch(
    task: HallGateTask,
    player: Readonly<HallPlayerState>,
    board: HallBoardKey,
    generalId: string | null,
    generalPower: number,
): HallDispatchResult {
    const check = canDispatchHallTask(task, player, board, generalId);
    // cc 設定沒開 strictNullChecks，布林判別聯合不會依 ok 縮窄，這裡以斷言取 reason
    if (!check.ok) return { ok: false, reason: (check as { ok: false; reason: HallDispatchBlockReason }).reason };
    return { ok: true, outcome: { difficulty: task.Difficulty, board, success: judgeHallMissionSuccess(task.Difficulty, generalPower) } };
}

/** 暫定難度門檻：武將戰力需達到的數值。 */
export const HALL_MISSION_POWER_REQUIRED: Readonly<Record<string, number>> = {
    EASY: 100,
    NORMAL: 200,
    ELITE: 350,
    ADVANCED: 500,
    HELL: 700,
};

/** 成敗判定：戰力 >= 門檻即成功；未知難度視為失敗（不入帳以外的效果不另外處理）。 */
export function judgeHallMissionSuccess(difficulty: string, generalPower: number): boolean {
    const required = HALL_MISSION_POWER_REQUIRED[difficulty];
    if (required === undefined) return false;
    return generalPower >= required;
}
