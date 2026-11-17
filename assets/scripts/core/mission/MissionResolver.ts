/**
 * MissionResolver — 結算引擎（純函式、可重播）
 *
 * - 無副作用、無 Date.now、無全域亂數；結果只由輸入決定。
 * - 每個結果樹節點用 deriveUnit(存檔種子, 任務 id, "resolve:<節點路徑>") 取自己的亂數，
 *   所以與「別的任務先結算」「呼叫幾次」「結算順序」都無關，server 重算必同。
 * - 只回傳帳本 effects，不改任何狀態；資源上限截斷由宿主在套用帳本時處理。
 */
import { DEFAULT_MISSION_BALANCE, MissionBalance, clampNumber, difficultyRank } from './MissionBalance';
import { selectBranch, findBranch } from './MissionBranch';
import { computeCost, computeFitness, MissionCost } from './MissionFitness';
import { clampIntel } from './MissionIntel';
import { deriveUnit } from './MissionRng';
import type {
    MissionAmount, MissionBranch, MissionDefinition, MissionDispatchLock, MissionEffect, MissionGeneralFacts,
    MissionInstance, MissionLedgerEntry, MissionMemoryEvent, MissionNode, MissionResolvedEffect, MissionRollNode, MissionSwitchNode,
    MissionTier, MissionTraceStep,
} from './MissionTypes';

export class MissionEngineError extends Error {
    constructor(message: string) { super(message); this.name = 'MissionEngineError'; }
}

export type MissionFlags = Readonly<Record<string, number | boolean>>;

// ───────────────────────── 派遣鎖定 ─────────────────────────

export interface LockDispatchInput {
    def: MissionDefinition;
    instance: Pick<MissionInstance, 'variant' | 'intel'>;
    general: MissionGeneralFacts;
    flags: MissionFlags;
    season: number;
    delegated?: boolean;
    /** 武將記憶／信心的預留輸入（-1～1） */
    executorAffinity?: number;
    balance?: MissionBalance;
}

/** 派遣當下鎖定情報度、分支與實際成功率；之後再探／等待都不影響這個任務的結算 */
export function lockDispatch(input: LockDispatchInput): { lock: MissionDispatchLock; cost: MissionCost } {
    const balance = input.balance ?? DEFAULT_MISSION_BALANCE;
    const intel = input.instance.intel;
    const branch = selectBranch(input.def, {
        variant: input.instance.variant, intel, flags: input.flags, generalTags: input.general.tags,
    });
    if (!branch) throw new MissionEngineError(`任務 ${input.def.id} 在情報 ${intel} 找不到可用分支`);
    const fit = computeFitness({
        def: input.def, branch, general: input.general, intel, executorAffinity: input.executorAffinity, balance,
    });
    const duration = Math.max(1, input.def.timing.durationSeasons + (branch.modifiers.durationDelta ?? 0));
    return {
        lock: {
            generalIds: [input.general.id], delegated: input.delegated === true,
            intelAtDispatch: intel, branchId: branch.id, rate: fit.rate, returnSeason: input.season + duration,
        },
        cost: computeCost(input.def, branch, balance),
    };
}

// ───────────────────────── 結算 ─────────────────────────

export interface ResolveInput {
    def: MissionDefinition;
    /** 必須已派遣（含 dispatch 鎖定） */
    instance: MissionInstance;
    general: MissionGeneralFacts;
    saveSeed: number;
    /** 結算所在季（寫入記憶事件） */
    season: number;
    flags: MissionFlags;
    balance?: MissionBalance;
}

export interface ResolveOutput {
    branchId: string;
    tier: MissionTier;
    rate: number;
    effects: MissionLedgerEntry[];
    trace: MissionTraceStep[];
    narratives: string[];
    memoryEvents: MissionMemoryEvent[];
}

