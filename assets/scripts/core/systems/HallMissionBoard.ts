// @spec-source → WBS v3 HALL-03（雙牆任務板：任務池生成/可見性過濾/已接取置頂/五級難度）；系統規格書：大廳系統 §E-2、§E-3、§F-1、§F-2
/**
 * HallMissionBoard — 大廳雙牆任務板的可見性過濾、已接取置頂與重算時機，純邏輯，不依賴 cc。
 *
 * - getVisibleHallTasks：依官職（rankTier）、世界沙盤階段（worldStage）、軍事任務情報度過濾（規格 F-1）。
 * - 難度上限依官職：官職越高，可見難度越高（規格 E-3，對照表為暫定）。
 * - arrangeHallTasks：已接取任務置頂，其餘保持原順序。
 * - 重算時機：進入大廳、早 / 中 / 晚切換、手動刷新（規格 E-3）。
 *
 * 型別採結構型別（HallGateTask），不直接依賴 LobbyHubSchema，避免與 HALL-01 的 PR 互相等待。
 * Unity 對照：像 UI 的 ScrollView 先 Filter 再 Sort，已接取項目 SetSiblingIndex(0) 置頂。
 */

export interface HallGateTask {
    Task_ID: string;
    Difficulty: string;
    Required_Rank: number;
    /** 選填：任務需要的世界沙盤階段（規格 F-1 的 requiredStage），缺省為 0。 */
    Required_Stage?: number;
    /** 選填：軍事任務的情報門檻（只影響軍事牆）。 */
    Required_Intel?: number;
    Is_Accepted: boolean;
}

export interface HallPlayerState {
    /** 官職階位（rankTier）。 */
    rankTier: number;
    /** 世界沙盤階段。 */
    worldStage: number;
    /** 目前情報度（0~100）。 */
    intel: number;
}

export type HallBoardKey = 'Military' | 'Domestic';

/** 暫定：各難度所需的最低官職（規格只定「官職越高，難度上限越高」，對照表待 PM 確認）。 */
export const HALL_DIFFICULTY_MIN_RANK: Readonly<Record<string, number>> = Object.freeze({
    EASY: 0,
    NORMAL: 1,
    ELITE: 2,
    ADVANCED: 3,
    HELL: 4,
});

/** 大廳時段（早中晚三巡）。 */
export type HallDayPeriod = 'MORNING' | 'NOON' | 'EVENING';

/** 重算觸發：進入大廳、手動刷新、或時段切換（由 shouldRecomputeBoard 判斷）。 */
export type HallRecomputeTrigger = 'ENTER_LOBBY' | 'MANUAL_REFRESH' | 'TICK';

/** 依小時取時段：06~11 早、12~17 中、其餘為晚（暫定切點）。 */
export function getDayPeriod(hour: number): HallDayPeriod {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError('小時必須為 0~23 的整數');
    if (hour >= 6 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 18) return 'NOON';
    return 'EVENING';
}

/** 是否需要重算任務池：進入大廳與手動刷新一律重算；時段切換才重算。 */
export function shouldRecomputeBoard(trigger: HallRecomputeTrigger, lastPeriod: HallDayPeriod, currentPeriod: HallDayPeriod): boolean {
    if (trigger === 'ENTER_LOBBY' || trigger === 'MANUAL_REFRESH') return true;
    return lastPeriod !== currentPeriod;
}

function difficultyVisible(task: HallGateTask, rankTier: number): boolean {
    const minRank = HALL_DIFFICULTY_MIN_RANK[task.Difficulty];
    return minRank !== undefined && rankTier >= minRank;
}

/**
 * 依官職、沙盤階段、情報度過濾可見任務（規格 F-1）。
 * 不改輸入，回傳新陣列，保持原順序。
 */
export function getVisibleHallTasks<T extends HallGateTask>(player: Readonly<HallPlayerState>, tasks: readonly T[], board: HallBoardKey): T[] {
    return tasks.filter(task => {
        if (task.Required_Rank > player.rankTier) return false;
        if ((task.Required_Stage ?? 0) > player.worldStage) return false;
        if (board === 'Military' && task.Required_Intel !== undefined && player.intel < task.Required_Intel) return false;
        return difficultyVisible(task, player.rankTier);
    });
}

/** 已接取任務置頂，其餘保持原順序（穩定排序）。不改輸入。 */
export function arrangeHallTasks<T extends HallGateTask>(tasks: readonly T[]): T[] {
    const accepted = tasks.filter(task => task.Is_Accepted);
    const others = tasks.filter(task => !task.Is_Accepted);
    return [...accepted, ...others];
}
