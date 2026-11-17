// @spec-source → doc_spec_1178 §5（詳情視窗與情報遮蔽）、§6（四鈕停用與原因）、§8（委任標註）、§9（牆上剩餘季數）；PROG-2-9130
/**
 * HallMissionView — 大廳任務實例 → 既有任務牆／詳情視窗的顯示資料（純邏輯，不依賴 cc）。
 *
 * 既有畫面（任務牆列、牆面、詳情視窗）吃的是 LobbyHub 的 HallTask，這裡把 GameSession 持有的任務實例轉成 HallTask，
 * 讓畫面不必改結構；所有數字與文字只來自任務實例，不使用設計稿範例。
 *   - hallMissionsToHub：把 hub 的任務牆換成真實任務。
 *   - hallRowStatusText：牆上列的狀態（未接取 / 進行中，還有 N 季・武將）。
 *   - hallMissionDialogState：詳情視窗 state（情報遮蔽、成功率區間、耗費不足標示、四鈕可用與原因）。
 *
 * Unity 對照：Presenter / ViewModel 轉換層，View 只套文字。
 */
import { HALL_DIFFICULTY_MIN_RANK, type HallBoardKey } from '../../core/systems/HallMissionBoard';
import type { HallMission, HallMissionAmounts, HallMissionBalance, HallMissionState } from '../../core/systems/HallMissionData';
import { HALL_MISSION_WALLS } from '../../core/systems/HallMissionData';
import { HALL_RESOURCE_NAME, hallRateText, hallShortagesOf, type HallCandidate } from '../../core/systems/HallMissionRules';
import type { HallTask, LobbyHub } from '../../core/systems/LobbyHubSchema';
import { HALL_INTEL_FULL_PERCENT } from '../../core/systems/HallTaskIntel';
import type { DetailActionKey } from './HallDetailActionStates';

export const HALL_STAT_NAME: Readonly<Record<string, string>> = Object.freeze({ str: '武力', lea: '統率', int: '智力', pol: '政治', cha: '魅力' });
export const HALL_DIFFICULTY_NAME: Readonly<Record<string, string>> = Object.freeze({ EASY: '簡單', NORMAL: '普通', ELITE: '菁英', ADVANCED: '高級', HELL: '地獄' });
export const HALL_WALL_NAME: Readonly<Record<HallBoardKey, string>> = Object.freeze({ Military: '軍事', Domestic: '內政', Expedition: '天下沙盤' });
export const HALL_MASK_TEXT = '???';
export const HALL_NO_CANDIDATE_TEXT = '目前沒有可派的武將';

/** 牆上剩餘期限（季）：未接取任務在到期季之前都還在牆上，最後一季顯示 1 */
export function hallRemainingExpiry(mission: Readonly<Pick<HallMission, 'expireSeason'>>, season: number): number {
    return Math.max(0, mission.expireSeason - season + 1);
}

/** 進行中任務還有幾季回報 */
export function hallRemainingSeasons(mission: Readonly<Pick<HallMission, 'returnSeason'>>, season: number): number {
    return Math.max(0, (mission.returnSeason ?? season) - season);
}

/** 任務實例 → 既有牆面使用的 HallTask */
export function hallMissionToTask(mission: Readonly<HallMission>): HallTask {
    const base: { Type: string; Amount: number }[] = [];
    if (mission.rewards.grain > 0) base.push({ Type: 'GRAIN', Amount: mission.rewards.grain });
    if (mission.rewards.silver > 0) base.push({ Type: 'SILVER', Amount: mission.rewards.silver });
    if (mission.rewards.generalExp > 0) base.push({ Type: 'GENERAL_EXP', Amount: mission.rewards.generalExp });
    return {
        Task_ID: mission.id,
        Task_Title: mission.title,
        Task_Brief: mission.brief,
        Task_Detail: mission.detail,
        Difficulty: mission.difficulty,
        Required_Rank: HALL_DIFFICULTY_MIN_RANK[mission.difficulty] ?? 1,
        ...(mission.sceneGambit ? { Scene_Gambit: mission.sceneGambit } : {}),
        Intel_Reveal_Percent: mission.intel,
        Selected_General_UID: mission.generalId ?? null,
        Is_Accepted: mission.status === 'ACTIVE',
        Suggested_General_UID: null,
        Volunteer_General_UIDs: [],
        AI_Assign_Enabled: true,
        Available_Actions: ['RECON', 'EXECUTE', 'WAIT', 'ASSIGN'],
        Rewards: { Base: base, Perfect_Bonus: [] },
        Costs: { GRAIN: mission.costs.grain, TROOPS: mission.costs.troops, SILVER: mission.costs.silver, TIME_MINUTES: 0 },
    };
}

