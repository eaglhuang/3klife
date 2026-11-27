/**
 * LifeSceneChooser.ts — 武將每時段挑場景（QLIFE-01 2.2、2.3、3.1～3.3）
 *
 * 純函式、無 Cocos 依賴。流程：
 *   1. 人員占用：被占用者只回占用地點（`medical:injured` 傷勢不是地點鎖，只加偏好）。
 *   2. 候選＝該時段開門、人數未滿的場景。
 *   3. score = clamp(base × slotFit + Σ因素, 0, 200)，再套目前所在地／最近去過／愛熱鬧修正。
 *   4. 機率 ∝ score^k（k=1.6）的加權抽籤；亂數 seed＝(generalId, 季度序號, 時段序號)。
 *   5. 進入生活層時以當下時段與季度直接生成快照，不補算過去；換季所有武將重挑。
 */
import { createLifeRngFor, seasonOfQuarter, slotOfSeq } from './LifeClock';
import type { LifeRng } from './LifeClock';
import { activeFactorRules, baseAffinity, factorAdjustForScene, resolveProfile } from './LifeFactors';
import type {
    LifeChoice, LifeChooseContext, LifeData, LifeFactorsFile, LifeGeneralState, LifeSceneDef,
    LifeSceneScore, LifeSlot, LifeSnapshot,
} from './types';

const SCORE_MAX = 200;

/** 占用決定的地點；不是地點鎖（含傷勢）或查不到地點時回 null。 */
export function resolveOccupancyScene(state: LifeGeneralState, factors: LifeFactorsFile): string | null {
    const occ = state.occupancy;
    if (!occ) return null;
    if (occ.kind === 'medical' && occ.sub === 'injured') return null;
    if (occ.sceneId) return occ.sceneId;
    const table = factors.occupancyDefaultScene;
    const key = occ.sub ? `${occ.kind}:${occ.sub}` : occ.kind;
    return table[key] || table[occ.kind] || null;
}

function isSceneOpen(scene: LifeSceneDef, slot: number, nightOwl: boolean): boolean {
    if (scene.openSlots.indexOf(slot) >= 0) return true;
    return nightOwl && !!scene.nightOwlSlots && scene.nightOwlSlots.indexOf(slot) >= 0;
}

/** 對所有場景算分（含 0 分者），依分數高到低、同分依 id 排序。 */
export function scoreScenes(ctx: LifeChooseContext): LifeSceneScore[] {
    const { data, state } = ctx;
    const factors = data.factors;
    const slot = slotOfSeq(ctx.slotSeq);
    const season = seasonOfQuarter(ctx.quarter);
    const profile = resolveProfile(data.profiles, state.generalId);
    const active = activeFactorRules(state, factors, season);
    const nightOwl = profile.chronotype === 'night';
    const chronoTable = factors.chronotypeSlotFit[profile.chronotype] || {};
    const chronoFit = chronoTable[String(slot)] !== undefined ? chronoTable[String(slot)] : 1;
    const recent = state.recentScenes || [];
    const stay = 1 + profile.stubbornness / 100;
    const occupants = ctx.occupants || {};

    const out: LifeSceneScore[] = [];
    for (const scene of data.scenes.scenes) {
        const open = isSceneOpen(scene, slot, nightOwl);
        // 深夜除睡覺、夜市、守夜（與夜貓的額外時段）以外一律 0
        const lateOk = slot !== 7 || !!scene.lateNightKind
            || (nightOwl && !!scene.nightOwlSlots && scene.nightOwlSlots.indexOf(7) >= 0);
        if (!open || !lateOk) {
            out.push({ sceneId: scene.id, score: 0, factorAdjust: 0 });
            continue;
        }
        const bias = scene.slotBias && scene.slotBias[String(slot)] !== undefined ? scene.slotBias[String(slot)] : 1;
        const adj = factorAdjustForScene(active, state, scene, slot);
        let score = baseAffinity(profile, scene) * bias * chronoFit + adj;
        score = Math.min(SCORE_MAX, Math.max(0, score));
        if (slot === 7 && scene.id === profile.homeScene) score += factors.homeSleepBonus;

        // 愛湊熱鬧：越外向越愛人多的場景，內向者反向
        const crowd = scene.capacity > 0 ? Math.min(1, (occupants[scene.id] || 0) / scene.capacity) : 0;
        score += factors.sociabilityWeight * ((profile.sociability - 50) / 50) * crowd;

        if (state.currentScene === scene.id) score += factors.currentSceneBonus * stay;
        else if (recent.indexOf(scene.id) >= 0) score -= factors.recentScenePenalty;

        out.push({ sceneId: scene.id, score: Math.max(0, score), factorAdjust: adj });
    }
    out.sort((a, b) => (b.score - a.score) || (a.sceneId < b.sceneId ? -1 : a.sceneId > b.sceneId ? 1 : 0));
    return out;
}

/** 機率 ∝ score^k 的加權抽籤；候選須事先依 id 排序以保證重現。 */
export function weightedPick(cands: LifeSceneScore[], k: number, rng: LifeRng): string | null {
    let total = 0;
    const weights = cands.map(c => {
        const w = Math.pow(c.score, k);
        total += w;
        return w;
    });
    if (total <= 0) return null;
    let r = rng() * total;
    for (let i = 0; i < cands.length; i++) {
        r -= weights[i];
        if (r < 0) return cands[i].sceneId;
    }
    return cands[cands.length - 1].sceneId;
}

