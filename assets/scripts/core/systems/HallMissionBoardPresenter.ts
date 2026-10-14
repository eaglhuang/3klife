// @spec-source → WBS v3 HALL-01（大廳資料模型）、HALL-03（雙牆任務板可見性與置頂）；DomesticPresenter 的列資料模式（暫定）
/**
 * HallMissionBoardPresenter — 大廳任務牆的顯示資料，純 TS，不依賴 cc。
 *
 * 流程：validateLobbyHub 驗證原始資料 → getVisibleHallTasks 過濾 → arrangeHallTasks 置頂已接取 → 產生列資料。
 * View 只把列資料套到文字與按鈕，與 #181 的內政面板相同做法。
 * 難度與獎勵的顯示字串是暫定的繁中字串，正式字串表定案後改用 key。
 */
import { HallBoardKey, HallPlayerState, arrangeHallTasks, getVisibleHallTasks } from './HallMissionBoard';
import { LobbyHub, LobbyHubIssue, HallTask, validateLobbyHub } from './LobbyHubSchema';

export interface HallTaskRow {
    taskId: string;
    title: string;
    brief: string;
    difficultyText: string;
    requiredRankText: string;
    rewardText: string;
    /** 已接取的任務會置頂，且不可再接。 */
    accepted: boolean;
    canAccept: boolean;
}

export type LoadLobbyHubResult = { ok: true; hub: LobbyHub; issues: [] } | { ok: false; issues: LobbyHubIssue[] };

const DIFFICULTY_LABEL: Readonly<Record<string, string>> = Object.freeze({
    EASY: '簡單',
    NORMAL: '普通',
    ELITE: '精英',
    ADVANCED: '進階',
    HELL: '地獄',
});

const REWARD_LABEL: Readonly<Record<string, string>> = Object.freeze({
    GRAIN: '糧草',
    SILVER: '黃金',
    GENERAL_EXP: '武將經驗',
    OFFICER_EXP: '官職經驗',
});

/** 驗證原始大廳資料；通過才回傳強型別的 hub，失敗回傳全部 issues 且不產生 hub。 */
export function loadLobbyHub(raw: unknown): LoadLobbyHubResult {
    const validation = validateLobbyHub(raw);
    if (!validation.ok) {
        return { ok: false, issues: validation.issues };
    }
    return { ok: true, hub: (raw as { Lobby_Hub: LobbyHub }).Lobby_Hub, issues: [] };
}

/**
 * 產生某張任務牆的列資料：先依官階／沙盤階段／情報過濾，再把已接取任務置頂。
 * 不改 hub 與玩家狀態。
 */
export function buildHallBoardRows(hub: Readonly<LobbyHub>, board: HallBoardKey, player: Readonly<HallPlayerState>): HallTaskRow[] {
    const tasks: HallTask[] = hub.Mission_Boards[board].Tasks;
    const visible = arrangeHallTasks(getVisibleHallTasks(player, tasks, board));
    return visible.map(task => ({
        taskId: task.Task_ID,
        title: task.Task_Title,
        brief: task.Task_Brief,
        difficultyText: DIFFICULTY_LABEL[task.Difficulty] ?? task.Difficulty,
        requiredRankText: `官階 ${task.Required_Rank} 以上`,
        rewardText: task.Rewards.Base.map(reward => `${REWARD_LABEL[reward.Type] ?? reward.Type} +${reward.Amount}`).join('、'),
        accepted: task.Is_Accepted,
        canAccept: !task.Is_Accepted,
    }));
}
