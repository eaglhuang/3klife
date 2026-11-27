/**
 * LifeFactors.ts — 武將喜好資料解析與 8 種改變因素加權（QLIFE-01 2.1、2.2）
 *
 * 純函式。因素規則全在 life-factors.json（條件＋效果），本檔只負責判斷條件是否成立、
 * 把效果換算成某場景的加減分。新增因素規則只改 JSON（條件種類不夠才需動本檔）。
 */
import type {
    LifeFactorCondition, LifeFactorEffect, LifeFactorRule, LifeFactorsFile, LifeGeneralState,
    LifeProfileFile, LifeSceneDef, LifeSeason, ResolvedLifeProfile,
} from './types';

/** 套用 defaults：手動資料優先，沒給的欄位用預設。 */
export function resolveProfile(file: LifeProfileFile, generalId: string): ResolvedLifeProfile {
    const g = file.generals[generalId] || {};
    const d = file.defaults;
    return {
        generalId,
        homeScene: g.homeScene || d.homeScene,
        affinityTag: g.affinityTag || {},
        affinityScene: g.affinityScene || {},
        affinityBase: d.affinityBase,
        chronotype: g.chronotype || d.chronotype,
        sociability: g.sociability !== undefined ? g.sociability : d.sociability,
        stubbornness: g.stubbornness !== undefined ? g.stubbornness : d.stubbornness,
        likes: g.likes || [],
        dislikes: g.dislikes || [],
        props: g.props || {},
    };
}

/** base(s)：先取 affinityScene[s]，沒有就取場景標籤中最高的 affinityTag。 */
export function baseAffinity(profile: ResolvedLifeProfile, scene: LifeSceneDef): number {
    const direct = profile.affinityScene[scene.id];
    if (direct !== undefined) return direct;
    let best = -1;
    for (const tag of scene.tag) {
        const v = profile.affinityTag[tag];
        if (v !== undefined && v > best) best = v;
    }
    return best >= 0 ? best : profile.affinityBase;
}

/** 已成立的因素規則與其強度（漸退後的 0～1 乘數）。 */
export interface ActiveFactorRule {
    rule: LifeFactorRule;
    weight: number;
}

function conditionHolds(cond: LifeFactorCondition, state: LifeGeneralState, season: LifeSeason): boolean {
    const mood = state.mood || 0;
    switch (cond.kind) {
        case 'office':
            return !!state.officeChange && state.officeChange.change === cond.change;
        case 'child':
            return !!state.childUnder5 && !!state.nursing === cond.nursing;
        case 'season':
            return season === cond.season;
        case 'moodAbove':
            return mood > cond.value;
        case 'moodBelow':
            return mood < cond.value;
        case 'angry':
            return !!state.angry;
        case 'bond':
            return !!state.bondScenes && state.bondScenes.length > 0;
        case 'friendshipAtLeast':
            return state.friendship !== undefined && state.friendship >= cond.value;
        case 'friendshipAtMost':
            return state.friendship !== undefined && state.friendship <= cond.value;
        case 'worldEvent':
            return !!state.worldEvents && state.worldEvents.indexOf(cond.event) >= 0;
        case 'faction':
            return state.faction === cond.faction;
        case 'injured':
            return !!state.occupancy && state.occupancy.kind === 'medical' && state.occupancy.sub === 'injured';
        default:
            return false;
    }
}

/** 找出目前狀態下成立的規則；官職變換等漸退規則依已過季數縮小。 */
export function activeFactorRules(
    state: LifeGeneralState, factors: LifeFactorsFile, season: LifeSeason,
): ActiveFactorRule[] {
    const result: ActiveFactorRule[] = [];
    for (const rule of factors.rules) {
        if (!conditionHolds(rule.when, state, season)) continue;
        let weight = 1;
        if (rule.fadeQuarters && rule.fadeQuarters > 0) {
            const ago = rule.when.kind === 'office' && state.officeChange ? state.officeChange.quartersAgo : 0;
            weight = Math.max(0, 1 - ago / rule.fadeQuarters);
        }
        if (weight > 0) result.push({ rule, weight });
    }
    return result;
}

function dynamicSet(state: LifeGeneralState, key: NonNullable<LifeFactorEffect['dynamic']>): string[] {
    switch (key) {
        case 'workScenes': return state.workScenes || [];
        case 'bondScenes': return state.bondScenes || [];
        case 'bondSharedScenes': return state.bondSharedScenes || [];
        case 'lordScenes':
        case 'avoidLordScenes':
            return state.lordScenes || [];
        default: return [];
    }
}

function effectMatches(effect: LifeFactorEffect, scene: LifeSceneDef, state: LifeGeneralState): boolean {
    if (effect.scenes && effect.scenes.indexOf(scene.id) >= 0) return true;
    if (effect.areas && effect.areas.indexOf(scene.area) >= 0) return true;
    if (effect.tags && effect.tags.some(t => scene.tag.indexOf(t) >= 0)) return true;
    if (effect.dynamic && dynamicSet(state, effect.dynamic).indexOf(scene.id) >= 0) return true;
    return false;
}

/** 某場景在某時段的所有因素加減分總和（Σ adj_f）。 */
export function factorAdjustForScene(
    active: ActiveFactorRule[], state: LifeGeneralState, scene: LifeSceneDef, slot: number,
): number {
    let total = 0;
    const absMood = Math.abs(state.mood || 0);
    for (const { rule, weight } of active) {
        for (const effect of rule.effects) {
            if (effect.slots && effect.slots.indexOf(slot) < 0) continue;
            if (!effectMatches(effect, scene, state)) continue;
            const delta = (effect.delta || 0) + (effect.perMood || 0) * absMood;
            total += delta * weight;
        }
    }
    return total;
}