/** 單一武將挑場景。 */
export function chooseScene(ctx: LifeChooseContext): LifeChoice {
    const { data, state } = ctx;
    const generalId = state.generalId;

    const locked = resolveOccupancyScene(state, data.factors);
    if (locked) return { generalId, sceneId: locked, reason: 'occupied' };

    const occupants = ctx.occupants || {};
    const capacityOf: Record<string, number> = {};
    for (const s of data.scenes.scenes) capacityOf[s.id] = s.capacity;
    const cands = scoreScenes(ctx)
        .filter(c => c.score > 0 && (occupants[c.sceneId] || 0) < capacityOf[c.sceneId])
        .sort((a, b) => (a.sceneId < b.sceneId ? -1 : a.sceneId > b.sceneId ? 1 : 0));

    const rng = createLifeRngFor(generalId, ctx.quarter, ctx.slotSeq);
    const picked = weightedPick(cands, data.factors.drawExponent, rng);
    if (picked) return { generalId, sceneId: picked, reason: 'chosen' };

    const home = resolveProfile(data.profiles, generalId).homeScene;
    return { generalId, sceneId: home, reason: 'fallback' };
}

/** 排行榜用：回傳前 n 名（含因素加總），不含抽籤。 */
export function topScenes(ctx: LifeChooseContext, n: number): LifeSceneScore[] {
    return scoreScenes(ctx).filter(c => c.score > 0).slice(0, n);
}

/**
 * 時段中途有機率換到同大圖相鄰場景（逛攤、串門子）。
 * 用獨立亂數流（salt='adj'），不影響主抽籤的重現性。回傳新場景 id，不換則回原場景。
 */
export function maybeAdjacentMove(ctx: LifeChooseContext, currentSceneId: string): string {
    const { data, state } = ctx;
    const rng = createLifeRngFor(state.generalId, ctx.quarter, ctx.slotSeq, 'adj');
    if (rng() >= data.factors.adjacentMoveChance) return currentSceneId;

    const cur = data.scenes.scenes.find(s => s.id === currentSceneId);
    if (!cur) return currentSceneId;
    const slot = slotOfSeq(ctx.slotSeq);
    const nightOwl = resolveProfile(data.profiles, state.generalId).chronotype === 'night';
    const occupants = ctx.occupants || {};
    const ids = cur.adjacent && cur.adjacent.length > 0
        ? cur.adjacent
        : data.scenes.scenes.filter(s => s.area === cur.area && s.id !== cur.id).map(s => s.id);
    const options = data.scenes.scenes
        .filter(s => ids.indexOf(s.id) >= 0 && isSceneOpen(s, slot, nightOwl) && (occupants[s.id] || 0) < s.capacity)
        .map(s => s.id)
        .sort();
    if (options.length === 0) return currentSceneId;
    return options[Math.min(options.length - 1, Math.floor(rng() * options.length))];
}

// ───────────────────────── 快照 ─────────────────────────

export interface LifeSnapshotInput {
    data: LifeData;
    quarter: number;
    slotSeq: number;
    states: LifeGeneralState[];
    /** 上一個時段的快照；同一季才沿用「目前所在／最近去過」，換季就丟掉重挑。 */
    previous?: LifeSnapshot | null;
}

/** 名冊裡生活層看得到的武將 id（家臣＋本城訪客）。 */
export function activeRosterIds(data: LifeData): string[] {
    const kinds = data.roster.includeKinds;
    return data.roster.generals.filter(g => kinds.indexOf(g.kind) >= 0).map(g => g.id);
}

/** 沒有額外世界狀態時，依名冊產生最小狀態（只有勢力）。 */
export function defaultStatesFromRoster(data: LifeData): LifeGeneralState[] {
    const kinds = data.roster.includeKinds;
    return data.roster.generals
        .filter(g => kinds.indexOf(g.kind) >= 0)
        .map(g => ({ generalId: g.id, faction: g.faction }));
}

/**
 * 產生整個生活層的快照。被占用者先入位，再依 generalId 排序逐位挑選，
 * 逐步累計各場景人數以遵守 capacity；同一輸入必得同一結果。
 */
export function buildSnapshot(input: LifeSnapshotInput): LifeSnapshot {
    const { data, quarter, slotSeq } = input;
    const prev = input.previous && input.previous.quarter === quarter ? input.previous : null;
    const states = input.states.slice().sort((a, b) => (a.generalId < b.generalId ? -1 : a.generalId > b.generalId ? 1 : 0));
    const occupants: Record<string, number> = {};
    const choices: Record<string, LifeChoice> = {};
    const trail: Record<string, string[]> = {};
    const bump = (id: string) => { occupants[id] = (occupants[id] || 0) + 1; };

    const withHistory = (s: LifeGeneralState): LifeGeneralState => {
        const t = prev && prev.trail[s.generalId];
        if (!t || t.length === 0) return s;
        const current = t[0];
        const recent = t.slice(1, 3).filter((id, i, arr) => id !== current && arr.indexOf(id) === i);
        return { ...s, currentScene: current, recentScenes: recent };
    };

    const lockedIds = new Set<string>();
    for (const s of states) {
        const locked = resolveOccupancyScene(s, data.factors);
        if (!locked) continue;
        lockedIds.add(s.generalId);
        choices[s.generalId] = { generalId: s.generalId, sceneId: locked, reason: 'occupied' };
        bump(locked);
    }
    for (const s of states) {
        if (lockedIds.has(s.generalId)) continue;
        const choice = chooseScene({ data, state: withHistory(s), quarter, slotSeq, occupants });
        choices[s.generalId] = choice;
        bump(choice.sceneId);
    }
    for (const s of states) {
        const old = prev ? prev.trail[s.generalId] || [] : [];
        trail[s.generalId] = [choices[s.generalId].sceneId, ...old].slice(0, 3);
    }
    return {
        quarter, slotSeq,
        slot: slotOfSeq(slotSeq) as LifeSlot,
        season: seasonOfQuarter(quarter),
        choices, trail,
    };
}
