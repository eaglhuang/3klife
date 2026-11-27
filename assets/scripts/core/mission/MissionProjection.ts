/**
 * MissionProjection — 依情報度投影的玩家視圖
 *
 * 原則：UI 只拿 MissionDetailView，不拿實例（variant／被選分支／確切數字都不外洩）。
 * 使用者裁決：
 *  - 低情報時風險只顯示「高？」，但真實風險更高（由分支 successDelta／riskMul 與全域曲線在結算層保證）。
 *  - 低情報時「定性文字」（facts）可能被誤導，由 hash(存檔種子, 任務 id, 事實, 情報層) 決定，可重播、
 *    重開視窗不變；確切數字（成功率、獎勵、耗費）永遠不誤導，只是粗細程度不同。
 */
import { DEFAULT_MISSION_BALANCE, MissionBalance, clampNumber } from './MissionBalance';
import { findBranch, selectBranch } from './MissionBranch';
import { computeCost, computeFitness } from './MissionFitness';
import { intelBandOf } from './MissionIntel';
import { deriveUnit } from './MissionRng';
import { MissionFlags, pickSwitchCase, rollThresholds, SwitchEnv } from './MissionResolver';
import { contentRef, missionTextKey } from './MissionTextKeys';
import type {
    MissionBranch, MissionDefinition, MissionDetailView, MissionEffect, MissionFactView, MissionGeneralFacts,
    MissionI18nRef, MissionInstance, MissionIntelBand, MissionNode, MissionTier, Revealable,
} from './MissionTypes';

export const RES_TEXT: Record<string, string> = {
    grain: '糧草', gold: '金', silver: '銀兩', troops: '兵力', generalExp: '武將經驗', fame: '名聲', officerExp: '官職經驗',
};

// ───────────────────────── 結果樹分析（真相，僅供投影內部使用） ─────────────────────────

export interface BranchAnalysis {
    /** 四級機率 */
    probs: Record<MissionTier, number>;
    /** 成功級的獎勵總量（已乘 rewardMul） */
    successRewards: Record<string, number>;
    /** 風險標籤（受傷、被俘、折損資源…） */
    harmTags: string[];
    /** 只有大成功才有的額外收穫（後續任務、解鎖…） */
    hiddenRewards: string[];
}

function scaled(amount: number | { base: number; mulKey: string }, mods: MissionBranch['modifiers']): number {
    const base = typeof amount === 'number' ? amount : amount.base;
    const key = typeof amount === 'number' ? (amount >= 0 ? 'reward' : 'risk') : amount.mulKey;
    return Math.round(base * (key === 'reward' ? mods.rewardMul : key === 'risk' ? mods.riskMul : 1));
}

function effectHarm(e: MissionEffect, mods: MissionBranch['modifiers'], out: Set<string>): void {
    if (e.kind === 'generalState') {
        if (e.state === 'injured') out.add('武將可能受傷');
        else if (e.state === 'captured') out.add('武將可能被俘');
    } else if ((e.kind === 'resource' || e.kind === 'fame') && scaled(e.amount, mods) < 0) {
        out.add(e.kind === 'fame' ? '名聲可能下降' : '可能折損資源');
    } else if (e.kind === 'relation' && e.delta < 0) {
        out.add('可能得罪對方');
    }
}

/** 收集子樹的風險標籤（所有分叉都看） */
function collectHarm(node: MissionNode, mods: MissionBranch['modifiers'], out: Set<string>): void {
    switch (node.kind) {
        case 'effects': node.effects.forEach(e => effectHarm(e, mods, out)); return;
        case 'seq': node.nodes.forEach(n => collectHarm(n, mods, out)); return;
        case 'roll': (['critical', 'success', 'fail', 'disaster'] as MissionTier[]).forEach(t => collectHarm(node.tiers[t], mods, out)); return;
        case 'chance': collectHarm(node.hit, mods, out); collectHarm(node.miss, mods, out); return;
        case 'switch': node.cases.forEach(c => collectHarm(c.then, mods, out)); if (node.else) collectHarm(node.else, mods, out); return;
    }
}

