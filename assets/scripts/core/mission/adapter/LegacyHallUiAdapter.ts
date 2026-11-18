/**
 * LegacyHallUiAdapter — 把新任務服務（IMissionService）的「已投影」資料轉成既有大廳畫面吃的形狀（純邏輯，不 import 'cc'）
 *
 * 既有畫面（任務牆列、牆面、詳情視窗）吃 LobbyHub 的 HallTask 與 HallDialogState；
 * 為了讓那批 UI 先不動（UI 屬於卡 D），這裡只做「新資料 → 舊形狀」的對映，不做任何規則判斷：
 *  - 所有數字與文字都來自服務的投影結果（情報不足時就是粗略文字，不會洩漏真相）。
 *  - 候選武將全員列出，不可派者附原因；沒有人時回傳空清單，由畫面顯示空狀態（不再退回設計稿的「關羽」）。
 */
import type { HallBoardKey } from '../../systems/HallMissionBoard';
import { HALL_DIFFICULTY_MIN_RANK } from '../../systems/HallMissionBoard';
import type { HallTask, LobbyHub } from '../../systems/LobbyHubSchema';
import type { DetailActionKey } from '../../../ui/core/HallDetailActionStates';
import type { HallDialogState } from '../../../ui/core/HallMissionView';
import type { IMissionService, MissionBoardView, MissionCardView, CandidateView } from '../service/IMissionService';

export const HALL_ADAPTER_WALL_NAME: Readonly<Record<HallBoardKey, string>> = Object.freeze({ Military: '軍事', Domestic: '內政', Expedition: '天下沙盤' });
export const HALL_ADAPTER_DIFFICULTY_NAME: Readonly<Record<string, string>> = Object.freeze({ EASY: '簡單', NORMAL: '普通', ELITE: '菁英', ADVANCED: '高級', HELL: '地獄' });
export const HALL_ADAPTER_NO_CANDIDATE_TEXT = '名冊裡目前沒有武將';
const BOARD_KEYS: readonly HallBoardKey[] = ['Military', 'Domestic', 'Expedition'];

/** 主題 → 牆別；未登錄的主題歸內政（任務牆只有三面，不讓任務憑空消失） */
export type WallOfTheme = (theme: string) => HallBoardKey;

const ratio = (value: number, scale: number): number => Math.max(0, Math.min(1, scale > 0 ? value / scale : 0));

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

/** 把 hub 的任務牆換成服務目前的任務；耗費逐張向服務查（耗費是明牌） */
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

/** 詳情視窗的武將清單：全員列出（真實名冊）；被擋者灰掉並附原因 */
export interface AdapterGeneralOption { id: string; label: string; volunteer?: boolean; blockedText?: string; memoryHint?: string }
export function candidateOptions(candidates: readonly CandidateView[]): AdapterGeneralOption[] {
    return candidates.map((c) => ({
        id: c.generalId,
        label: c.memoryHint ? `${c.name}（${c.memoryHint}）` : c.name,
        ...(c.volunteer ? { volunteer: true } : {}),
        ...(c.block.length > 0 ? { blockedText: c.blockText } : {}),
    }));
}

export interface AdapterDialogContext {
    season: number;
    stock: { grain: number; silver: number; troops: number };
    /** 再探要花的糧草（資料表值） */
    reconGrainCost: number;
    selectedGeneralId: string | null;
}

function costLabel(need: number, have: number): string {
    const text = need.toLocaleString('en-US');
    return need > Math.max(0, Math.floor(have)) ? `${text}（不足，現有 ${Math.max(0, Math.floor(have))}）` : text;
}