/** 把 hub 的任務牆換成真實任務（其餘欄位沿用） */
export function hallMissionsToHub(base: Readonly<LobbyHub>, state: Readonly<HallMissionState>): LobbyHub {
    const boards = {} as Record<string, { Tasks: HallTask[]; Last_Refresh_At: string }>;
    for (const wall of HALL_MISSION_WALLS) {
        boards[wall] = { Tasks: state.boards[wall].map(hallMissionToTask), Last_Refresh_At: '' };
    }
    return { ...base, Mission_Boards: boards as unknown as LobbyHub['Mission_Boards'] };
}

/** 牆上列狀態文字：未接取為空字串；進行中為「進行中，還有 N 季・武將名」，委任加註 */
export function hallRowStatusText(mission: Readonly<HallMission>, season: number): string {
    if (mission.status !== 'ACTIVE') return '';
    const delegated = mission.delegated ? '（委任）' : '';
    return `進行中，還有 ${hallRemainingSeasons(mission, season)} 季・${mission.generalName ?? ''}${delegated}`;
}

export interface HallDialogContext {
    season: number;
    stock: Readonly<HallMissionAmounts>;
    balance: Readonly<HallMissionBalance>;
    /** 已依成功率排序的候選（可派者 block 為 null） */
    candidates: readonly HallCandidate[];
    /** 目前在視窗中選的武將 id；沒有時用最佳候選估算 */
    selectedGeneralId: string | null;
}

export interface HallDialogState {
    missionTypeLabel: string;
    missionTitle: string;
    missionBrief: string;
    intelRevealPercent: number;
    intelBody: string;
    intelFogVisible: boolean;
    intelHintLabel: string;
    envScoutTerrainLine: string;
    envScoutWeatherLine: string;
    generalSelectHintLabel: string;
    /** 毛遂自薦徽章：只在所選武將真的自告奮勇時顯示，不沿用設計稿的「關羽 毛遂自薦」 */
    volunteerBadgeVisible: boolean;
    volunteerBadgeLabel: string;
    costFoodValueLabel: string;
    costFoodRatio: number;
    costTroopValueLabel: string;
    costTroopRatio: number;
    costSilverValueLabel: string;
    costSilverRatio: number;
    costTimeValueLabel: string;
    costTimeRatio: number;
    rewardBaseLabel: string;
    rewardPerfectLabel: string;
    aiDelegateHintLabel: string;
    availableActions: DetailActionKey[];
    /** 停用的按鈕被點到時顯示的原因（§6） */
    actionBlockedText: Partial<Record<DetailActionKey, string>>;
}

const ratio = (value: number, scale: number): number => Math.max(0, Math.min(1, scale > 0 ? value / scale : 0));
const COST_SCALE = { grain: 400, troops: 500, silver: 300 };

function costLabel(need: number, have: number): string {
    const text = need.toLocaleString('en-US');
    return need > Math.max(0, Math.floor(have)) ? `${text}（不足，現有 ${Math.max(0, Math.floor(have))}）` : text;
}

function rewardText(rewards: HallMission['rewards']): string {
    const parts: string[] = [];
    if (rewards.grain > 0) parts.push(`糧草 +${rewards.grain}`);
    if (rewards.silver > 0) parts.push(`黃金 +${rewards.silver}`);
    if (rewards.generalExp > 0) parts.push(`武將經驗 +${rewards.generalExp}`);
    return parts.join('、');
}