/** 估算某級節點的正向收益（chance 以機率加權；switch 依環境取單一分支） */
function collectRewards(node: MissionNode, mods: MissionBranch['modifiers'], env: SwitchEnv, weight: number, out: Record<string, number>): void {
    switch (node.kind) {
        case 'effects':
            for (const e of node.effects) {
                if (e.kind === 'resource' || e.kind === 'generalExp' || e.kind === 'fame' || e.kind === 'officerExp') {
                    const v = scaled(e.amount, mods) * weight;
                    if (v > 0) { const k = e.kind === 'resource' ? e.res : e.kind; out[k] = (out[k] ?? 0) + v; }
                }
            }
            return;
        case 'seq': node.nodes.forEach(n => collectRewards(n, mods, env, weight, out)); return;
        case 'roll': collectRewards(node.tiers.success, mods, env, weight, out); return;
        case 'chance': collectRewards(node.hit, mods, env, weight * node.p, out); collectRewards(node.miss, mods, env, weight * (1 - node.p), out); return;
        case 'switch': {
            const i = pickSwitchCase(node, env);
            if (i >= 0) collectRewards(node.cases[i].then, mods, env, weight, out);
            else if (node.else) collectRewards(node.else, mods, env, weight, out);
            return;
        }
    }
}

function collectHidden(node: MissionNode, out: Set<string>): void {
    switch (node.kind) {
        case 'effects':
            for (const e of node.effects) {
                if (e.kind === 'spawn') out.add('可能引出後續任務');
                else if (e.kind === 'unlock') out.add('可能解鎖新機緣');
                else if (e.kind === 'trait' && e.add) out.add('武將可能習得特質');
            }
            return;
        case 'seq': node.nodes.forEach(n => collectHidden(n, out)); return;
        case 'chance': collectHidden(node.hit, out); return;
        case 'switch': node.cases.forEach(c => collectHidden(c.then, out)); if (node.else) collectHidden(node.else, out); return;
        case 'roll': collectHidden(node.tiers.critical, out); return;
    }
}

/** 找最上層會決定成敗等級的第一個 roll（switch 依環境取單一分支） */
function findTopRoll(node: MissionNode, env: SwitchEnv): Extract<MissionNode, { kind: 'roll' }> | null {
    switch (node.kind) {
        case 'roll': return node;
        case 'seq':
            for (const n of node.nodes) { const r = findTopRoll(n, env); if (r) return r; }
            return null;
        case 'switch': {
            const i = pickSwitchCase(node, env);
            if (i >= 0) return findTopRoll(node.cases[i].then, env);
            return node.else ? findTopRoll(node.else, env) : null;
        }
        case 'chance': return null;
        default: return null;
    }
}

export function analyzeBranch(branch: MissionBranch, def: MissionDefinition, variant: string, intel: number, flags: MissionFlags,
    general: Pick<MissionGeneralFacts, 'tags' | 'stats'> | null, rate: number, balance: MissionBalance): BranchAnalysis {
    const env: SwitchEnv = { def, variant, intel, flags, general };
    const mods = branch.modifiers;
    const top = findTopRoll(branch.outcome, env);
    let probs: Record<MissionTier, number> = { critical: 0, success: 1, fail: 0, disaster: 0 };
    if (top) {
        const { p, c, d } = rollThresholds(top, rate, intel, mods.riskMul, balance);
        probs = { critical: p * c, success: p * (1 - c), fail: (1 - p) * (1 - d), disaster: (1 - p) * d };
    }
    const successRewards: Record<string, number> = {};
    collectRewards(top ? top.tiers.success : branch.outcome, mods, env, 1, successRewards);
    const harm = new Set<string>();
    collectHarm(branch.outcome, mods, harm);
    const hidden = new Set<string>();
    collectHidden(top ? top.tiers.critical : branch.outcome, hidden);
    return { probs, successRewards, harmTags: Array.from(harm), hiddenRewards: Array.from(hidden) };
}

// ───────────────────────── 各項目投影 ─────────────────────────

