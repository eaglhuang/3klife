/**
 * MissionSave — 任務存檔 v2 的建立、還原正規化，以及 v0／v1 → v2 遷移（純函式、不依賴 cc）
 *
 * 版本：
 *  - v0：存檔沒有任何任務欄位（新局或更舊的檔）→ 空板，由服務在綁定資料後立即補板。
 *  - v1：PROG-2-9130 的 HallMissionState（hallMissions）＋ hallIntel ＋ hallWaitSeasons。
 *      · 未接取（OPEN）任務以 legacyTemplateId 對應新定義重建，情報取 max(舊 intel, hallIntel[id])，等待旗標沿用。
 *        找不到對應定義的丟掉（補板時會補新的）。
 *      · 進行中（ACTIVE）任務一律保留，轉成 branchId 為 legacy-flat 的實例，結算走「依舊成功率、舊固定獎勵」，不重擲新樹；
 *        對應不到新定義也保留（顯示用的標題與獎勵都帶在 legacy 欄位裡），所以進行中任務不會遺失。
 *      · 舊紀錄轉成歷史（tier 只有 success／fail）。
 *  - v2：MissionSyncSnapshot（本檔 normalize 後使用）。
 * 舊欄位遷移後由宿主清除，不再寫回。
 */
import type { MissionDifficulty } from './MissionBalance';
import { MISSION_DIFFICULTIES } from './MissionBalance';
import { createMissionInstance } from './MissionSpawn';
import { LEGACY_FLAT_BRANCH_ID } from './MissionTypes';
import type {
    MissionGeneralState, MissionInstance, MissionPendingSpawn, MissionRecord, MissionSaveV2, MissionTier,
} from './MissionTypes';

export const MISSION_SAVE_VERSION = 2 as const;

