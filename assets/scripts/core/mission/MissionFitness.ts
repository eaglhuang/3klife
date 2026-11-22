/**
 * MissionFitness — 執行者適合度、阻擋原因、耗費、委任選將
 *
 * 成功率（沿用舊規格 §7.2 的主幹）：
 *   base + statAdj + tagAdj + affinityAdj + intelAdj + branch.successDelta + volunteer
 * executorAffinity（-1～1）是給「武將記憶／信心」的預留輸入；此卡不實作記憶，宿主算好傳進來即可。
 */
import { DEFAULT_MISSION_BALANCE, MissionBalance, clampNumber } from './MissionBalance';
import { selectBranch } from './MissionBranch';
import type {
    MissionBlock, MissionBranch, MissionDefinition, MissionGeneralFacts, MissionInstance, MissionStatKey,
} from './MissionTypes';

export interface FitnessPart { key: string; value: number }
export interface FitnessResult { rate: number; parts: FitnessPart[] }

export interface FitnessInput {
    def: MissionDefinition;
    branch: MissionBranch | null;
    general: MissionGeneralFacts | null;
    /** 參與公式的情報度（投影用目前情報；結算用派遣鎖定值） */
    intel: number;
    executorAffinity?: number;
    balance?: MissionBalance;
}

/** 重點屬性加權（分支可覆寫），正規化成總和 1 */
function normalizedWeights(def: MissionDefinition, branch: MissionBranch | null): Array<[MissionStatKey, number]> {
    const src = (branch && branch.objective.keyStats) ? branch.objective.keyStats : def.requirement.keyStats;
    const entries = (Object.keys(src) as MissionStatKey[]).map(k => [k, Math.max(0, src[k] ?? 0)] as [MissionStatKey, number]);
    const total = entries.reduce((s, e) => s + e[1], 0);
    if (total <= 0) return [];
    return entries.map(([k, w]) => [k, w / total]);
}

export function computeFitness(input: FitnessInput): FitnessResult {
    const bal = input.balance ?? DEFAULT_MISSION_BALANCE;
    const f = bal.fitness;
    const parts: FitnessPart[] = [];
    const g = input.general;

    let base = f.base;
    if (g) {
        const need = bal.difficulties[input.def.difficulty].needPower || 1;
        const power = Number.isFinite(g.power) ? g.power : 0;
        base = clampNumber(f.base + ((power - need) / need) * f.powerSlope, f.baseMin, f.baseMax);
    }
    parts.push({ key: 'base', value: base });

    let statAdj = 0;
    if (g) {
        for (const [k, w] of normalizedWeights(input.def, input.branch)) {
            const v = g.stats[k];
            if (typeof v === 'number' && Number.isFinite(v)) statAdj += w * (v - f.statBaseline) * f.statPerPoint;
        }
        statAdj = clampNumber(statAdj, f.statMin, f.statMax);
    }
    parts.push({ key: 'stat', value: statAdj });

    let tagAdj = 0;
    if (g) {
        const prefer = (input.def.requirement.preferTags ?? []).filter(t => g.tags.indexOf(t) >= 0).length;
        const avoid = (input.def.requirement.avoidTags ?? []).filter(t => g.tags.indexOf(t) >= 0).length;
        tagAdj = Math.min(f.tagCap, prefer * f.tagStep) - avoid * f.tagStep;
    }
    parts.push({ key: 'tag', value: tagAdj });

    const affinity = clampNumber(input.executorAffinity ?? 0, -1, 1);
    parts.push({ key: 'affinity', value: g ? affinity * f.affinityMax : 0 });

    parts.push({ key: 'intel', value: ((input.intel - 50) / 100) * bal.intelCurve.successSlope });
    parts.push({ key: 'branch', value: input.branch ? input.branch.modifiers.successDelta : 0 });

    const volunteer = g && g.volunteer === true ? f.volunteerBonus : 0;
    parts.push({ key: 'volunteer', value: volunteer });

    const sum = parts.reduce((s, p) => s + p.value, 0);
    const rate = clampNumber(sum, f.finalMin, volunteer > 0 ? f.finalMaxVolunteer : f.finalMax);
    return { rate, parts };
}

// ───────────────────────── 耗費 ─────────────────────────

