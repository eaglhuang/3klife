/**
 * MissionBoardRules — 任務板：補充、過期、連鎖生成（純函式，亂數一律由存檔種子衍生，不用 Date.now）
 *
 * 規則來自 mission-boards.json（資料）：
 *  - 每面牆「未接取」任務補到 targetCount；進行中的不佔名額。
 *  - 難度只從玩家官階看得到的難度抽；候選權重 = 官階相對權重 × 難度絕對權重 × 主題權重 × 覆寫倍率。
 *  - chainOnly 的定義只會由連鎖產生；requiresFlags／minFame 沒達到不出現。
 *  - 同一面牆不出現兩筆相同定義（未接取與進行中的都算）。
 * 全部函式回傳新快照，不修改輸入。
 */
import type { MissionDifficulty } from './MissionBalance';
import { MISSION_DIFFICULTIES } from './MissionBalance';
import { createMissionInstance } from './MissionSpawn';
import { deriveUnit } from './MissionRng';
import type { MissionDefinition, MissionInstance, MissionPendingSpawn, MissionSyncSnapshot } from './MissionTypes';

export interface MissionBoardWall { targetCount: number; themes: string[] }
export interface MissionBoardOverride {
    defId: string;
    weight?: number;
    chainOnly?: boolean;
    requiresFlags?: string[];
    minFame?: number;
}
export interface MissionBoardsConfig {
    walls: Record<string, MissionBoardWall>;
    rankRelativeWeights: { top: number; minusOne: number; minusTwoOrLower: number };
    difficultyWeights: Record<MissionDifficulty, number>;
    themeWeights: Record<string, number>;
    overrides: MissionBoardOverride[];
}

export interface MissionCatalogEntry { id: string; theme: string; difficulty: MissionDifficulty; wall: string }

export interface BoardRefillContext {
    season: number;
    /** 官階看得到的難度（由低到高，至少含最低一級） */
    visibleDifficulties: readonly MissionDifficulty[];
    fame: number;
    /** 世界旗標帶來的初始情報加成：回傳該定義的加成值 */
    intelBonusOf?: (def: MissionDefinition) => number;
}

export function missionIdOf(serial: number): string {
    return `M${String(serial).padStart(4, '0')}`;
}

/** 某面牆上的任務（依主題推得牆別；主題未登錄者不屬於任何牆） */
export function wallOf(inst: Pick<MissionInstance, 'theme'>, themeWall: ReadonlyMap<string, { wall: string }>): string | null {
    return themeWall.get(inst.theme)?.wall ?? null;
}

/** 難度相對權重：與可見最高難度的差距 0→top、1→minusOne、≥2→minusTwoOrLower */
export function rankRelativeWeight(visible: readonly MissionDifficulty[], d: MissionDifficulty, w: MissionBoardsConfig['rankRelativeWeights']): number {
    const gap = visible.length - 1 - visible.indexOf(d);
    return gap === 0 ? w.top : gap === 1 ? w.minusOne : w.minusTwoOrLower;
}

function cloneSnapshot(s: MissionSyncSnapshot): MissionSyncSnapshot {
    return {
        ...s,
        rng: { ...s.rng },
        missions: s.missions.map(m => ({ ...m })),
        history: s.history.slice(),
        flags: { ...s.flags },
        pending: s.pending ? s.pending.map(p => ({ ...p })) : [],
        generalStates: s.generalStates ? { ...s.generalStates } : {},
        unlocks: s.unlocks ? s.unlocks.slice() : [],
    };
}

export interface BoardResult { snapshot: MissionSyncSnapshot; spawned: MissionInstance[] }