/** 詳情視窗 state（§5、§6）；沒選武將時成功率用最佳候選估算 */
export function hallMissionDialogState(mission: Readonly<HallMission>, ctx: Readonly<HallDialogContext>): HallDialogState {
    const full = mission.intel >= HALL_INTEL_FULL_PERCENT;
    // 可派的都在出任務時，說明原因而不是只說「沒有可派的武將」
    const noCandidateText = !ctx.candidates.some((c) => c.block === null) && ctx.candidates.some((c) => c.block === 'on-mission')
        ? '可派的武將都在出任務中，等回報後再派' : HALL_NO_CANDIDATE_TEXT;
    const active = mission.status === 'ACTIVE';
    const picked = ctx.candidates.find((c) => c.id === ctx.selectedGeneralId && c.block === null) ?? ctx.candidates.find((c) => c.block === null);
    const rateLine = active
        ? `成功率 ${Math.round((mission.successRate ?? 0) * 100)}%（派出時定下）`
        : picked ? `成功率 ${hallRateText(picked.rate, mission.intel, ctx.balance)}（${picked.name}）` : noCandidateText;
    const shortages = hallShortagesOf(mission.costs, ctx.stock);
    const shortText = shortages.map((s) => `${HALL_RESOURCE_NAME[s.resource]}不足（需 ${s.need}，現有 ${s.have}）`).join('、');
    const hasCandidate = ctx.candidates.some((c) => c.block === null);

    const blocked: Partial<Record<DetailActionKey, string>> = {};
    const offered: DetailActionKey[] = [];
    const offer = (key: DetailActionKey, reason: string | null): void => {
        if (reason === null) offered.push(key); else blocked[key] = reason;
    };
    if (active) {
        const msg = '任務進行中';
        offer('re-scout', msg); offer('wait', msg); offer('execute', msg); offer('assign', msg);
    } else {
        offer('re-scout', full ? '情報已完整' : ctx.stock.grain >= ctx.balance.reconCostGrain ? null : `糧草不足，再探需要 ${ctx.balance.reconCostGrain}（現有 ${Math.max(0, Math.floor(ctx.stock.grain))}）`);
        offer('wait', mission.waited ? '此任務已等待過' : null);
        const runReason = !hasCandidate ? noCandidateText : shortages.length > 0 ? shortText : null;
        offer('execute', runReason);
        offer('assign', runReason);
    }

    return {
        missionTypeLabel: `${HALL_WALL_NAME[mission.wall]}・${HALL_DIFFICULTY_NAME[mission.difficulty] ?? mission.difficulty}`,
        missionTitle: mission.title,
        missionBrief: mission.brief,
        intelRevealPercent: mission.intel,
        intelBody: mission.detail,
        intelFogVisible: !full,
        intelHintLabel: full ? '情報已完整' : `情報 ${mission.intel}%，再探或等待可提高`,
        envScoutTerrainLine: mission.wall === 'Domestic' ? '本任務無敵情' : `敵方：${full ? (mission.enemyHint || '無') : HALL_MASK_TEXT}`,
        envScoutWeatherLine: `重點屬性：${HALL_STAT_NAME[mission.keyStat] ?? mission.keyStat}・${active ? `還有 ${hallRemainingSeasons(mission, ctx.season)} 季回報` : `剩餘期限 ${hallRemainingExpiry(mission, ctx.season)} 季`}`,
        generalSelectHintLabel: rateLine,
        volunteerBadgeVisible: !active && picked?.volunteer === true,
        volunteerBadgeLabel: !active && picked?.volunteer === true ? `${picked.name} 毛遂自薦` : '',
        costFoodValueLabel: costLabel(mission.costs.grain, ctx.stock.grain),
        costFoodRatio: ratio(mission.costs.grain, COST_SCALE.grain),
        costTroopValueLabel: costLabel(mission.costs.troops, ctx.stock.troops),
        costTroopRatio: ratio(mission.costs.troops, COST_SCALE.troops),
        costSilverValueLabel: costLabel(mission.costs.silver, ctx.stock.silver),
        costSilverRatio: ratio(mission.costs.silver, COST_SCALE.silver),
        costTimeValueLabel: `${mission.durationSeasons} 季`,
        costTimeRatio: ratio(mission.durationSeasons, 3),
        rewardBaseLabel: rewardText(mission.rewards),
        rewardPerfectLabel: full
            ? `基礎獎勵另加 ${Math.round(ctx.balance.perfectBonusRatio * 100)}%（自告奮勇、${HALL_STAT_NAME[mission.keyStat] ?? ''} ≥ ${ctx.balance.perfectKeyStatThreshold}，或派出前情報已完整）`
            : HALL_MASK_TEXT,
        aiDelegateHintLabel: hasCandidate ? '委任：系統選最終成功率最高的武將' : noCandidateText,
        availableActions: offered,
        actionBlockedText: blocked,
    };
}
