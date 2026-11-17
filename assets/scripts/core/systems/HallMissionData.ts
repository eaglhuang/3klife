// @spec-source → doc_spec_1178（大廳任務完整循環規格書）§3、§4、§10；PROG-2-9130
/**
 * HallMissionData — 大廳任務完整循環的資料型別、資料檔解析與存檔還原（純邏輯，不依賴 cc）。
 *
 * - 模板庫（hall-mission-templates.json）與數值表（hall-mission-balance.json）的解析與驗證：壞資料回傳全部問題，不進流程。
 * - 任務實例 HallMission：產生時就把數值定下來（獎勵、耗費、門檻），之後資料檔改版不影響已在牆上的任務。
 * - 存檔：HallMissionState 完整還原每面牆任務、進行中任務、委任紀錄與亂數種子；壞項目丟棄。
 * - 亂數：存檔內的種子（mulberry32 狀態），以「回傳新狀態」的方式串接，同一存檔重進大廳不會換出不同任務。
 *
 * Unity 對照：像 ScriptableObject 的資料驗證加上一個可序列化的 SaveData；亂數是一顆存在存檔裡的 System.Random 種子。
 */
import type { HallBoardKey } from './HallMissionBoard';

export const HALL_MISSION_WALLS: readonly HallBoardKey[] = Object.freeze(['Military', 'Domestic', 'Expedition'] as HallBoardKey[]);
export const HALL_MISSION_DIFFICULTIES = ['EASY', 'NORMAL', 'ELITE', 'ADVANCED', 'HELL'] as const;
export type HallMissionDifficulty = (typeof HALL_MISSION_DIFFICULTIES)[number];
export const HALL_KEY_STATS = ['str', 'lea', 'int', 'pol', 'cha'] as const;
export type HallKeyStat = (typeof HALL_KEY_STATS)[number];

/** 模板資料檔的牆別字串 → 程式內的牆別鍵 */
const WALL_OF_TEMPLATE: Readonly<Record<string, HallBoardKey>> = Object.freeze({ MILITARY: 'Military', DOMESTIC: 'Domestic', EXPEDITION: 'Expedition' });

export interface HallMissionTemplate {
    templateId: string;
    wall: HallBoardKey;
    difficulty: HallMissionDifficulty;
    title: string;
    brief: string;
    detail: string;
    keyStat: HallKeyStat;
    enemyHint: string;
    sceneGambit?: string;
}

export interface HallDifficultyBalance {
    durationSeasons: number;
    powerRequired: number;
    rewardGrain: number;
    rewardSilver: number;
    generalExp: number;
    costGrain: number;
    costTroops: number;
    costSilver: number;
}

export interface HallWallRewardRatio { grain: number; silver: number; generalExp: number }
export interface HallWallCostRatio { grain: number; troops: number; silver: number }

export interface HallMissionBalance {
    wallTargetCount: number;
    expireSeasons: number;
    initialIntel: number;
    reconCostGrain: number;
    waitIntelBonus: number;
    waitExpireBonus: number;
    perfectBonusRatio: number;
    perfectKeyStatThreshold: number;
    recordLimit: number;
    caps: { grain: number; silver: number; troops: number };
    energyCost: Record<HallBoardKey, number>;
    weights: { top: number; minusOne: number; minusTwoOrLower: number };
    rate: {
        base: number; powerSlope: number; baseMin: number; baseMax: number;
        keyStatBaseline: number; keyStatPerPoint: number; keyStatMin: number; keyStatMax: number;
        volunteerBonus: number; finalMin: number; finalMax: number; previewMargin: number; previewStep: number;
    };
    difficulties: Record<HallMissionDifficulty, HallDifficultyBalance>;
    wallRewards: Record<HallBoardKey, HallWallRewardRatio>;
    wallCosts: Record<HallBoardKey, HallWallCostRatio>;
}

export interface HallMissionIssue { path: string; message: string }
export type HallMissionParse<T> = { ok: true; value: T; issues: [] } | { ok: false; issues: HallMissionIssue[] };

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** 佔位字樣：規格 §3.1 禁止出現在正式文案 */
const PLACEHOLDER_PATTERNS: readonly string[] = ['範例資料', '待企劃提供', '佔位', 'TODO', 'placeholder'];

