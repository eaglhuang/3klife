// @spec-source → 武將系統.md (doc_spec_0025) §E #5、轉職與宿命系統.md (doc_spec_0043) §F、MVP遊戲驗證規格書.md (doc_spec_0045) §E #2 #15、培育系統.md (doc_spec_0026) §F-8
/**
 * Unveiling — 子嗣 5 歲開獎與宿命分流（純邏輯，不依賴 cc）
 *
 * 流程：
 *   1. 年滿 5 歲、還在 Mystery 的子嗣由 unveilDueGenerals() 自動開獎：
 *      揭曉五維 + 六維資質（Revelation = EXACT）、解鎖初始因子、算出武官 / 文官建議
 *   2. 玩家對宿命建議二選一：順應天命（成長率 ×1.0）或逆天而行（成長率 ×0.8，有機率大器晚成）
 *   3. 宿命選定後才能進入培育（由 NurtureService 檢查）
 *
 * 開獎本身沒有亂數，所以每季自動跑也不會讓存檔不可重現；只有抗命的大器晚成需要擲骰。
 *
 * Unity 對照：像 Timeline 播完「開獎演出」後呼叫的 RevealStats()，
 * 這裡只算資料，演出由 UI 在 GeneralUnveiled 事件到來時播放。
 */
import type { GeneralConfig, GeneralDualLayerStatConfig, GeneralGeneConfig, GeneralStatsConfig } from '../models/GeneralUnit';
import { BreedingGeneral, CHILD_STATUS_MYSTERY } from './BreedingSystem';
import { FactorDictionary, FactorDefinition } from './FactorInheritance';
import { GENERAL_STATUS_DEAD, RandomSource } from './GeneralAging';

export const UNVEILING_AGE = 5;
/** 開獎後的狀態；進入培育與戰場前的一般武將狀態 */
export const GENERAL_STATUS_UNVEILED = 'Unveiled';

/** 抗命懲罰：Growth_Rate × 0.8 */
export const FATE_DEFY_GROWTH_MODIFIER = 0.8;
/** 抗命後觸發大器晚成的機率；規格只說「有機率」，暫定 10% */
export const LATE_BLOOMER_CHANCE = 0.1;
/** 大器晚成：25 歲後 Growth_Rate × 1.5 */
export const LATE_BLOOMER_AGE = 25;
export const LATE_BLOOMER_GROWTH_MODIFIER = 1.5;

export type CareerClass = 'Warrior' | 'Scholar';
export type FateChoice = 'accept' | 'defy';

/** 開獎揭曉的六維（含運氣）；培育只訓練前五項 */
export const UNVEILED_STAT_KEYS: readonly (keyof GeneralStatsConfig)[] = ['str', 'int', 'lea', 'pol', 'cha', 'luk'];

export interface FateState {
    /** 開獎時系統建議的職能 */
    recommended: CareerClass;
    /** 玩家的選擇；未選前為 undefined（此時不能進培育） */
    choice?: FateChoice;
    /** 抗命後觸發了大器晚成 */
    lateBloomer?: boolean;
}

/** 開獎 / 宿命 / 培育流程會寫進武將的欄位；比照 BreedingGeneral 以延伸型別承載 */
export type UnveilingGeneral = BreedingGeneral & {
    unveiledSeason?: number;
    fate?: FateState;
    careerClass?: CareerClass;
    /** 成長率修正（Data Schema Growth_Modifier）；未設視為 1 */
    growthModifier?: number;
};

export type FateScoreSource = 'factors' | 'stats';

export interface FateRecommendation {
    recommended: CareerClass;
    martialScore: number;
    civilScore: number;
    /** 因子分數打平（或沒有可判定的因子）時改看五維 */
    source: FateScoreSource;
}

export interface UnveilingEvent {
    generalId: string;
    recommendation: FateRecommendation;
    /** 開獎時解鎖的因子 id */
    unlockedFactorIds: string[];
    season?: number;
}