/** 高中低的語系參照（成功率、風險共用；鍵 mission.proj.level.*） */
const LEVEL_KEY: Record<string, string> = { '高': 'high', '中': 'mid', '低': 'low' };
const levelRef = (lv: string): MissionI18nRef => ({ key: `mission.proj.level.${LEVEL_KEY[lv] ?? lv}`, fb: lv });
/** 資源名的語系參照（mission.proj.res.*）；沒有登記的資源沿用原字 */
const resRef = (k: string): MissionI18nRef => ({ key: `mission.proj.res.${k}`, fb: RES_TEXT[k] ?? k });
/** 隱藏獎勵文字 → 語系鍵尾（效果收集時寫死的三句） */
export const HIDDEN_REWARD_KEY: Readonly<Record<string, string>> = Object.freeze({
    '可能引出後續任務': 'spawn', '可能解鎖新機緣': 'unlock', '武將可能習得特質': 'trait',
});

const floorStep =(v: number, s: number): number => Math.floor(v / s) * s;
const ceilStep = (v: number, s: number): number => Math.ceil(v / s) * s;

/** 成功率：未知 → 高中低 → 區間（端點位移由雜湊決定，穩定不可刷） → 確切 */
export function projectRate(trueRate: number, intel: number, missionId: string, saveSeed: number, balance: MissionBalance = DEFAULT_MISSION_BALANCE): Revealable {
    const band = intelBandOf(intel, balance);
    const pct = Math.round(trueRate * 100);
    const pj = balance.projection;
    if (band === 'blind') return { state: 'hidden', text: '未知', i18n: [{ key: 'mission.proj.rate.unknown' }] };
    if (band === 'vague') {
        const lv = trueRate >= pj.rateHigh ? '高' : trueRate >= pj.rateMid ? '中' : '低';
        return { state: 'hint', text: `成功率：${lv}`, i18n: [{ key: 'mission.proj.rate.vague', args: [levelRef(lv)] }] };
    }
    if (band === 'clear') {
        const shift = (Math.floor(deriveUnit(saveSeed, missionId, `proj:rate:${band}`) * 3) - 1) * pj.rangeStep;
        const lo = clampNumber(floorStep(pct - pj.rangeHalfWidth + shift, pj.rangeStep), 0, 100);
        const hi = clampNumber(ceilStep(pct + pj.rangeHalfWidth + shift, pj.rangeStep), 0, 100);
        return { state: 'range', text: `約 ${lo}～${hi}%`, lo, hi, i18n: [{ key: 'mission.proj.rate.range', args: [lo, hi] }] };
    }
    return { state: 'exact', text: `${pct}%`, value: pct };
}

function riskLevel(pDisaster: number, balance: MissionBalance): string {
    const pj = balance.projection;
    return pDisaster < pj.riskLow ? '低' : pDisaster < pj.riskMid ? '中' : '高';
}

/** 風險：低情報一律悲觀「高？」，不給細節 */
export function projectRisk(a: BranchAnalysis, intel: number, balance: MissionBalance = DEFAULT_MISSION_BALANCE): { risk: Revealable; tags: string[] } {
    const band = intelBandOf(intel, balance);
    if (band === 'blind') return { risk: { state: 'hidden', text: '高？', i18n: [{ key: 'mission.proj.risk.unknown' }] }, tags: [] };
    const lv = riskLevel(a.probs.disaster, balance);
    const levelText: Revealable = { state: 'hint', text: `風險：${lv}`, i18n: [{ key: 'mission.proj.risk.level', args: [levelRef(lv)] }] };
    if (band === 'vague') return { risk: levelText, tags: a.harmTags.slice(0, 1) };
    if (band === 'clear') return { risk: levelText, tags: a.harmTags };
    const v = Math.round(a.probs.disaster * 100);
    return { risk: { state: 'exact', text: `大失敗約 ${v}%`, value: v, i18n: [{ key: 'mission.proj.risk.exact', args: [v] }] }, tags: a.harmTags };
}

function weightedScore(rewards: Record<string, number>, balance: MissionBalance): number {
    let s = 0;
    for (const k of Object.keys(rewards)) s += rewards[k] * (balance.projection.rewardWeights[k] ?? 1);
    return s;
}