export function parseHallMissionTemplates(raw: unknown): HallMissionParse<HallMissionTemplate[]> {
    const issues: HallMissionIssue[] = [];
    const list = isRec(raw) ? raw.Templates : undefined;
    if (!Array.isArray(list)) return { ok: false, issues: [{ path: 'Templates', message: '必須為陣列' }] };
    const out: HallMissionTemplate[] = [];
    const seen = new Set<string>();
    list.forEach((item, index) => {
        const path = `Templates[${index}]`;
        if (!isRec(item)) { issues.push({ path, message: '必須為物件' }); return; }
        const wall = typeof item.Wall === 'string' ? WALL_OF_TEMPLATE[item.Wall] : undefined;
        if (!wall) issues.push({ path: `${path}.Wall`, message: '必須為 MILITARY / DOMESTIC / EXPEDITION' });
        if (!(HALL_MISSION_DIFFICULTIES as readonly string[]).includes(item.Difficulty as string)) issues.push({ path: `${path}.Difficulty`, message: '難度不合法' });
        if (!(HALL_KEY_STATS as readonly string[]).includes(item.Key_Stat as string)) issues.push({ path: `${path}.Key_Stat`, message: '重點屬性不合法' });
        for (const key of ['Template_ID', 'Task_Title', 'Task_Brief', 'Task_Detail']) {
            const value = item[key];
            if (!isStr(value)) issues.push({ path: `${path}.${key}`, message: '必須為非空字串' });
            else if (PLACEHOLDER_PATTERNS.some((p) => value.includes(p))) issues.push({ path: `${path}.${key}`, message: '不可含佔位字樣' });
        }
        if (isStr(item.Template_ID)) {
            if (seen.has(item.Template_ID)) issues.push({ path: `${path}.Template_ID`, message: '模板代號重複' });
            seen.add(item.Template_ID);
        }
        if ((wall === 'Military' || wall === 'Expedition') && !isStr(item.Enemy_Hint)) issues.push({ path: `${path}.Enemy_Hint`, message: '軍事與沙盤任務必須有敵方說明' });
        out.push({
            templateId: item.Template_ID as string,
            wall: wall as HallBoardKey,
            difficulty: item.Difficulty as HallMissionDifficulty,
            title: item.Task_Title as string,
            brief: item.Task_Brief as string,
            detail: item.Task_Detail as string,
            keyStat: item.Key_Stat as HallKeyStat,
            enemyHint: typeof item.Enemy_Hint === 'string' ? item.Enemy_Hint : '',
            ...(isStr(item.Scene_Gambit) ? { sceneGambit: item.Scene_Gambit } : {}),
        });
    });
    return issues.length > 0 ? { ok: false, issues } : { ok: true, value: out, issues: [] };
}

function numField(issues: HallMissionIssue[], obj: unknown, key: string, path: string): number {
    const value = isRec(obj) ? obj[key] : undefined;
    if (!isNum(value)) { issues.push({ path: `${path}.${key}`, message: '必須為數字' }); return 0; }
    return value;
}

