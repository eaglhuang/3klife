// @spec-source → doc_spec_1178 §6（再探、等待）、§7.3（派出）、§8（委任）、§9（換季結算）；PROG-2-9130
/**
 * HallMissionLoop — 大廳任務「派出 → 換季結算」的狀態轉換（純邏輯，不依賴 cc）。
 *
 * 所有函式都不改輸入、回傳新狀態；資源入帳、精力扣除、名冊與存檔由 GameSession 負責。
 *   - dispatchHallMission：檢查 → 扣耗費 → 任務轉進行中（武將、成功率、回報季）。
 *   - reconHallMission／waitHallMission：再探（糧草 50，情報到 100）與等待（到期 +1、情報 +25，每筆一次）。
 *   - settleDueHallMissions：Return_Season ≤ 新季的進行中任務逐筆擲骰結算（成功發獎勵與完美加成、上限截斷；失敗只留官職經驗）。
 *   - appendHallRecords：委任紀錄（最近 N 筆）。
 *
 * Unity 對照：像 Quest 系統的 StateMachine（Open → Active → Settled），每次轉換回傳新快照。
 */
import { HALL_INTEL_FULL_PERCENT } from './HallTaskIntel';
import {
    HALL_MISSION_WALLS, cloneHallMissionState, nextHallRandom,
    type HallMission, type HallMissionAmounts, type HallMissionBalance, type HallMissionRecord, type HallMissionState,
} from './HallMissionData';
import { hallGeneralBlockOf, hallPerfectEligible, hallShortageText, hallShortagesOf, hallSuccessRateOf, HALL_BLOCK_TEXT, type HallGeneralFacts, type HallShortage } from './HallMissionRules';

export function findHallMission(state: Readonly<HallMissionState>, missionId: string): HallMission | undefined {
    for (const wall of HALL_MISSION_WALLS) {
        const found = state.boards[wall].find((m) => m.id === missionId);
        if (found) return found;
    }
    return undefined;
}

/** 進行中任務 */
export function activeHallMissions(state: Readonly<HallMissionState>): HallMission[] {
    return HALL_MISSION_WALLS.flatMap((wall) => state.boards[wall].filter((m) => m.status === 'ACTIVE'));
}

/** 正在出任務的武將 id */
export function hallBusyGeneralIds(state: Readonly<HallMissionState>): Set<string> {
    return new Set(activeHallMissions(state).map((m) => m.generalId as string));
}

function replaceMission(state: HallMissionState, mission: HallMission): void {
    const list = state.boards[mission.wall];
    const index = list.findIndex((m) => m.id === mission.id);
    if (index >= 0) list[index] = mission;
}

// ── 再探、等待 ──────────────────────────────────────────────────────────────

export type HallReconResult =
    | { ok: true; state: HallMissionState; costGrain: number }
    | { ok: false; reason: 'no-mission' | 'full' | 'short' | 'active'; text: string };

/** 再探：情報度已 100 或進行中不可；糧草不足不扣；其餘扣糧草並把情報度升到 100 */
export function reconHallMission(state: Readonly<HallMissionState>, missionId: string, grain: number, balance: Readonly<HallMissionBalance>): HallReconResult {
    const mission = findHallMission(state, missionId);
    if (!mission) return { ok: false, reason: 'no-mission', text: '此任務已不存在' };
    if (mission.status === 'ACTIVE') return { ok: false, reason: 'active', text: '任務進行中，不能再探' };
    if (mission.intel >= HALL_INTEL_FULL_PERCENT) return { ok: false, reason: 'full', text: '情報已完整' };
    if (!(grain >= balance.reconCostGrain)) {
        return { ok: false, reason: 'short', text: `糧草不足，再探需要 ${balance.reconCostGrain}（目前 ${Math.max(0, Math.floor(grain))}）` };
    }
    const next = cloneHallMissionState(state);
    replaceMission(next, { ...mission, intel: HALL_INTEL_FULL_PERCENT });
    return { ok: true, state: next, costGrain: balance.reconCostGrain };
}

export type HallWaitResult =
    | { ok: true; state: HallMissionState; expireSeason: number; intel: number }
    | { ok: false; reason: 'no-mission' | 'already' | 'active'; text: string };