// ── 宿命建議 ───────────────────────────────────────────────────────────────

const MARTIAL_CATEGORIES = new Set(['attribute', 'leadership', 'weapon-proficiency', 'aptitude', 'mobility', 'terrain']);
const CIVIL_CATEGORIES = new Set(['governance']);
const CIVIL_TAGS = new Set(['politics', 'scheme', 'resource', 'stability']);

/** 因子偏武或偏文；無法判定（人格、天命等）回傳 null */
export type FactorLeaning = 'martial' | 'civil' | null;

export function classifyFactorLeaning(def: FactorDefinition | undefined): FactorLeaning {
    if (!def) return null;
    if (def.category && CIVIL_CATEGORIES.has(def.category)) return 'civil';
    if (def.category === 'tactic-seed') {
        return (def.defaultTags ?? []).some((tag) => CIVIL_TAGS.has(tag)) ? 'civil' : 'martial';
    }
    if (def.category && MARTIAL_CATEGORIES.has(def.category)) return 'martial';
    return null;
}

function statValue(general: GeneralConfig, key: keyof GeneralStatsConfig): number {
    const top = (general as unknown as Record<string, unknown>)[key];
    if (typeof top === 'number') return top;
    return general.stats?.[key] ?? 0;
}

/**
 * 規格公式：Blue_STR + Blue_POW > Blue_INT + Blue_POL → 武官，否則文官。
 * 字典沒有分屬性的藍色因子，所以改成「偏武因子星等和 > 偏文因子星等和」；
 * 分數打平時看五維（武力 + 統率 vs 智力 + 政治）；仍打平依規格 else 分支給文官。
 */
export function recommendFate(general: GeneralConfig, dictionary?: FactorDictionary): FateRecommendation {
    let martialScore = 0;
    let civilScore = 0;
    for (const gene of general.genes ?? []) {
        if (!gene.id) continue;
        const leaning = classifyFactorLeaning(dictionary?.get(gene.id));
        const level = gene.level ?? 1;
        if (leaning === 'martial') martialScore += level;
        else if (leaning === 'civil') civilScore += level;
    }
    if (martialScore !== civilScore) {
        return { recommended: martialScore > civilScore ? 'Warrior' : 'Scholar', martialScore, civilScore, source: 'factors' };
    }
    const martialStats = statValue(general, 'str') + statValue(general, 'lea');
    const civilStats = statValue(general, 'int') + statValue(general, 'pol');
    return {
        recommended: martialStats > civilStats ? 'Warrior' : 'Scholar',
        martialScore: martialStats,
        civilScore: civilStats,
        source: 'stats',
    };
}

// ── 開獎 ───────────────────────────────────────────────────────────────────

export function isUnveilingDue(general: UnveilingGeneral): boolean {
    if ((general.status ?? '').toLowerCase() === GENERAL_STATUS_DEAD) return false;
    if (general.status !== CHILD_STATUS_MYSTERY) return false;
    return typeof general.age === 'number' && general.age >= UNVEILING_AGE;
}

export function isUnveiled(general: UnveilingGeneral): boolean {
    return general.unveiledSeason !== undefined || general.status === GENERAL_STATUS_UNVEILED;
}

/** 因子開獎時解鎖的條件：discoveryLevel 不超過 1（藍 / 粉）；綠以上留給覺醒事件 */
export const UNVEIL_UNLOCK_DISCOVERY_LEVEL = 1;

function unlockInitialFactors(genes: GeneralGeneConfig[] | undefined): { genes: GeneralGeneConfig[]; unlocked: string[] } {
    const unlocked: string[] = [];
    const next = (genes ?? []).map((gene) => {
        if (gene.isLocked && (gene.discoveryLevel ?? 1) <= UNVEIL_UNLOCK_DISCOVERY_LEVEL) {
            if (gene.id) unlocked.push(gene.id);
            return { ...gene, isLocked: false };
        }
        return { ...gene };
    });
    return { genes: next, unlocked };
}