export interface MissionCost { grain: number; troops: number; gold: number; silver: number; energy: number }

/** 耗費：定義缺省用難度表；分支 costMul 縮放。耗費一律明牌，所以此值可直接給 UI */
export function computeCost(def: MissionDefinition, branch: MissionBranch | null, balance: MissionBalance = DEFAULT_MISSION_BALANCE): MissionCost {
    const d = balance.difficulties[def.difficulty];
    const mul = branch?.modifiers.costMul ?? 1;
    const pick = (v: number | undefined, fallback: number): number => Math.round((v ?? fallback) * mul);
    return {
        grain: pick(def.cost?.grain, d.cost.grain),
        troops: pick(def.cost?.troops, d.cost.troops),
        gold: pick(def.cost?.gold, d.cost.gold),
        silver: pick(def.cost?.silver, d.cost.silver),
        energy: def.energy ?? d.energy,
    };
}

// ───────────────────────── 候選與委任 ─────────────────────────

/** 阻擋原因：武將自帶的 block＋精力不足（全部列出，不是只給一個） */
export function blocksOf(general: MissionGeneralFacts, energyCost: number): MissionBlock[] {
    const out = general.block.slice();
    if (general.vitality < energyCost && out.indexOf('low-energy') < 0) out.push('low-energy');
    return out;
}

export interface CandidateEval {
    generalId: string;
    name: string;
    branchId: string | null;
    rate: number;
    parts: FitnessPart[];
    block: MissionBlock[];
    volunteer: boolean;
    vitality: number;
}

export function evaluateCandidate(
    def: MissionDefinition,
    inst: Pick<MissionInstance, 'variant' | 'intel'>,
    general: MissionGeneralFacts,
    flags: Readonly<Record<string, number | boolean>>,
    opts: { balance?: MissionBalance; executorAffinity?: number } = {},
): CandidateEval {
    const balance = opts.balance ?? DEFAULT_MISSION_BALANCE;
    const branch = selectBranch(def, { variant: inst.variant, intel: inst.intel, flags, generalTags: general.tags });
    const fit = computeFitness({ def, branch, general, intel: inst.intel, executorAffinity: opts.executorAffinity, balance });
    const energy = computeCost(def, branch, balance).energy;
    return {
        generalId: general.id, name: general.name, branchId: branch ? branch.id : null,
        rate: fit.rate, parts: fit.parts, block: blocksOf(general, energy),
        volunteer: general.volunteer === true, vitality: general.vitality,
    };
}

/** 排序：可派者先、自告奮勇先、成功率高、精力高、代號字典序（全員都列出，被擋者排後面） */
export function rankCandidates(rows: readonly CandidateEval[]): CandidateEval[] {
    return rows.slice().sort((a, b) => {
        if ((a.block.length === 0) !== (b.block.length === 0)) return a.block.length === 0 ? -1 : 1;
        if (a.volunteer !== b.volunteer) return a.volunteer ? -1 : 1;
        if (a.rate !== b.rate) return b.rate - a.rate;
        if (a.vitality !== b.vitality) return b.vitality - a.vitality;
        return a.generalId < b.generalId ? -1 : a.generalId > b.generalId ? 1 : 0;
    });
}

/**
 * 委任選將：可派者中排名第一者。武將記憶／信心請經 evaluateAllCandidates 的 affinityByGeneral 帶入，
 * 已反映在 rate；沒有可派者回傳 null。
 */
export function pickDelegate(rows: readonly CandidateEval[]): CandidateEval | null {
    for (const r of rankCandidates(rows)) {
        if (r.block.length === 0) return r;
    }
    return null;
}

/** 對全員評估並排序；affinityByGeneral 缺省為 0 */
export function evaluateAllCandidates(
    def: MissionDefinition,
    inst: Pick<MissionInstance, 'variant' | 'intel'>,
    generals: readonly MissionGeneralFacts[],
    flags: Readonly<Record<string, number | boolean>>,
    opts: { balance?: MissionBalance; affinityByGeneral?: Readonly<Record<string, number>> } = {},
): CandidateEval[] {
    return rankCandidates(generals.map(g => evaluateCandidate(def, inst, g, flags, {
        balance: opts.balance, executorAffinity: opts.affinityByGeneral?.[g.id] ?? 0,
    })));
}