export function parseHallMissionBalance(raw: unknown): HallMissionParse<HallMissionBalance> {
    const issues: HallMissionIssue[] = [];
    if (!isRec(raw)) return { ok: false, issues: [{ path: '', message: '必須為物件' }] };
    const n = (key: string): number => numField(issues, raw, key, '');
    const caps = raw.Resource_Caps;
    const energy = raw.Energy_Cost;
    const weights = raw.Generate_Weights;
    const rate = raw.Success_Rate;
    const rateN = (key: string): number => numField(issues, rate, key, 'Success_Rate');
    const difficulties = {} as Record<HallMissionDifficulty, HallDifficultyBalance>;
    for (const d of HALL_MISSION_DIFFICULTIES) {
        const row = isRec(raw.Difficulties) ? raw.Difficulties[d] : undefined;
        const p = `Difficulties.${d}`;
        const f = (key: string): number => numField(issues, row, key, p);
        difficulties[d] = {
            durationSeasons: f('Duration_Seasons'), powerRequired: f('Power_Required'),
            rewardGrain: f('Reward_Grain'), rewardSilver: f('Reward_Silver'), generalExp: f('General_Exp'),
            costGrain: f('Cost_Grain'), costTroops: f('Cost_Troops'), costSilver: f('Cost_Silver'),
        };
        if (difficulties[d].durationSeasons < 1 || !Number.isInteger(difficulties[d].durationSeasons)) issues.push({ path: `${p}.Duration_Seasons`, message: '必須為 ≥1 的整數' });
        if (difficulties[d].powerRequired <= 0) issues.push({ path: `${p}.Power_Required`, message: '必須大於 0' });
    }
    const wallRewards = {} as Record<HallBoardKey, HallWallRewardRatio>;
    const wallCosts = {} as Record<HallBoardKey, HallWallCostRatio>;
    const energyCost = {} as Record<HallBoardKey, number>;
    for (const w of HALL_MISSION_WALLS) {
        const r = isRec(raw.Wall_Rewards) ? raw.Wall_Rewards[w] : undefined;
        const c = isRec(raw.Wall_Costs) ? raw.Wall_Costs[w] : undefined;
        wallRewards[w] = { grain: numField(issues, r, 'Grain', `Wall_Rewards.${w}`), silver: numField(issues, r, 'Silver', `Wall_Rewards.${w}`), generalExp: numField(issues, r, 'General_Exp', `Wall_Rewards.${w}`) };
        wallCosts[w] = { grain: numField(issues, c, 'Grain', `Wall_Costs.${w}`), troops: numField(issues, c, 'Troops', `Wall_Costs.${w}`), silver: numField(issues, c, 'Silver', `Wall_Costs.${w}`) };
        energyCost[w] = numField(issues, energy, w, 'Energy_Cost');
    }
    const balance: HallMissionBalance = {
        wallTargetCount: n('Wall_Target_Count'), expireSeasons: n('Expire_Seasons'), initialIntel: n('Initial_Intel_Percent'),
        reconCostGrain: n('Recon_Cost_Grain'), waitIntelBonus: n('Wait_Intel_Bonus'), waitExpireBonus: n('Wait_Expire_Bonus_Seasons'),
        perfectBonusRatio: n('Perfect_Bonus_Ratio'), perfectKeyStatThreshold: n('Perfect_Key_Stat_Threshold'), recordLimit: n('Record_Limit'),
        caps: { grain: numField(issues, caps, 'GRAIN', 'Resource_Caps'), silver: numField(issues, caps, 'SILVER', 'Resource_Caps'), troops: numField(issues, caps, 'TROOPS', 'Resource_Caps') },
        energyCost,
        weights: { top: numField(issues, weights, 'Top', 'Generate_Weights'), minusOne: numField(issues, weights, 'Minus_One', 'Generate_Weights'), minusTwoOrLower: numField(issues, weights, 'Minus_Two_Or_Lower', 'Generate_Weights') },
        rate: {
            base: rateN('Base'), powerSlope: rateN('Power_Slope'), baseMin: rateN('Base_Min'), baseMax: rateN('Base_Max'),
            keyStatBaseline: rateN('Key_Stat_Baseline'), keyStatPerPoint: rateN('Key_Stat_Per_Point'), keyStatMin: rateN('Key_Stat_Min'), keyStatMax: rateN('Key_Stat_Max'),
            volunteerBonus: rateN('Volunteer_Bonus'), finalMin: rateN('Final_Min'), finalMax: rateN('Final_Max'), previewMargin: rateN('Preview_Margin'), previewStep: rateN('Preview_Step'),
        },
        difficulties, wallRewards, wallCosts,
    };
    if (balance.wallTargetCount < 1 || !Number.isInteger(balance.wallTargetCount)) issues.push({ path: 'Wall_Target_Count', message: '必須為 ≥1 的整數' });
    return issues.length > 0 ? { ok: false, issues } : { ok: true, value: balance, issues: [] };
}

// ── 任務實例 ────────────────────────────────────────────────────────────────

export interface HallMissionAmounts { grain: number; silver: number; troops: number }