/** 獎勵：種類圖示＋「？」→ 量級星等 → 區間 → 確切；隱藏獎勵只在最高情報度顯示 */
export function projectReward(a: BranchAnalysis, intel: number, missionId: string, saveSeed: number, balance: MissionBalance = DEFAULT_MISSION_BALANCE): { reward: Revealable; hidden: string[] } {
    const band = intelBandOf(intel, balance);
    const pj = balance.projection;
    const kinds = Object.keys(a.successRewards);
    const hidden = intel >= balance.hiddenRevealIntel ? a.hiddenRewards : [];
    if (band === 'blind') {
        const ref: MissionI18nRef = kinds.length > 0
            ? { key: 'mission.proj.reward.blind', args: [kinds.map(resRef)] }
            : { key: 'mission.proj.reward.blind_unknown' };
        return { reward: { state: 'hidden', text: `${kinds.map(k => RES_TEXT[k] ?? k).join('、') || '未知'}？`, i18n: [ref] }, hidden };
    }
    if (band === 'vague') {
        const score = weightedScore(a.successRewards, balance);
        const stars = 1 + pj.rewardStarCuts.filter(c => score >= c).length;
        return { reward: { state: 'hint', text: `量級：${'★'.repeat(stars)}`, value: stars, i18n: [{ key: 'mission.proj.reward.tier', args: ['★'.repeat(stars)] }] }, hidden };
    }
    const parts: string[] = [];
    const refs: MissionI18nRef[] = [];
    for (const k of kinds) {
        const v = Math.round(a.successRewards[k]);
        if (band === 'full') { parts.push(`${RES_TEXT[k] ?? k} ${v}`); refs.push({ key: 'mission.proj.reward.full', args: [resRef(k), v] }); continue; }
        const shift = (deriveUnit(saveSeed, missionId, `proj:reward:${k}`) - 0.5) * pj.rewardRangePct;
        const lo = Math.max(0, floorStep(v * (1 - pj.rewardRangePct + shift), pj.rewardRangeStep));
        const hi = ceilStep(v * (1 + pj.rewardRangePct + shift), pj.rewardRangeStep);
        parts.push(`${RES_TEXT[k] ?? k} ${lo}～${hi}`);
        refs.push({ key: 'mission.proj.reward.range', args: [resRef(k), lo, hi] });
    }
    return { reward: { state: band === 'full' ? 'exact' : 'range', text: parts.join('、') || '無', i18n: refs.length > 0 ? refs : [{ key: 'mission.proj.reward.none' }] }, hidden };
}

/** 目標：低／中情報看「呈現版」（可與真相不同）；進入 clear 揭露分支目標；full 另附細節 */
export function projectObjective(branch: MissionBranch, intel: number, balance: MissionBalance = DEFAULT_MISSION_BALANCE, defId?: string): Revealable {
    const band = intelBandOf(intel, balance);
    const shown = branch.presented.objectiveText ?? branch.objective.text;
    // 語系參照：呈現版與真實版各有一把鍵（沒給 defId 的舊呼叫不附參照）
    const ref = (presented: boolean): MissionI18nRef[] | undefined => {
        if (!defId) return undefined;
        return presented && branch.presented.objectiveText !== undefined
            ? [contentRef(missionTextKey.text(defId, branch.presented.objectiveText), branch.presented.objectiveText)]
            : [contentRef(missionTextKey.text(defId, branch.objective.text), branch.objective.text)];
    };
    const make = (state: Revealable['state'], text: string, i18n: MissionI18nRef[] | undefined): Revealable => (i18n ? { state, text, i18n } : { state, text });
    if (band === 'blind' || band === 'vague') return make('hint', shown, ref(true));
    if (band === 'clear') return make('hint', branch.objective.text, ref(false));
    return make('exact', shown, ref(true));
}