interface Ctx {
    input: ResolveInput;
    balance: MissionBalance;
    branch: MissionBranch;
    intel: number;
    rate: number;
    tier: MissionTier | null;
    effects: MissionLedgerEntry[];
    trace: MissionTraceStep[];
    narratives: string[];
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

/**
 * 擲骰門檻：p＝成功機率、c＝成功中的大成功比例、d＝失敗中的大失敗比例。
 * 情報高時大失敗佔比縮小（全域曲線）；分支 riskMul 再縮放。投影層共用此函式，確保顯示與結算同源。
 */
export function rollThresholds(
    node: Pick<MissionRollNode, 'p' | 'critRatio' | 'disasterRatio'>, rate: number, intel: number, riskMul: number, balance: MissionBalance,
): { p: number; c: number; d: number } {
    const curve = balance.intelCurve;
    const intelFactor = lerp(curve.disasterFactorAtZero, curve.disasterFactorAtFull, clampNumber(intel, 0, 100) / 100);
    return {
        p: clampNumber(node.p ?? rate, 0, 1),
        c: clampNumber(node.critRatio, 0, 1),
        d: clampNumber(node.disasterRatio * riskMul * intelFactor, 0, 1),
    };
}

export function resolveMission(input: ResolveInput): ResolveOutput {
    const balance = input.balance ?? DEFAULT_MISSION_BALANCE;
    const lock = input.instance.dispatch;
    if (!lock) throw new MissionEngineError(`任務 ${input.instance.id} 尚未派遣，不能結算`);
    const branch = findBranch(input.def, lock.branchId);
    if (!branch) throw new MissionEngineError(`任務 ${input.def.id} 找不到鎖定的分支 ${lock.branchId}`);

    const ctx: Ctx = {
        input, balance, branch, intel: lock.intelAtDispatch, rate: lock.rate,
        tier: null, effects: [], trace: [], narratives: [],
    };
    walk(branch.outcome, 'root', ctx);
    const tier = ctx.tier ?? 'success';
    return {
        branchId: branch.id, tier, rate: lock.rate, effects: ctx.effects, trace: ctx.trace,
        narratives: ctx.narratives, memoryEvents: [buildMemoryEvent(ctx, tier)],
    };
}

function unitAt(ctx: Ctx, path: string): number {
    return deriveUnit(ctx.input.saveSeed, ctx.input.instance.id, `resolve:${path}`);
}

function walk(node: MissionNode, path: string, ctx: Ctx): void {
    if (node.narrative) ctx.narratives.push(node.narrative);
    switch (node.kind) {
        case 'roll': {
            const { p, c, d } = rollThresholds(node, ctx.rate, ctx.intel, ctx.branch.modifiers.riskMul, ctx.balance);
            const u = unitAt(ctx, path);
            let tier: MissionTier;
            if (u < p) tier = u < p * c ? 'critical' : 'success';
            else tier = u >= 1 - (1 - p) * d ? 'disaster' : 'fail';
            if (ctx.tier === null) ctx.tier = tier;
            ctx.trace.push({ path, kind: 'roll', u, p, tier });
            walk(node.tiers[tier], `${path}/${tier}`, ctx);
            return;
        }
        case 'chance': {
            const u = unitAt(ctx, path);
            const hit = u < clampNumber(node.p, 0, 1);
            ctx.trace.push({ path, kind: 'chance', u, p: node.p, matched: hit ? 'hit' : 'miss' });
            walk(hit ? node.hit : node.miss, `${path}/${hit ? 'hit' : 'miss'}`, ctx);
            return;
        }
        case 'switch': {
            const idx = pickSwitchCase(node, {
                def: ctx.input.def, variant: ctx.input.instance.variant, intel: ctx.intel, flags: ctx.input.flags, general: ctx.input.general,
            });
            ctx.trace.push({ path, kind: 'switch', matched: idx >= 0 ? `case${idx}` : 'else' });
            if (idx >= 0) walk(node.cases[idx].then, `${path}/case${idx}`, ctx);
            else if (node.else) walk(node.else, `${path}/else`, ctx);
            return;
        }
        case 'seq':
            ctx.trace.push({ path, kind: 'seq' });
            node.nodes.forEach((n, i) => walk(n, `${path}/${i}`, ctx));
            return;
        case 'effects':
            ctx.trace.push({ path, kind: 'effects' });
            for (const e of node.effects) pushEffect(e, path, ctx);
            return;
    }
}

// ───────────────────────── switch 取值 ─────────────────────────

type SwitchValue = { type: 'tags'; tags: readonly string[] } | { type: 'scalar'; value: string | number | boolean };

const STAT_EXPR = /^stat:(\w+)(>=|<=|>|<)(-?\d+(?:\.\d+)?)$/;

/** switch 求值環境；投影層沒有執行者時 general 給 null（視為無特質、屬性 0） */
export interface SwitchEnv {
    def: Pick<MissionDefinition, 'facts'>;
    variant: string;
    intel: number;
    flags: MissionFlags;
    general: Pick<MissionGeneralFacts, 'tags' | 'stats'> | null;
}

/** 回傳命中的 case 索引；沒命中回 -1（走 else） */
export function pickSwitchCase(node: Pick<MissionSwitchNode, 'on' | 'cases'>, env: SwitchEnv): number {
    const v = switchValue(node.on, env);
    for (let i = 0; i < node.cases.length; i += 1) {
        if (caseMatches(node.cases[i].when, node.cases[i].gte, v)) return i;
    }
    return -1;
}

function switchValue(on: string, env: SwitchEnv): SwitchValue {
    const { def, variant, flags } = env;
    const general = env.general ?? { tags: [] as string[], stats: {} };
    if (on === 'variant') return { type: 'scalar', value: variant };
    if (on === 'intel') return { type: 'scalar', value: env.intel };
    if (on === 'generalTag') return { type: 'tags', tags: general.tags };
    if (on.startsWith('flag:')) return { type: 'scalar', value: flags[on.slice(5)] ?? false };
    if (on.startsWith('fact:')) {
        const fact = (def.facts ?? []).find(f => f.key === on.slice(5));
        return { type: 'scalar', value: !!fact && fact.levels.some(l => l.minIntel <= env.intel) };
    }
    const m = STAT_EXPR.exec(on);
    if (m) {
        const stat = (general.stats as Record<string, number | undefined>)[m[1]] ?? 0;
        const n = Number(m[3]);
        const r = m[2] === '>=' ? stat >= n : m[2] === '<=' ? stat <= n : m[2] === '>' ? stat > n : stat < n;
        return { type: 'scalar', value: r };
    }
    if (on.startsWith('stat:')) return { type: 'scalar', value: (general.stats as Record<string, number | undefined>)[on.slice(5)] ?? 0 };
    throw new MissionEngineError(`不認得的 switch.on：${on}`);
}

function caseMatches(when: string | boolean | number | undefined, gte: number | undefined, v: SwitchValue): boolean {
    if (gte !== undefined) return v.type === 'scalar' && typeof v.value === 'number' && v.value >= gte;
    if (when === undefined) return false;
    if (v.type === 'tags') return typeof when === 'string' && v.tags.indexOf(when) >= 0;
    if (when === true) return !!v.value;
    if (when === false) return !v.value;
    return v.value === when;
}

// ───────────────────────── 效果與懲罰上限 ─────────────────────────

function scaleAmount(a: MissionAmount, ctx: Ctx): number {
    const base = typeof a === 'number' ? a : a.base;
    const key = typeof a === 'number' ? (a >= 0 ? 'reward' : 'risk') : a.mulKey;
    const mul = key === 'reward' ? ctx.branch.modifiers.rewardMul : key === 'risk' ? ctx.branch.modifiers.riskMul : 1;
    return Math.round(base * mul);
}

/** 轉成已縮放的效果；回傳 null 表示被懲罰上限丟棄（已寫入 trace） */
function resolveEffect(e: MissionEffect, path: string, ctx: Ctx): { effect: MissionResolvedEffect; note?: string } | null {
    switch (e.kind) {
        case 'resource': return { effect: { kind: 'resource', res: e.res, amount: scaleAmount(e.amount, ctx) } };
        case 'generalExp': return { effect: { kind: 'generalExp', amount: scaleAmount(e.amount, ctx) } };
        case 'fame': return { effect: { kind: 'fame', amount: scaleAmount(e.amount, ctx) } };
        case 'officerExp': return { effect: { kind: 'officerExp', amount: scaleAmount(e.amount, ctx) } };
        case 'morale': return { effect: { kind: 'morale', delta: scaleAmount(e.delta, ctx) } };
        case 'generalState': {
            const pen = ctx.balance.penalty;
            const tier = ctx.tier ?? 'success';
            const harm = pen.harmTiers.indexOf(tier) >= 0;
            if (e.state !== 'exhausted' && !harm) {
                ctx.trace.push({ path, kind: 'capped', tier, note: `${e.state} 只可能出現在 ${pen.harmTiers.join('/')}，已丟棄` });
                return null;
            }
            if (e.state === 'captured' && difficultyRank(ctx.input.def.difficulty) < difficultyRank(pen.captureMinDifficulty)) {
                ctx.trace.push({ path, kind: 'capped', tier, note: `被俘只在 ${pen.captureMinDifficulty} 以上，已丟棄` });
                return null;
            }
            const seasons = clampNumber(Math.round(e.seasons), pen.injuryMinSeasons, pen.injuryMaxSeasons);
            const note = seasons !== e.seasons ? `休養季數 ${e.seasons} 已限制為 ${seasons}` : undefined;
            return { effect: { kind: 'generalState', state: e.state, seasons }, note };
        }
        case 'intel': return { effect: { kind: 'intel', target: e.target, delta: e.delta } };
        default: return { effect: e as MissionResolvedEffect };
    }
}

function pushEffect(e: MissionEffect, path: string, ctx: Ctx): void {
    const r = resolveEffect(e, path, ctx);
    if (!r) return;
    const entry = {
        ...r.effect, missionId: ctx.input.instance.id, generalId: ctx.input.general.id, tier: ctx.tier ?? 'success',
    } as MissionLedgerEntry;
    if (r.note) {
        entry.note = r.note;
        ctx.trace.push({ path, kind: 'capped', note: r.note });
    }
    ctx.effects.push(entry);
}

// ───────────────────────── 記憶事件 ─────────────────────────

const TIER_TEXT: Record<MissionTier, string> = { critical: '大成功', success: '成功', fail: '失敗', disaster: '大失敗' };

function buildMemoryEvent(ctx: Ctx, tier: MissionTier): MissionMemoryEvent {
    const { def, instance, general, season } = ctx.input;
    const gains: Record<string, number> = {};
    const stateChanges: string[] = [];
    const tags: string[] = [];
    const notes: string[] = [];
    for (const e of ctx.effects) {
        if (e.kind === 'resource') gains[e.res] = (gains[e.res] ?? 0) + e.amount;
        else if (e.kind === 'generalExp' || e.kind === 'fame' || e.kind === 'officerExp') gains[e.kind] = (gains[e.kind] ?? 0) + e.amount;
        else if (e.kind === 'generalState') stateChanges.push(`${e.state}:${e.seasons}`);
        else if (e.kind === 'memoryNote') { tags.push(e.tag); notes.push(e.text); }
    }
    const text = notes.length > 0 ? notes.join('；') : `${def.text.title}：${TIER_TEXT[tier]}`;
    return {
        generalId: general.id, season, missionId: instance.id, defId: def.id, theme: def.theme,
        branchId: ctx.branch.id, objectiveId: ctx.branch.objective.id,
        intelAtDispatch: clampIntel(ctx.intel), delegated: instance.dispatch ? instance.dispatch.delegated : false,
        tier, gains, stateChanges, narrativeTags: tags, text,
    };
}