export interface HallMission {
    id: string;
    templateId: string;
    wall: HallBoardKey;
    difficulty: HallMissionDifficulty;
    title: string;
    brief: string;
    detail: string;
    keyStat: HallKeyStat;
    enemyHint: string;
    sceneGambit?: string;
    durationSeasons: number;
    powerRequired: number;
    /** 基礎獎勵 */
    rewards: { grain: number; silver: number; generalExp: number };
    /** 派出時扣的耗費 */
    costs: HallMissionAmounts;
    /** 派出武將的精力耗費 */
    energyCost: number;
    /** 情報度 0~100 */
    intel: number;
    createdSeason: number;
    /** 未接取任務的到期季；進行中的任務不會過期 */
    expireSeason: number;
    /** 是否已用過「等待」 */
    waited: boolean;
    status: 'OPEN' | 'ACTIVE';
    /** 以下僅 ACTIVE */
    generalId?: string;
    generalName?: string;
    successRate?: number;
    returnSeason?: number;
    delegated?: boolean;
    /** 派出當下是否符合完美加成條件（自告奮勇、重點屬性達標、情報度已 100） */
    perfect?: boolean;
}

export interface HallMissionRecord {
    missionId: string;
    title: string;
    wall: HallBoardKey;
    generalId: string;
    generalName: string;
    successRate: number;
    success: boolean;
    perfect: boolean;
    /** 結算的季（totalSeasonsElapsed） */
    season: number;
    /** 實際入帳 */
    gains: { grain: number; silver: number; generalExp: number };
}

export interface HallMissionState {
    /** mulberry32 狀態；每次擲骰後更新並存檔 */
    seed: number;
    /** 已發出的任務流水號，保證任務代號不重複 */
    serial: number;
    boards: Record<HallBoardKey, HallMission[]>;
    records: HallMissionRecord[];
}

export function emptyHallMissionState(seed = 1): HallMissionState {
    return { seed: normalizeSeed(seed), serial: 0, boards: { Military: [], Domestic: [], Expedition: [] }, records: [] };
}

// ── 亂數（存檔種子）─────────────────────────────────────────────────────────

export function normalizeSeed(seed: unknown): number {
    const v = typeof seed === 'number' && Number.isFinite(seed) ? Math.floor(seed) >>> 0 : 1;
    return v === 0 ? 1 : v;
}