/** 等待：不耗費；到期季 +1、情報度 +25（上限 100）；每筆只能一次 */
export function waitHallMission(state: Readonly<HallMissionState>, missionId: string, balance: Readonly<HallMissionBalance>): HallWaitResult {
    const mission = findHallMission(state, missionId);
    if (!mission) return { ok: false, reason: 'no-mission', text: '此任務已不存在' };
    if (mission.status === 'ACTIVE') return { ok: false, reason: 'active', text: '任務進行中，不能等待' };
    if (mission.waited) return { ok: false, reason: 'already', text: '此任務已等待過' };
    const next = cloneHallMissionState(state);
    const updated: HallMission = {
        ...mission, waited: true,
        expireSeason: mission.expireSeason + balance.waitExpireBonus,
        intel: Math.min(HALL_INTEL_FULL_PERCENT, mission.intel + balance.waitIntelBonus),
    };
    replaceMission(next, updated);
    return { ok: true, state: next, expireSeason: updated.expireSeason, intel: updated.intel };
}

// ── 派出 ────────────────────────────────────────────────────────────────────

export type HallDispatchReason = 'no-mission' | 'not-open' | 'blocked' | 'busy' | 'short';

export type HallMissionDispatchResult =
    | { ok: true; state: HallMissionState; mission: HallMission; spent: HallMissionAmounts; energy: number }
    | { ok: false; reason: HallDispatchReason; text: string; shortages?: HallShortage[] };

export interface HallDispatchInput {
    missionId: string;
    general: HallGeneralFacts;
    delegated: boolean;
    /** 目前季（totalSeasonsElapsed） */
    season: number;
    stock: HallMissionAmounts;
}

/** 派出（§7.3）：檢查耗費與武將 → 任務轉為進行中。扣資源、扣精力由呼叫端依回傳的 spent／energy 處理 */
export function dispatchHallMission(state: Readonly<HallMissionState>, input: Readonly<HallDispatchInput>, balance: Readonly<HallMissionBalance>): HallMissionDispatchResult {
    const mission = findHallMission(state, input.missionId);
    if (!mission) return { ok: false, reason: 'no-mission', text: '此任務已不存在' };
    if (mission.status !== 'OPEN') return { ok: false, reason: 'not-open', text: '此任務已經派出' };
    // 武將佔用到回報季（§7.3）：執行、委任、接取、AI 委任都走這一關，已在任務中的武將一律拒絕
    if (hallBusyGeneralIds(state).has(input.general.id)) return { ok: false, reason: 'busy', text: `${input.general.name}${HALL_BLOCK_TEXT['on-mission']}，無法出任務` };
    const block = hallGeneralBlockOf(mission, input.general);
    if (block) return { ok: false, reason: 'blocked', text: `${input.general.name}${HALL_BLOCK_TEXT[block]}，無法出任務` };
    const shortages = hallShortagesOf(mission.costs, input.stock);
    if (shortages.length > 0) return { ok: false, reason: 'short', text: hallShortageText(shortages), shortages };
    const rate = hallSuccessRateOf(mission, input.general, balance).final;
    const active: HallMission = {
        ...mission,
        status: 'ACTIVE',
        generalId: input.general.id,
        generalName: input.general.name,
        successRate: rate,
        returnSeason: input.season + mission.durationSeasons,
        delegated: input.delegated,
        perfect: hallPerfectEligible(mission, input.general, balance),
    };
    const next = cloneHallMissionState(state);
    replaceMission(next, active);
    return { ok: true, state: next, mission: active, spent: { ...mission.costs }, energy: mission.energyCost };
}

// ── 換季結算 ────────────────────────────────────────────────────────────────

export interface HallSettleEntry {
    mission: HallMission;
    success: boolean;
    /** 成功且符合完美條件 */
    perfectApplied: boolean;
    /** 擲骰值（測試與除錯用） */
    roll: number;
    /** 實際入帳（已截斷）；武將經驗由呼叫端再依武將上限調整 */
    gains: { grain: number; silver: number; generalExp: number };
    /** 因超過上限被截掉的量 */
    truncated: { grain: number; silver: number };
}

export interface HallSettleResult {
    state: HallMissionState;
    entries: HallSettleEntry[];
    /** 結算後的資源庫存（入帳後） */
    stock: HallMissionAmounts;
}

/**
 * 到期結算（§9 步驟 1）：回報季 ≤ 新季的進行中任務，依「回報季、牆別、代號」固定順序逐筆結算。
 * 成功發基礎獎勵（超過上限的部分截斷），完美條件成立另發基礎獎勵 50%；失敗不發獎勵、不退耗費。
 */