/** 補板：三面牆（或任何 config.walls）都補到目標數；沒有可用定義時有幾筆補幾筆 */
export function refillBoards(
    snap: MissionSyncSnapshot, catalog: readonly MissionCatalogEntry[], defs: ReadonlyMap<string, MissionDefinition>,
    boards: MissionBoardsConfig, themeWall: ReadonlyMap<string, { wall: string }>, ctx: BoardRefillContext,
): BoardResult {
    const next = cloneSnapshot(snap);
    const spawned: MissionInstance[] = [];
    const overrideOf = new Map(boards.overrides.map(o => [o.defId, o]));
    for (const wall of Object.keys(boards.walls)) {
        const cfg = boards.walls[wall];
        const inWall = (m: MissionInstance): boolean => wallOf(m, themeWall) === wall;
        let guard = 0;
        while (next.missions.filter(m => m.status === 'OPEN' && inWall(m)).length < cfg.targetCount && guard < 50) {
            guard += 1;
            const taken = new Set(next.missions.filter(inWall).map(m => m.defId));
            const pool = catalog.filter(c => {
                if (c.wall !== wall || !cfg.themes.includes(c.theme) || taken.has(c.id)) return false;
                if (!ctx.visibleDifficulties.includes(c.difficulty)) return false;
                const o = overrideOf.get(c.id);
                if (o?.chainOnly) return false;
                if (o?.requiresFlags && o.requiresFlags.some(f => !next.flags[f])) return false;
                if (o?.minFame !== undefined && ctx.fame < o.minFame) return false;
                return true;
            });
            if (pool.length === 0) break;
            const weights = pool.map(c => Math.max(0,
                rankRelativeWeight(ctx.visibleDifficulties, c.difficulty, boards.rankRelativeWeights)
                * (boards.difficultyWeights[c.difficulty] ?? 0)
                * (boards.themeWeights[c.theme] ?? 1)
                * (overrideOf.get(c.id)?.weight ?? 1)));
            const total = weights.reduce((a, b) => a + b, 0);
            next.rng.serial += 1;
            const id = missionIdOf(next.rng.serial);
            const u = deriveUnit(next.rng.seed, id, `board:${wall}:${ctx.season}`);
            let pick = pool[pool.length - 1];
            if (total > 0) {
                let acc = u * total;
                for (let i = 0; i < pool.length; i += 1) { acc -= weights[i]; if (acc < 0) { pick = pool[i]; break; } }
            } else pick = pool[Math.min(pool.length - 1, Math.floor(u * pool.length))];
            const def = defs.get(pick.id) as MissionDefinition;
            const inst = createMissionInstance({
                def, id, saveSeed: next.rng.seed, season: ctx.season, spawnKey: wall, intelBonus: ctx.intelBonusOf ? ctx.intelBonusOf(def) : 0,
            });
            next.missions.push(inst);
            spawned.push(inst);
        }
    }
    return { snapshot: next, spawned };
}

/** 過期：移除未接取且到期季早於目前季的任務；進行中的不動 */
export function expireMissions(snap: MissionSyncSnapshot, season: number): { snapshot: MissionSyncSnapshot; expired: MissionInstance[] } {
    const next = cloneSnapshot(snap);
    const expired = next.missions.filter(m => m.status === 'OPEN' && season > m.expireSeason);
    next.missions = next.missions.filter(m => !(m.status === 'OPEN' && season > m.expireSeason));
    return { snapshot: next, expired };
}

export interface ChainSpawnRequest {
    defId: string;
    intel?: number;
    afterSeasons?: number;
    expireSeasons?: number;
    chainFrom?: string;
}

/**
 * 連鎖：立即產生（afterSeasons 缺省或 0）或排入延後佇列。
 * 同一定義已有未接取／進行中的任務時不重複產生（立即產生的情況）。
 */
export function applyChainSpawn(
    snap: MissionSyncSnapshot, req: ChainSpawnRequest, defs: ReadonlyMap<string, MissionDefinition>, season: number,
): BoardResult {
    const next = cloneSnapshot(snap);
    const def = defs.get(req.defId);
    if (!def) return { snapshot: next, spawned: [] };
    if (req.afterSeasons && req.afterSeasons > 0) {
        const p: MissionPendingSpawn = { defId: req.defId, atSeason: season + req.afterSeasons };
        if (req.intel !== undefined) p.intel = req.intel;
        if (req.expireSeasons !== undefined) p.expireSeasons = req.expireSeasons;
        if (req.chainFrom) p.chainFrom = req.chainFrom;
        (next.pending as MissionPendingSpawn[]).push(p);
        return { snapshot: next, spawned: [] };
    }
    if (next.missions.some(m => m.defId === req.defId)) return { snapshot: next, spawned: [] };
    next.rng.serial += 1;
    const inst = createMissionInstance({
        def, id: missionIdOf(next.rng.serial), saveSeed: next.rng.seed, season, spawnKey: 'chain',
        intelOverride: req.intel, expireSeasons: req.expireSeasons, chainFrom: req.chainFrom,
    });
    next.missions.push(inst);
    return { snapshot: next, spawned: [inst] };
}

/** 到期的延後連鎖：本季（含）以前的都產生 */
export function releasePendingSpawns(snap: MissionSyncSnapshot, defs: ReadonlyMap<string, MissionDefinition>, season: number): BoardResult {
    let cur = cloneSnapshot(snap);
    const due = (cur.pending ?? []).filter(p => p.atSeason <= season);
    cur.pending = (cur.pending ?? []).filter(p => p.atSeason > season);
    const spawned: MissionInstance[] = [];
    for (const p of due) {
        const r = applyChainSpawn(cur, { defId: p.defId, intel: p.intel, expireSeasons: p.expireSeasons, chainFrom: p.chainFrom }, defs, season);
        cur = r.snapshot;
        spawned.push(...r.spawned);
    }
    return { snapshot: cur, spawned };
}

export const MISSION_DIFFICULTY_ORDER = MISSION_DIFFICULTIES;