/** 取一個 [0,1) 亂數並回傳新的種子狀態（mulberry32） */
export function nextHallRandom(seed: number): { value: number; seed: number } {
    const next = (seed + 0x6d2b79f5) >>> 0;
    let t = next;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

/** 用文字雜湊出新開局種子（呼叫端給玩家資料或時間字串） */
export function hallSeedFromText(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return normalizeSeed(h >>> 0);
}

// ── 存檔還原 ────────────────────────────────────────────────────────────────

function amounts(raw: unknown): HallMissionAmounts {
    const o = isRec(raw) ? raw : {};
    const f = (v: unknown): number => (isNum(v) && v > 0 ? Math.floor(v) : 0);
    return { grain: f(o.grain), silver: f(o.silver), troops: f(o.troops) };
}

function normalizeMission(raw: unknown, wall: HallBoardKey): HallMission | null {
    if (!isRec(raw) || !isStr(raw.id) || !isStr(raw.templateId) || !isStr(raw.title)) return null;
    if (!(HALL_MISSION_DIFFICULTIES as readonly string[]).includes(raw.difficulty as string)) return null;
    if (!(HALL_KEY_STATS as readonly string[]).includes(raw.keyStat as string)) return null;
    const int = (v: unknown, min: number, fallback: number): number => (isNum(v) && Math.floor(v) >= min ? Math.floor(v) : fallback);
    const rewards = isRec(raw.rewards) ? raw.rewards : {};
    const mission: HallMission = {
        id: raw.id, templateId: raw.templateId, wall,
        difficulty: raw.difficulty as HallMissionDifficulty,
        title: raw.title,
        brief: typeof raw.brief === 'string' ? raw.brief : '',
        detail: typeof raw.detail === 'string' ? raw.detail : '',
        keyStat: raw.keyStat as HallKeyStat,
        enemyHint: typeof raw.enemyHint === 'string' ? raw.enemyHint : '',
        ...(isStr(raw.sceneGambit) ? { sceneGambit: raw.sceneGambit } : {}),
        durationSeasons: int(raw.durationSeasons, 1, 1),
        powerRequired: Math.max(1, int(raw.powerRequired, 1, 100)),
        rewards: { grain: int(rewards.grain, 0, 0), silver: int(rewards.silver, 0, 0), generalExp: int(rewards.generalExp, 0, 0) },
        costs: amounts(raw.costs),
        energyCost: int(raw.energyCost, 0, 0),
        intel: Math.min(100, int(raw.intel, 0, 50)),
        createdSeason: int(raw.createdSeason, 0, 0),
        expireSeason: int(raw.expireSeason, 0, 0),
        waited: raw.waited === true,
        status: raw.status === 'ACTIVE' ? 'ACTIVE' : 'OPEN',
    };
    if (mission.status === 'ACTIVE') {
        if (!isStr(raw.generalId) || !isNum(raw.successRate) || !isNum(raw.returnSeason)) return null;
        mission.generalId = raw.generalId;
        mission.generalName = typeof raw.generalName === 'string' ? raw.generalName : raw.generalId;
        mission.successRate = Math.max(0, Math.min(1, raw.successRate));
        mission.returnSeason = Math.floor(raw.returnSeason);
        mission.delegated = raw.delegated === true;
        mission.perfect = raw.perfect === true;
    }
    return mission;
}

function normalizeRecord(raw: unknown): HallMissionRecord | null {
    if (!isRec(raw) || !isStr(raw.missionId) || !isStr(raw.title) || !isStr(raw.generalId)) return null;
    const wall = HALL_MISSION_WALLS.find((w) => w === raw.wall);
    if (!wall || !isNum(raw.successRate) || !isNum(raw.season)) return null;
    const gains = isRec(raw.gains) ? raw.gains : {};
    const f = (v: unknown): number => (isNum(v) && v > 0 ? Math.floor(v) : 0);
    return {
        missionId: raw.missionId, title: raw.title, wall, generalId: raw.generalId,
        generalName: typeof raw.generalName === 'string' ? raw.generalName : raw.generalId,
        successRate: Math.max(0, Math.min(1, raw.successRate)), success: raw.success === true, perfect: raw.perfect === true,
        season: Math.floor(raw.season), gains: { grain: f(gains.grain), silver: f(gains.silver), generalExp: f(gains.generalExp) },
    };
}

/**
 * 存檔 → 任務狀態。沒有（舊存檔）或壞掉時回傳 null，由呼叫端視為空任務板並重新產生（規格 §10）。
 * 壞項目丟棄；同一代號只留第一筆；同一武將同時只留一筆進行中任務。
 */
export function normalizeHallMissionState(raw: unknown, recordLimit = 20): HallMissionState | null {
    if (!isRec(raw) || !isRec(raw.boards)) return null;
    const state = emptyHallMissionState(typeof raw.seed === 'number' ? raw.seed : 1);
    const ids = new Set<string>();
    const busyGenerals = new Set<string>();
    for (const wall of HALL_MISSION_WALLS) {
        const list = (raw.boards as Rec)[wall];
        if (!Array.isArray(list)) continue;
        for (const item of list) {
            const mission = normalizeMission(item, wall);
            if (!mission || ids.has(mission.id)) continue;
            if (mission.status === 'ACTIVE') {
                if (busyGenerals.has(mission.generalId as string)) continue;
                busyGenerals.add(mission.generalId as string);
            }
            ids.add(mission.id);
            state.boards[wall].push(mission);
        }
    }
    state.serial = Math.max(isNum(raw.serial) ? Math.floor(raw.serial) : 0, 0);
    state.records = (Array.isArray(raw.records) ? raw.records : []).map(normalizeRecord).filter((r): r is HallMissionRecord => r !== null).slice(-recordLimit);
    return state;
}

/** 複本：存檔與狀態轉換都用，避免共用參考 */
export function cloneHallMissionState(state: Readonly<HallMissionState>): HallMissionState {
    const boards = {} as Record<HallBoardKey, HallMission[]>;
    for (const wall of HALL_MISSION_WALLS) boards[wall] = state.boards[wall].map((m) => ({ ...m, rewards: { ...m.rewards }, costs: { ...m.costs } }));
    return { seed: state.seed, serial: state.serial, boards, records: state.records.map((r) => ({ ...r, gains: { ...r.gains } })) };
}