export function createEmptyMissionSave(seed: number, season: number): MissionSaveV2 {
    return {
        version: MISSION_SAVE_VERSION, revision: 0, rng: { seed: seed >>> 0, serial: 0 }, season,
        missions: [], history: [], flags: {}, pending: [], generalStates: {}, unlocks: [],
    };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isDifficulty = (v: unknown): v is MissionDifficulty => (MISSION_DIFFICULTIES as readonly string[]).includes(v as string);
const TIERS: readonly string[] = ['critical', 'success', 'fail', 'disaster'];

function normalizeInstance(raw: unknown): MissionInstance | null {
    if (!isObj(raw) || !isStr(raw.id) || !isStr(raw.defId) || !isStr(raw.theme) || !isStr(raw.variant)) return null;
    if (!isNum(raw.spawnSeason) || !isNum(raw.expireSeason) || !isNum(raw.intel)) return null;
    const status = raw.status === 'ACTIVE' ? 'ACTIVE' : 'OPEN';
    const inst: MissionInstance = {
        id: raw.id, defId: raw.defId, defVersion: isNum(raw.defVersion) ? raw.defVersion : 1, theme: raw.theme, variant: raw.variant,
        spawnSeason: raw.spawnSeason, expireSeason: raw.expireSeason, intel: Math.max(0, Math.min(100, Math.round(raw.intel))),
        reconCount: isNum(raw.reconCount) ? Math.max(0, Math.floor(raw.reconCount)) : 0, waited: raw.waited === true, status,
    };
    if (isStr(raw.chainFrom)) inst.chainFrom = raw.chainFrom;
    if (isNum(raw.chainDepth) && raw.chainDepth >= 2) inst.chainDepth = Math.floor(raw.chainDepth);
    if (status === 'ACTIVE') {
        const d = raw.dispatch;
        if (!isObj(d) || !Array.isArray(d.generalIds) || d.generalIds.length === 0 || !isStr(d.branchId) || !isNum(d.returnSeason)) return null;
        inst.dispatch = {
            generalIds: d.generalIds.filter(isStr), delegated: d.delegated === true,
            intelAtDispatch: isNum(d.intelAtDispatch) ? d.intelAtDispatch : inst.intel, branchId: d.branchId,
            rate: isNum(d.rate) ? Math.max(0, Math.min(1, d.rate)) : 0.5, returnSeason: d.returnSeason,
        };
        if (inst.dispatch.generalIds.length === 0) return null;
    }
    const lg = raw.legacy;
    if (isObj(lg) && isStr(lg.title) && isDifficulty(lg.difficulty) && isObj(lg.rewards)) {
        inst.legacy = {
            title: lg.title, wall: isStr(lg.wall) ? lg.wall : 'Military', difficulty: lg.difficulty,
            // 舊存檔（無 gold 欄）的 silver 原本就是入金庫的金，讀入時改記為 gold；已入帳的數值不回溯
            rewards: lg.rewards.gold === undefined
                ? { grain: Number(lg.rewards.grain) || 0, gold: Number(lg.rewards.silver) || 0, silver: 0, generalExp: Number(lg.rewards.generalExp) || 0 }
                : { grain: Number(lg.rewards.grain) || 0, gold: Number(lg.rewards.gold) || 0, silver: Number(lg.rewards.silver) || 0, generalExp: Number(lg.rewards.generalExp) || 0 },
            fame: isNum(lg.fame) ? lg.fame : 0,
        };
    }
    return inst;
}

function normalizeRecord(raw: unknown): MissionRecord | null {
    if (!isObj(raw) || !isStr(raw.missionId) || !isStr(raw.title) || !isNum(raw.season) || !isStr(raw.generalId)) return null;
    return {
        missionId: raw.missionId, defId: isStr(raw.defId) ? raw.defId : raw.missionId, title: raw.title, season: raw.season,
        generalId: raw.generalId, branchId: isStr(raw.branchId) ? raw.branchId : '', tier: (TIERS.includes(raw.tier as string) ? raw.tier : 'fail') as MissionTier,
        intelAtDispatch: isNum(raw.intelAtDispatch) ? raw.intelAtDispatch : 0,
        narratives: Array.isArray(raw.narratives) ? raw.narratives.filter((n): n is string => typeof n === 'string') : [],
    };
}

/** 還原 v2：壞項目丟棄、缺欄位補預設；不是 v2（或不是物件）回傳 null，由呼叫端決定走遷移或空板 */
export function normalizeMissionSave(raw: unknown, recordLimit = 50): MissionSaveV2 | null {
    if (!isObj(raw) || raw.version !== MISSION_SAVE_VERSION) return null;
    const rng = isObj(raw.rng) ? raw.rng : {};
    const flags: Record<string, number | boolean> = {};
    if (isObj(raw.flags)) for (const [k, v] of Object.entries(raw.flags)) if (typeof v === 'number' || typeof v === 'boolean') flags[k] = v;
    const states: Record<string, MissionGeneralState> = {};
    if (isObj(raw.generalStates)) {
        for (const [id, s] of Object.entries(raw.generalStates)) {
            if (!isObj(s)) continue;
            const st: MissionGeneralState = {};
            if (isNum(s.injuredUntil)) st.injuredUntil = s.injuredUntil;
            if (isNum(s.capturedUntil)) st.capturedUntil = s.capturedUntil;
            if (st.injuredUntil !== undefined || st.capturedUntil !== undefined) states[id] = st;
        }
    }
    const seen = new Set<string>();
    const missions = (Array.isArray(raw.missions) ? raw.missions : []).map(normalizeInstance)
        .filter((m): m is MissionInstance => m !== null && !seen.has(m.id) && (seen.add(m.id), true));
    const pending: MissionPendingSpawn[] = (Array.isArray(raw.pending) ? raw.pending : []).filter(isObj)
        .filter(p => isStr(p.defId) && isNum(p.atSeason)).map(p => ({
            defId: p.defId as string, atSeason: p.atSeason as number,
            ...(isNum(p.intel) ? { intel: p.intel } : {}), ...(isNum(p.expireSeasons) ? { expireSeasons: p.expireSeasons } : {}),
            ...(isStr(p.chainFrom) ? { chainFrom: p.chainFrom } : {}),
            ...(isNum(p.chainDepth) && p.chainDepth >= 2 ? { chainDepth: Math.floor(p.chainDepth) } : {}),
        }));
    const maxSerial = missions.reduce((m, x) => { const n = Number(x.id.replace(/^\D+/, '')); return Number.isFinite(n) ? Math.max(m, n) : m; }, 0);
    return {
        version: MISSION_SAVE_VERSION, revision: isNum(raw.revision) ? Math.max(0, Math.floor(raw.revision)) : 0,
        rng: { seed: isNum(rng.seed) ? (rng.seed as number) >>> 0 : 1, serial: Math.max(isNum(rng.serial) ? Math.floor(rng.serial as number) : 0, maxSerial) },
        season: isNum(raw.season) ? Math.floor(raw.season) : 0,
        missions,
        history: (Array.isArray(raw.history) ? raw.history : []).map(normalizeRecord).filter((r): r is MissionRecord => r !== null).slice(-recordLimit),
        flags, pending, generalStates: states,
        unlocks: (Array.isArray(raw.unlocks) ? raw.unlocks : []).filter(isStr),
    };
}

// ───────────────────────── v1 → v2 ─────────────────────────

export interface LegacyMigrationInput {
    /** PROG-2-9130 的 hallMissions（可能壞掉或缺） */
    hallMissions?: unknown;
    /** PROG-2-9128 的 hallIntel：任務 id → 情報度 */
    hallIntel?: unknown;
    /** PROG-2-9128 的 hallWaitSeasons：任務 id → 等待的季 */
    hallWaitSeasons?: unknown;
    season: number;
    /** 沒有舊種子時使用 */
    fallbackSeed: number;
    /** 舊 templateId → 新定義 id */
    legacyIndex: ReadonlyMap<string, string>;
    /** 新定義：用來重建 OPEN 任務 */
    defs: ReadonlyMap<string, import('./MissionTypes').MissionDefinition>;
    /** 舊制「完美加成」比例（進行中任務的固定獎勵要把加成算進去） */
    perfectBonusRatio?: number;
    recordLimit?: number;
}

const LEGACY_WALLS: readonly string[] = ['Military', 'Domestic', 'Expedition'];

export interface LegacyMigrationResult { save: MissionSaveV2; keptActive: number; rebuiltOpen: number; droppedOpen: number }

/** 把 v1 轉成 v2；每一步都是純函式（同輸入同輸出），進行中任務不遺失 */
export function migrateLegacyHallMissions(input: LegacyMigrationInput): LegacyMigrationResult {
    const legacy = isObj(input.hallMissions) ? input.hallMissions : null;
    const seed = legacy && isNum(legacy.seed) ? (legacy.seed as number) >>> 0 : input.fallbackSeed >>> 0;
    const save = createEmptyMissionSave(seed, input.season);
    const intelMap = isObj(input.hallIntel) ? input.hallIntel : {};
    const waitMap = isObj(input.hallWaitSeasons) ? input.hallWaitSeasons : {};
    let keptActive = 0, rebuiltOpen = 0, droppedOpen = 0;
    if (!legacy || !isObj(legacy.boards)) return { save, keptActive, rebuiltOpen, droppedOpen };
    const boards = legacy.boards as Obj;
    const perfect = input.perfectBonusRatio ?? 0.25;
    const serial = isNum(legacy.serial) ? Math.floor(legacy.serial as number) : 0;
    for (const wall of LEGACY_WALLS) {
        const list = Array.isArray(boards[wall]) ? (boards[wall] as unknown[]) : [];
        for (const raw of list) {
            if (!isObj(raw) || !isStr(raw.id) || !isStr(raw.templateId)) continue;
            const id = raw.id;
            const oldIntel = Math.max(isNum(raw.intel) ? raw.intel : 0, isNum(intelMap[id]) ? (intelMap[id] as number) : 0);
            const waited = raw.waited === true || isNum(waitMap[id]);
            const defId = input.legacyIndex.get(raw.templateId);
            const def = defId ? input.defs.get(defId) : undefined;
            const createdSeason = isNum(raw.createdSeason) ? raw.createdSeason : input.season;
            if (raw.status === 'ACTIVE') {
                const generalId = isStr(raw.generalId) ? raw.generalId : '';
                if (!generalId) { droppedOpen += 1; continue; }
                const rw = isObj(raw.rewards) ? raw.rewards : {};
                const mult = raw.perfect === true ? 1 + perfect : 1;
                const difficulty = isDifficulty(raw.difficulty) ? raw.difficulty : 'EASY';
                const inst: MissionInstance = {
                    id, defId: def ? def.id : raw.templateId, defVersion: def ? def.version : 0, theme: def ? def.theme : wall.toLowerCase(),
                    variant: def ? def.variants[0].id : 'LEGACY', spawnSeason: createdSeason, expireSeason: isNum(raw.expireSeason) ? raw.expireSeason : input.season,
                    intel: Math.min(100, Math.round(oldIntel)), reconCount: oldIntel >= 100 ? 1 : 0, waited, status: 'ACTIVE',
                    dispatch: {
                        generalIds: [generalId], delegated: raw.delegated === true, intelAtDispatch: Math.min(100, Math.round(oldIntel)),
                        branchId: LEGACY_FLAT_BRANCH_ID, rate: isNum(raw.successRate) ? Math.max(0, Math.min(1, raw.successRate)) : 0.5,
                        returnSeason: isNum(raw.returnSeason) ? raw.returnSeason : input.season,
                    },
                    legacy: {
                        title: isStr(raw.title) ? raw.title : '任務', wall, difficulty,
                        rewards: {
                            grain: Math.round((Number(rw.grain) || 0) * mult), gold: Math.round((Number(rw.silver) || 0) * mult), silver: 0,
                            generalExp: Math.round((Number(rw.generalExp) || 0) * mult),
                        },
                        fame: 0,
                    },
                };
                save.missions.push(inst);
                keptActive += 1;
                continue;
            }
            if (!def) { droppedOpen += 1; continue; }
            const inst = createMissionInstance({ def, id, saveSeed: seed, season: createdSeason, spawnKey: 'legacy', intelOverride: oldIntel });
            inst.waited = waited;
            if (isNum(raw.expireSeason)) inst.expireSeason = raw.expireSeason;
            save.missions.push(inst);
            rebuiltOpen += 1;
        }
    }
    const records = Array.isArray(legacy.records) ? legacy.records : [];
    for (const r of records) {
        if (!isObj(r) || !isStr(r.missionId) || !isStr(r.generalId)) continue;
        save.history.push({
            missionId: r.missionId, defId: r.missionId, title: isStr(r.title) ? r.title : '任務', season: isNum(r.season) ? r.season : 0,
            generalId: r.generalId, branchId: LEGACY_FLAT_BRANCH_ID, tier: r.success === true ? 'success' : 'fail', intelAtDispatch: 0, narratives: [],
        });
    }
    save.history = save.history.slice(-(input.recordLimit ?? 50));
    // 新任務代號是 M 開頭的流水號，與舊代號（HM-…）不會相同；流水號沿用舊值即可
    save.rng.serial = Math.max(0, serial);
    return { save, keptActive, rebuiltOpen, droppedOpen };
}
