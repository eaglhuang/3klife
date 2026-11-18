/**
 * MissionBoardPresenter — 任務服務的牆面資料投影（純邏輯，不 import 'cc'）
 *
 * 任務牆（牆面卡、任務板列）仍吃 LobbyHub 的 HallTask 形狀，這裡只把服務的「已投影」資料排進去：
 *  - 所有數字與文字都來自服務投影（情報不足時就是粗略文字，不會洩漏真相）。
 *  - 耗費是明牌，逐張向服務查。
 * 詳情視窗另走 MissionDetailPresenter，不經過這裡。
 */
import type { HallBoardKey } from '../../core/systems/HallMissionBoard';
import { HALL_DIFFICULTY_MIN_RANK } from '../../core/systems/HallMissionBoard';
import type { HallTask, LobbyHub } from '../../core/systems/LobbyHubSchema';
import type { IMissionService, MissionBoardView, MissionCardView } from '../../core/mission/service/IMissionService';

const BOARD_KEYS: readonly HallBoardKey[] = ['Military', 'Domestic', 'Expedition'];

/** 主題 → 牆別；未登錄的主題歸內政（任務牆只有三面，不讓任務憑空消失） */
export type WallOfTheme = (theme: string) => HallBoardKey;

/** 牆上列狀態文字：未接取為空字串；進行中為「進行中，還有 N 季・武將名」 */
export function missionRowStatusText(card: Readonly<MissionCardView>, season: number, delegated = false): string {
    if (card.status !== 'ACTIVE') return '';
    const left = Math.max(0, (card.returnSeason ?? season) - season);
    return `進行中，還有 ${left} 季・${card.executorName ?? ''}${delegated ? '（委任）' : ''}`;
}

/** 一張任務卡 → 牆面使用的 HallTask（耗費由 detail 提供；情報度用服務的情報度） */
export function missionCardToTask(card: Readonly<MissionCardView>, cost: { grain: number; troops: number; silver: number }, durationSeasons: number): HallTask {
    return {
        Task_ID: card.id,
        Task_Title: card.title,
        Task_Brief: '',
        Task_Detail: '',
        Difficulty: card.difficulty as HallTask['Difficulty'],
        Required_Rank: HALL_DIFFICULTY_MIN_RANK[card.difficulty as keyof typeof HALL_DIFFICULTY_MIN_RANK] ?? 1,
        Intel_Reveal_Percent: card.intel,
        Selected_General_UID: null,
        Is_Accepted: card.status === 'ACTIVE',
        Suggested_General_UID: null,
        Volunteer_General_UIDs: [],
        AI_Assign_Enabled: true,
        Available_Actions: ['RECON', 'EXECUTE', 'WAIT', 'ASSIGN'],
        Rewards: { Base: [], Perfect_Bonus: [] },
        Costs: { GRAIN: cost.grain, TROOPS: cost.troops, SILVER: cost.silver, TIME_MINUTES: durationSeasons },
    };
}

/** 把 hub 的任務牆換成服務目前的任務 */
export function boardToHub(base: Readonly<LobbyHub>, service: IMissionService, wallOfTheme: WallOfTheme): LobbyHub {
    const board = service.getBoard();
    const boards: Record<string, { Tasks: HallTask[]; Last_Refresh_At: string }> = {};
    for (const wall of BOARD_KEYS) boards[wall] = { Tasks: [], Last_Refresh_At: '' };
    if (board.ok) {
        for (const card of board.value.missions) {
            const detail = service.getDetail(card.id);
            const cost = detail.ok ? detail.value.cost : { grain: 0, troops: 0, silver: 0 };
            const duration = detail.ok ? detail.value.durationSeasons : 1;
            boards[wallOfTheme(card.theme)].Tasks.push(missionCardToTask(card, cost, duration));
        }
    }
    return { ...base, Mission_Boards: boards as unknown as LobbyHub['Mission_Boards'] };
}

export function findCard(board: Readonly<MissionBoardView> | null, missionId: string): MissionCardView | undefined {
    return board?.missions.find((m) => m.id === missionId);
}