export function settleDueHallMissions(state: Readonly<HallMissionState>, season: number, stock: Readonly<HallMissionAmounts>, balance: Readonly<HallMissionBalance>): HallSettleResult {
    const next = cloneHallMissionState(state);
    const wallOrder = (wall: string): number => HALL_MISSION_WALLS.indexOf(wall as never);
    const due = activeHallMissions(next)
        .filter((m) => (m.returnSeason as number) <= season)
        .sort((a, b) => (a.returnSeason as number) - (b.returnSeason as number) || wallOrder(a.wall) - wallOrder(b.wall) || (a.id < b.id ? -1 : 1));
    const entries: HallSettleEntry[] = [];
    const running: HallMissionAmounts = { grain: stock.grain, silver: stock.silver, troops: stock.troops };
    for (const mission of due) {
        const roll = nextHallRandom(next.seed);
        next.seed = roll.seed;
        const success = roll.value < (mission.successRate as number);
        const perfectApplied = success && mission.perfect === true;
        const multiplier = perfectApplied ? 1 + balance.perfectBonusRatio : 1;
        const want = success
            ? { grain: Math.floor(mission.rewards.grain * multiplier), silver: Math.floor(mission.rewards.silver * multiplier), generalExp: Math.floor(mission.rewards.generalExp * multiplier) }
            : { grain: 0, silver: 0, generalExp: 0 };
        const grainRoom = Math.max(0, balance.caps.grain - running.grain);
        const silverRoom = Math.max(0, balance.caps.silver - running.silver);
        const gains = { grain: Math.min(want.grain, grainRoom), silver: Math.min(want.silver, silverRoom), generalExp: want.generalExp };
        running.grain += gains.grain;
        running.silver += gains.silver;
        entries.push({ mission, success, perfectApplied, roll: roll.value, gains, truncated: { grain: want.grain - gains.grain, silver: want.silver - gains.silver } });
        next.boards[mission.wall] = next.boards[mission.wall].filter((m) => m.id !== mission.id);
    }
    return { state: next, entries, stock: running };
}

// ── 委任紀錄 ────────────────────────────────────────────────────────────────

export function recordOfSettlement(entry: Readonly<HallSettleEntry>, season: number): HallMissionRecord {
    const m = entry.mission;
    return {
        missionId: m.id, title: m.title, wall: m.wall,
        generalId: m.generalId as string, generalName: m.generalName as string,
        successRate: m.successRate as number, success: entry.success, perfect: entry.perfectApplied,
        season, gains: { ...entry.gains },
    };
}

/** 追加紀錄並只留最近 limit 筆 */
export function appendHallRecords(state: Readonly<HallMissionState>, records: readonly HallMissionRecord[], limit: number): HallMissionState {
    const next = cloneHallMissionState(state);
    next.records = [...next.records, ...records.map((r) => ({ ...r, gains: { ...r.gains } }))].slice(-Math.max(1, limit));
    return next;
}

/** 紀錄回看：新到舊 */
export function listHallRecords(state: Readonly<HallMissionState>): HallMissionRecord[] {
    return state.records.slice().reverse().map((r) => ({ ...r, gains: { ...r.gains } }));
}

// ── 季度回報 ────────────────────────────────────────────────────────────────

/** 季度結算彈窗「大廳任務」區塊的一行：任務名、武將、結果、實際入帳各項（§9 步驟 4） */
export function hallSettleLine(entry: Readonly<HallSettleEntry>): string {
    const m = entry.mission;
    const head = `${m.title}（${m.generalName ?? ''}）${entry.success ? '成功' : '失敗'}`;
    if (!entry.success) return `${head}，無獎勵`;
    const parts: string[] = [];
    if (entry.gains.grain > 0) parts.push(`糧草 +${entry.gains.grain}`);
    if (entry.gains.silver > 0) parts.push(`黃金 +${entry.gains.silver}`);
    if (entry.gains.generalExp > 0) parts.push(`武將經驗 +${entry.gains.generalExp}`);
    const cut: string[] = [];
    if (entry.truncated.grain > 0) cut.push(`糧草 ${entry.truncated.grain}`);
    if (entry.truncated.silver > 0) cut.push(`黃金 ${entry.truncated.silver}`);
    return `${head}，${parts.join('、')}${entry.perfectApplied ? '（含完美加成）' : ''}${cut.length > 0 ? `（超過上限，截掉 ${cut.join('、')}）` : ''}`;
}