/** 詳情視窗 state（情報遮蔽、成功率投影、耗費不足標示、四鈕可用與原因）；沒有該任務回傳 null */
export function dialogStateFromService(service: IMissionService, missionId: string, wallOfTheme: WallOfTheme, ctx: Readonly<AdapterDialogContext>): HallDialogState | null {
    const detailRes = service.getDetail(missionId, ctx.selectedGeneralId ? { generalId: ctx.selectedGeneralId } : {});
    if (!detailRes.ok) return null;
    const d = detailRes.value;
    const candRes = service.getCandidates(missionId);
    const candidates = candRes.ok ? candRes.value : [];
    const free = candidates.filter((c) => c.block.length === 0);
    const picked = free.find((c) => c.generalId === ctx.selectedGeneralId) ?? null;
    const active = d.status === 'ACTIVE';
    const full = d.intelBand === 'full';
    const wall = wallOfTheme(d.theme);
    const emptyRoster = candidates.length === 0;
    const noCandidateText = emptyRoster ? HALL_ADAPTER_NO_CANDIDATE_TEXT : '目前沒有可派的武將（見下方各武將原因）';

    const shortages: string[] = [];
    if (d.cost.grain > ctx.stock.grain) shortages.push(`糧草不足（需 ${d.cost.grain}，現有 ${Math.max(0, Math.floor(ctx.stock.grain))}）`);
    if (d.cost.troops > ctx.stock.troops) shortages.push(`兵源不足（需 ${d.cost.troops}，現有 ${Math.max(0, Math.floor(ctx.stock.troops))}）`);
    if (d.cost.silver > ctx.stock.silver) shortages.push(`黃金不足（需 ${d.cost.silver}，現有 ${Math.max(0, Math.floor(ctx.stock.silver))}）`);

    const blocked: Partial<Record<DetailActionKey, string>> = {};
    const offered: DetailActionKey[] = [];
    const offer = (key: DetailActionKey, reason: string | null): void => { if (reason === null) offered.push(key); else blocked[key] = reason; };
    if (active) {
        for (const k of ['re-scout', 'wait', 'execute', 'assign'] as DetailActionKey[]) offer(k, '任務進行中');
    } else {
        offer('re-scout', !d.canRecon ? '情報已無法再靠再探提高' : ctx.stock.grain >= ctx.reconGrainCost ? null : `糧草不足，再探需要 ${ctx.reconGrainCost}（現有 ${Math.max(0, Math.floor(ctx.stock.grain))}）`);
        offer('wait', d.canWait ? null : '此任務已等待過');
        const run = free.length === 0 ? noCandidateText : shortages.length > 0 ? shortages.join('、') : null;
        offer('execute', run);
        offer('assign', run);
    }

    const rateLine = active ? `成功率 ${d.rate.text}（派出時定下）` : picked ? `成功率 ${picked.rate.text}（${picked.name}）` : free.length > 0 ? `成功率 ${d.rate.text}` : noCandidateText;
    const factsLine = d.facts.filter((f) => f.state !== 'hidden').map((f) => `${f.label}：${f.text}`).join('；');
    const left = Math.max(0, d.expireSeason - ctx.season + 1);

    return {
        missionTypeLabel: `${HALL_ADAPTER_WALL_NAME[wall]}・${HALL_ADAPTER_DIFFICULTY_NAME[d.difficulty] ?? d.difficulty}`,
        missionTitle: d.title,
        missionBrief: d.brief,
        intelRevealPercent: d.intel,
        intelBody: [d.objective.text, ...d.hints].filter((s) => s.length > 0).join('\n'),
        intelFogVisible: !full,
        intelHintLabel: full ? '情報已完整' : `情報 ${d.intel}%，再探或等待可提高`,
        envScoutTerrainLine: factsLine || '尚未探得敵情',
        envScoutWeatherLine: `風險：${d.risk.text}・${active ? '進行中' : `剩餘期限 ${left} 季`}`,
        generalSelectHintLabel: rateLine,
        volunteerBadgeVisible: !active && picked?.volunteer === true,
        volunteerBadgeLabel: !active && picked?.volunteer === true ? `${picked.name} 毛遂自薦` : '',
        costFoodValueLabel: costLabel(d.cost.grain, ctx.stock.grain),
        costFoodRatio: ratio(d.cost.grain, 400),
        costTroopValueLabel: costLabel(d.cost.troops, ctx.stock.troops),
        costTroopRatio: ratio(d.cost.troops, 500),
        costSilverValueLabel: costLabel(d.cost.silver, ctx.stock.silver),
        costSilverRatio: ratio(d.cost.silver, 300),
        costTimeValueLabel: `${d.durationSeasons} 季`,
        costTimeRatio: ratio(d.durationSeasons, 3),
        rewardBaseLabel: d.reward.text,
        rewardPerfectLabel: d.hiddenRewards.length > 0 ? d.hiddenRewards.join('、') : '???',
        aiDelegateHintLabel: free.length > 0 ? '委任：系統依武將記憶與適性選人' : noCandidateText,
        availableActions: offered,
        actionBlockedText: blocked,
    };
}