/** 事實：依情報逐層揭露；低於最低門檻顯示 ???；低情報時依 seed 可能改顯示誤導說法 */
export function projectFacts(def: MissionDefinition, instId: string, intel: number, saveSeed: number, balance: MissionBalance = DEFAULT_MISSION_BALANCE): MissionFactView[] {
    const band: MissionIntelBand = intelBandOf(intel, balance);
    const out: MissionFactView[] = [];
    for (const f of def.facts ?? []) {
        let text = '???';
        let textRef: MissionI18nRef | undefined;
        for (const lv of f.levels) if (lv.minIntel <= intel) { text = lv.text; textRef = contentRef(missionTextKey.text(def.id, lv.text), lv.text); }
        let state: MissionFactView['state'] = text === '???' ? 'hidden' : 'hint';
        if (f.decoy && intel < balance.projection.decoyMaxIntel) {
            const chance = (1 - intel / 100) * balance.projection.decoyFactor;
            if (deriveUnit(saveSeed, instId, `decoy:${f.key}:${band}`) < chance) { text = f.decoy; state = 'hint'; textRef = contentRef(missionTextKey.text(def.id, f.decoy), f.decoy); }
        }
        out.push({ key: f.key, label: f.label, text, state, labelRef: contentRef(missionTextKey.factLabel(def.id, f.key), f.label), ...(textRef ? { textRef } : {}) });
    }
    return out;
}

// ───────────────────────── 組合視圖 ─────────────────────────

export interface ProjectInput {
    def: MissionDefinition;
    instance: MissionInstance;
    saveSeed: number;
    flags: MissionFlags;
    /** 預覽用執行者；缺省＝中性預估 */
    general?: MissionGeneralFacts | null;
    executorAffinity?: number;
    balance?: MissionBalance;
}

export function projectMission(input: ProjectInput): MissionDetailView {
    const { def, instance: inst } = input;
    const balance = input.balance ?? DEFAULT_MISSION_BALANCE;
    const lock = inst.dispatch;
    // 派遣後鎖定：用鎖定的情報度與分支，不再受之後的變動影響
    const intel = lock ? lock.intelAtDispatch : inst.intel;
    const general = input.general ?? null;
    const branch = lock
        ? findBranch(def, lock.branchId)
        : selectBranch(def, { variant: inst.variant, intel, flags: input.flags, generalTags: general ? general.tags : [] });
    if (!branch) throw new Error(`任務 ${def.id} 在情報 ${intel} 找不到可用分支`);
    const trueRate = lock ? lock.rate : computeFitness({ def, branch, general, intel, executorAffinity: input.executorAffinity, balance }).rate;
    const a = analyzeBranch(branch, def, inst.variant, intel, input.flags, general, trueRate, balance);
    const { risk, tags } = projectRisk(a, intel, balance);
    const { reward, hidden } = projectReward(a, intel, inst.id, input.saveSeed, balance);
    const cost = computeCost(def, branch, balance);
    return {
        id: inst.id, defId: def.id, title: def.text.title, brief: def.text.brief, theme: def.theme, difficulty: def.difficulty,
        titleRef: contentRef(missionTextKey.title(def.id), def.text.title), briefRef: contentRef(missionTextKey.brief(def.id), def.text.brief),
        intel, intelBand: intelBandOf(intel, balance),
        facts: projectFacts(def, inst.id, intel, input.saveSeed, balance),
        objective: projectObjective(branch, intel, balance, def.id),
        hints: (branch.presented.hints ?? []).slice(),
        hintRefs: (branch.presented.hints ?? []).map((h) => contentRef(missionTextKey.text(def.id, h), h)),
        rate: projectRate(trueRate, intel, inst.id, input.saveSeed, balance),
        risk, riskTags: tags, reward, hiddenRewards: hidden,
        hiddenRewardRefs: hidden.map(h => ({ key: `mission.proj.hidden.${HIDDEN_REWARD_KEY[h] ?? h}`, fb: h })),
        cost, durationSeasons: Math.max(1, def.timing.durationSeasons + (branch.modifiers.durationDelta ?? 0)),
        expireSeason: inst.expireSeason, status: inst.status,
        canRecon: inst.status === 'OPEN' && inst.intel < balance.recon.cap,
        canWait: inst.status === 'OPEN' && !inst.waited,
    };
}