function revealStats(general: UnveilingGeneral): GeneralConfig['dualLayerStats'] {
    const layers: Partial<Record<keyof GeneralStatsConfig, GeneralDualLayerStatConfig>> = { ...(general.dualLayerStats ?? {}) };
    for (const key of UNVEILED_STAT_KEYS) {
        const value = statValue(general, key);
        layers[key] = {
            ...layers[key],
            base: layers[key]?.base ?? value,
            current: layers[key]?.current ?? value,
            revelationLevel: 'EXACT',
        };
    }
    return layers;
}

/** 對單一子嗣開獎（不檢查年齡，年齡由 isUnveilingDue 把關） */
export function unveilGeneral(
    source: UnveilingGeneral,
    options: { dictionary?: FactorDictionary; season?: number } = {},
): { general: UnveilingGeneral; event: UnveilingEvent } {
    const recommendation = recommendFate(source, options.dictionary);
    const { genes, unlocked } = unlockInitialFactors(source.genes);
    const general: UnveilingGeneral = {
        ...source,
        status: GENERAL_STATUS_UNVEILED,
        genes,
        dualLayerStats: revealStats(source),
        hiddenFlags: (source.hiddenFlags ?? []).filter((flag) => flag !== 'mystery-phase'),
        unveiledSeason: options.season,
        fate: { recommended: recommendation.recommended },
        growthModifier: source.growthModifier ?? 1,
    };
    return { general, event: { generalId: source.id, recommendation, unlockedFactorIds: unlocked, season: options.season } };
}

/** 名冊中所有年滿 5 歲的 Mystery 子嗣一次開獎；沒有亂數，可重現 */
export function unveilDueGenerals(
    roster: readonly UnveilingGeneral[],
    options: { dictionary?: FactorDictionary; season?: number } = {},
): { roster: UnveilingGeneral[]; events: UnveilingEvent[] } {
    const events: UnveilingEvent[] = [];
    const next = roster.map((general) => {
        if (!isUnveilingDue(general)) return general;
        const result = unveilGeneral(general, options);
        events.push(result.event);
        return result.general;
    });
    return { roster: next, events };
}

// ── 宿命選擇 ───────────────────────────────────────────────────────────────

export class FateError extends Error {}

/**
 * 玩家對宿命建議做決定。
 * - accept：職能 = 建議，成長率 ×1.0
 * - defy：職能 = 建議的另一邊，成長率 ×0.8，並擲一次大器晚成
 * 每位武將只能決定一次（不可逆，對應「戰鬥武將或教官的不可逆選擇」）。
 */
export function chooseFate(source: UnveilingGeneral, choice: FateChoice, random: RandomSource = Math.random): UnveilingGeneral {
    if (!source.fate) throw new FateError(`${source.id} 尚未開獎，不能選擇宿命`);
    if (source.fate.choice) throw new FateError(`${source.id} 已經做過宿命選擇`);
    const recommended = source.fate.recommended;
    const defied = choice === 'defy';
    const careerClass: CareerClass = defied ? (recommended === 'Warrior' ? 'Scholar' : 'Warrior') : recommended;
    const lateBloomer = defied && random() < LATE_BLOOMER_CHANCE;
    return {
        ...source,
        careerClass,
        growthModifier: defied ? FATE_DEFY_GROWTH_MODIFIER : 1,
        fate: { recommended, choice, lateBloomer },
    };
}

/** 目前實際生效的成長率：抗命的大器晚成在 25 歲後逆轉為 ×1.5 */
export function effectiveGrowthModifier(general: UnveilingGeneral): number {
    const base = general.growthModifier ?? 1;
    if (general.fate?.lateBloomer && (general.age ?? 0) >= LATE_BLOOMER_AGE) {
        return LATE_BLOOMER_GROWTH_MODIFIER;
    }
    return base;
}
