// @spec-source → 結緣系統（配種）.md (doc_spec_0028) §E §F §K §L、MVP遊戲驗證規格書.md (doc_spec_0045) §F、數值系統.md §F-2、血統理論系統.md (doc_spec_0011) §H
/**
 * BreedingSystem — 結緣（配種）規則與子嗣生成（純邏輯，不依賴 cc）
 *
 * 一次結緣：
 *   1. checkBreedingEligibility：年齡 ≥ 20、男女配對、存活且未卡片化、精力足夠、
 *      未達一生生育上限、母方不在待產期、3 代內無共同祖先
 *   2. 扣精力（父 -50 / 母 -100；確認結緣即扣，與受孕成敗無關）
 *   3. 擲受孕率；成功則母方進入待產（4 季）、雙方生育次數 +1
 *   4. 由雙方祖譜組出子嗣的 14 人祖譜，算 EP_MVP、繼承因子、產生 0 歲子嗣
 *
 * EP_MVP = 50 + [共鳴 15] + [異脈 20] + [契合 25]；天命波動延後到 P1。
 *
 * Unity 對照：像 BreedingRules 這種純 C# static class，輸入兩份 GeneralData 與 System.Random，
 * 回傳新的 GeneralData；寫回名冊與存檔交給上層 Service（BreedingService）。
 */
import type { GeneralConfig, GeneralGeneConfig, GeneralStatsConfig } from '../models/GeneralUnit';
import type { PersonRecord } from '../models/PersonRegistry';
import { createEmptyPedigree, Pedigree, PEDIGREE_SLOTS, PedigreeSlot, pedigreeSlotGeneration } from '../services/BloodlineGraph';
import {
    AncestorFactorSource,
    DEFAULT_ENABLED_FACTOR_COLORS,
    FACTOR_POOL_RATE,
    FactorColor,
    FactorDictionary,
    InheritedFactor,
    inheritFactors,
    resolveFactorColor,
    toGeneConfigs,
} from './FactorInheritance';
import { GENERAL_STATUS_DEAD, RandomSource } from './GeneralAging';
import { baseVitalityMaxOf } from './VitalityCap';

export const BREEDING_MIN_AGE = 20;
export const FATHER_VIGOR_COST = 50;
export const MOTHER_VIGOR_COST = 100;
/** MCQ Q43：受孕後待產 4 回合（1 年） */
export const PREGNANCY_LOCK_SEASONS = 4;
/** §K Inbreeding.BlockGenerations */
export const INBREEDING_BLOCK_GENERATIONS = 3;

export const CONCEPTION_BASE_RATE = 0.7;
export const CONCEPTION_RATE_CAP = 0.95;

export const EP_BASE = 50;
export const EP_RESONANCE_BONUS = 15;
export const EP_OUTCROSS_BONUS = 20;
export const EP_AFFINITY_BONUS = 25;
/** 14 人中同一標籤至少出現在幾位祖先身上才算共鳴 */
export const EP_RESONANCE_MIN_COUNT = 3;

/** 同 Bloodline_ID 配對時子嗣 Vitality_Max × 0.7 */
export const INBREEDING_VITALITY_MULTIPLIER = 0.7;

export const CHILD_STATUS_MYSTERY = 'Mystery';

const STAT_KEYS: (keyof GeneralStatsConfig)[] = ['str', 'int', 'lea', 'pol', 'cha', 'luk'];

/** 結緣流程需要、但尚未正式進入 GeneralConfig 的欄位 */
export type BreedingGeneral = GeneralConfig & {
    fatherId?: string;
    motherId?: string;
    /** 已親傳的子嗣次數 */
    breedingCount?: number;
    /** 傳宗秘藥加的上限（每武將最多 +1） */
    breedingCapBonus?: number;
    /** 母方待產剩餘季數；> 0 時不可再結緣 */
    pregnancySeasonsLeft?: number;
    /** 已轉為教官 / 支援卡，不再是親傳父母來源 */
    isMentorCard?: boolean;
    /** 出生時的 totalSeasonsElapsed */
    birthSeason?: number;
};

export type BreedingBlockReason =
    | 'same-general'
    | 'father-not-male'
    | 'mother-not-female'
    | 'father-underage'
    | 'mother-underage'
    | 'father-dead'
    | 'mother-dead'
    | 'father-mentor-card'
    | 'mother-mentor-card'
    | 'father-low-vigor'
    | 'mother-low-vigor'
    | 'father-breeding-cap'
    | 'mother-breeding-cap'
    | 'mother-pregnant'
    | 'inbreeding';

/** 祖譜查詢介面；正式環境為 BloodlineGraph */
export interface PedigreeSource {
    getPedigree(uid: string): Pedigree;
    getPerson(uid: string): PersonRecord | null;
    commonAncestorDistance(uidA: string, uidB: string, maxGeneration?: number): number | null;
}

/** 名將契合（史實 / 宿敵配對）判定；家族關係資料接上前預設為 false */
export type AffinityResolver = (father: GeneralConfig, mother: GeneralConfig) => boolean;

// ── 小工具 ─────────────────────────────────────────────────────────────────

export function isMale(general: GeneralConfig): boolean {
    const g = (general.gender ?? '').trim().toLowerCase();
    return g === '男' || g === 'male' || g === 'm';
}

export function isFemale(general: GeneralConfig): boolean {
    const g = (general.gender ?? '').trim().toLowerCase();
    return g === '女' || g === 'female' || g === 'f';
}

function isDead(general: GeneralConfig): boolean {
    return (general.status ?? '').toLowerCase() === GENERAL_STATUS_DEAD;
}

function statOf(general: GeneralConfig, key: keyof GeneralStatsConfig): number {
    const top = (general as unknown as Record<string, unknown>)[key];
    if (typeof top === 'number') return top;
    return general.stats?.[key] ?? 50;
}

function vigorOf(general: GeneralConfig): number {
    return general.vitality ?? general.maxVitality ?? baseVitalityMaxOf(general.gender);
}

function maxVigorOf(general: GeneralConfig): number {
    return general.maxVitality ?? general.vitality ?? baseVitalityMaxOf(general.gender);
}

/**
 * 一生親傳上限（§L）：精力上限 < 90 → 3 次；90~119 → 4 次；≥ 120 → 5 次；傳宗秘藥最多再 +1。
 * （規格的 3 + floor(V/30) 寫法與其下方對照表不一致，這裡以對照表為準。）
 */
export function lifetimeBreedingCap(general: BreedingGeneral): number {
    const maxVigor = maxVigorOf(general);
    const base = maxVigor >= 120 ? 5 : maxVigor >= 90 ? 4 : 3;
    return base + Math.min(1, Math.max(0, general.breedingCapBonus ?? 0));
}

// ── 資格 ───────────────────────────────────────────────────────────────────

export interface BreedingEligibility {
    ok: boolean;
    reasons: BreedingBlockReason[];
    /** 共同祖先距離（null = 3 代內沒有） */
    commonAncestorDistance: number | null;
}

export function checkBreedingEligibility(
    father: BreedingGeneral,
    mother: BreedingGeneral,
    pedigree?: Pick<PedigreeSource, 'commonAncestorDistance'>,
): BreedingEligibility {
    const reasons: BreedingBlockReason[] = [];
    if (father.id === mother.id) reasons.push('same-general');
    if (!isMale(father)) reasons.push('father-not-male');
    if (!isFemale(mother)) reasons.push('mother-not-female');
    if ((father.age ?? 0) < BREEDING_MIN_AGE) reasons.push('father-underage');
    if ((mother.age ?? 0) < BREEDING_MIN_AGE) reasons.push('mother-underage');
    if (isDead(father)) reasons.push('father-dead');
    if (isDead(mother)) reasons.push('mother-dead');
    if (father.isMentorCard) reasons.push('father-mentor-card');
    if (mother.isMentorCard) reasons.push('mother-mentor-card');
    if (vigorOf(father) < FATHER_VIGOR_COST) reasons.push('father-low-vigor');
    if (vigorOf(mother) < MOTHER_VIGOR_COST) reasons.push('mother-low-vigor');
    if ((father.breedingCount ?? 0) >= lifetimeBreedingCap(father)) reasons.push('father-breeding-cap');
    if ((mother.breedingCount ?? 0) >= lifetimeBreedingCap(mother)) reasons.push('mother-breeding-cap');
    if ((mother.pregnancySeasonsLeft ?? 0) > 0) reasons.push('mother-pregnant');

    const distance = pedigree && father.id !== mother.id
        ? pedigree.commonAncestorDistance(father.id, mother.id, INBREEDING_BLOCK_GENERATIONS)
        : null;
    if (distance !== null && distance <= INBREEDING_BLOCK_GENERATIONS) reasons.push('inbreeding');

    return { ok: reasons.length === 0, reasons, commonAncestorDistance: distance };
}

// ── 受孕率 ─────────────────────────────────────────────────────────────────

/** Vitality_Factor：精力比例 > 50% → 1.0；30~50% → 0.5；< 30% → 0.1（取雙方較低者） */
export function vitalityFactor(father: GeneralConfig, mother: GeneralConfig): number {
    const ratio = Math.min(vigorOf(father) / maxVigorOf(father), vigorOf(mother) / maxVigorOf(mother));
    if (ratio > 0.5) return 1;
    if (ratio >= 0.3) return 0.5;
    return 0.1;
}

/** Birth_Load_Factor = max(0.4, 1 − 0.15 × max(0, 母方已生次數 − 1)) */
export function birthLoadFactor(mother: BreedingGeneral): number {
    return Math.max(0.4, 1 - 0.15 * Math.max(0, (mother.breedingCount ?? 0) - 1));
}

/**
 * 受孕率（以扣精力前的狀態計算）。
 * Age_Factor 規格只寫了名稱沒有數值，MVP 先視為 1。
 */
export function conceptionRate(father: BreedingGeneral, mother: BreedingGeneral): number {
    const chaAvg = (statOf(father, 'cha') + statOf(mother, 'cha')) / 2;
    const lukAvg = (statOf(father, 'luk') + statOf(mother, 'luk')) / 2;
    const rate = CONCEPTION_BASE_RATE
        * (1 + chaAvg / 200)
        * (1 + lukAvg / 200)
        * vitalityFactor(father, mother)
        * birthLoadFactor(mother);
    return Math.min(rate, CONCEPTION_RATE_CAP);
}

// ── 祖譜與 EP ──────────────────────────────────────────────────────────────

/** 子嗣的 14 人祖譜：F/M 為父母本人，其餘由父母各自的祖譜往上平移一代 */
export function buildChildPedigree(fatherId: string, motherId: string, source: Pick<PedigreeSource, 'getPedigree'>): Pedigree {
    const child = createEmptyPedigree();
    child.F = fatherId;
    child.M = motherId;
    const fatherSide = source.getPedigree(fatherId);
    const motherSide = source.getPedigree(motherId);
    for (const slot of PEDIGREE_SLOTS) {
        if (slot.length >= 3) continue;
        child[`F${slot}` as PedigreeSlot] = fatherSide[slot];
        child[`M${slot}` as PedigreeSlot] = motherSide[slot];
    }
    return child;
}

/** 一位祖先在 EP 與因子計算時用到的資料 */
export interface AncestorProfile {
    uid: string;
    tags: string[];
    factorIds: string[];
    genes?: GeneralGeneConfig[];
}

/**
 * 組出祖先資料：名冊裡有的武將（父母本人）用名冊的 genes / coreTags，
 * 其餘從 PersonRegistry 取 gene_refs / core_tags；兩邊都有時合併。
 */
export function resolveAncestorProfile(
    uid: string,
    source: Pick<PedigreeSource, 'getPerson'>,
    rosterLookup?: (uid: string) => GeneralConfig | undefined,
): AncestorProfile {
    const general = rosterLookup?.(uid);
    const person = source.getPerson(uid);
    const genes = (general?.genes ?? []).filter((g): g is GeneralGeneConfig & { id: string } => typeof g.id === 'string');
    const factorIds = unique([...genes.map((g) => g.id), ...(person?.gene_refs ?? [])]);
    const tags = unique([...(general?.coreTags ?? []), ...(person?.core_tags ?? []), ...factorIds]);
    return { uid, tags, factorIds, genes };
}

function unique<T>(list: T[]): T[] {
    return Array.from(new Set(list));
}

export interface EpBreakdown {
    ep: number;
    resonance: number;
    outcross: number;
    affinity: number;
    /** 出現在最多位祖先身上的標籤與次數 */
    topTag: string | null;
    topTagCount: number;
    rating: string;
}

/**
 * EP_MVP = 50 + [共鳴] + [異脈] + [契合]
 * - 共鳴：同一標籤（因子 id 或 core tag）出現在 ≥ 3 位祖先身上
 * - 異脈：14 個位置都已知且沒有任何重複的人
 * - 契合：史實 / 宿敵配對
 */
export function computeEpMvp(
    pedigree: Pedigree,
    profiles: Map<string, AncestorProfile>,
    isHistoricalPair: boolean,
): EpBreakdown {
    const tagCounts = new Map<string, number>();
    for (const slot of PEDIGREE_SLOTS) {
        const uid = pedigree[slot];
        if (!uid) continue;
        for (const tag of profiles.get(uid)?.tags ?? []) {
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
    }
    let topTag: string | null = null;
    let topTagCount = 0;
    for (const [tag, count] of Array.from(tagCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
        if (count > topTagCount) {
            topTag = tag;
            topTagCount = count;
        }
    }

    const uids = PEDIGREE_SLOTS.map((slot) => pedigree[slot]);
    const allKnown = uids.every((uid) => !!uid);
    const resonance = topTagCount >= EP_RESONANCE_MIN_COUNT ? EP_RESONANCE_BONUS : 0;
    const outcross = allKnown && new Set(uids).size === PEDIGREE_SLOTS.length ? EP_OUTCROSS_BONUS : 0;
    const affinity = isHistoricalPair ? EP_AFFINITY_BONUS : 0;
    const ep = EP_BASE + resonance + outcross + affinity;
    return { ep, resonance, outcross, affinity, topTag, topTagCount, rating: epRatingLabel(ep) };
}

/** UI_EP_RATING：≥ 90 天命之子 / 70~89 良才美質 / 50~69 中規中矩 / < 50 命途多舛 */
export function epRatingLabel(ep: number): string {
    if (ep >= 90) return '天命之子';
    if (ep >= 70) return '良才美質';
    if (ep >= 50) return '中規中矩';
    return '命途多舛';
}

/** 依祖譜位置組出因子來源（G1 → G3） */
export function buildFactorSources(pedigree: Pedigree, profiles: Map<string, AncestorProfile>): AncestorFactorSource[] {
    const sources: AncestorFactorSource[] = [];
    for (const slot of PEDIGREE_SLOTS) {
        const uid = pedigree[slot];
        if (!uid) continue;
        const profile = profiles.get(uid);
        if (!profile) continue;
        sources.push({ uid, generation: pedigreeSlotGeneration(slot), factorIds: profile.factorIds, genes: profile.genes });
    }
    return sources;
}

// ── 子嗣 ───────────────────────────────────────────────────────────────────

export interface CreateChildInput {
    id: string;
    father: BreedingGeneral;
    mother: BreedingGeneral;
    ep: EpBreakdown;
    factors: InheritedFactor[];
    pedigree: Pedigree;
    random: RandomSource;
    dictionary?: FactorDictionary;
    birthSeason?: number;
}

/** 父母同一 Bloodline_ID 視為同源血脈，子嗣 Vitality_Max × 0.7 */
export function isSameBloodline(father: GeneralConfig, mother: GeneralConfig): boolean {
    return !!father.bloodlineId && father.bloodlineId === mother.bloodlineId;
}

/** Base_Stat = (父 + 母) / 2 × (EP / 100) */
export function childBaseStat(fatherStat: number, motherStat: number, ep: number): number {
    return Math.max(1, Math.round(((fatherStat + motherStat) / 2) * (ep / 100)));
}

export function createChild(input: CreateChildInput): BreedingGeneral {
    const { father, mother, ep } = input;
    const gender = input.random() < 0.5 ? '男' : '女';
    const stats: GeneralStatsConfig = {};
    for (const key of STAT_KEYS) {
        stats[key] = childBaseStat(statOf(father, key), statOf(mother, key), ep.ep);
    }
    const inbred = isSameBloodline(father, mother);
    const maxVitality = Math.round(((maxVigorOf(father) + maxVigorOf(mother)) / 2) * (inbred ? INBREEDING_VITALITY_MULTIPLIER : 1));
    const hp = Math.max(1, Math.round(((father.hp + mother.hp) / 2) * (ep.ep / 100)));

    return {
        id: input.id,
        name: `${father.name}之${gender === '男' ? '子' : '女'}`,
        faction: father.faction,
        gender,
        age: 0,
        status: CHILD_STATUS_MYSTERY,
        hp,
        currentHp: hp,
        ...stats,
        stats,
        vitality: maxVitality,
        maxVitality,
        ep: ep.ep,
        epRating: ep.rating,
        bloodlineId: father.bloodlineId,
        parentsSummary: `父：${father.name} / 母：${mother.name}`,
        genes: toGeneConfigs(input.factors, input.dictionary),
        ancestor_chain: PEDIGREE_SLOTS.map((slot) => input.pedigree[slot]).filter((uid): uid is string => !!uid),
        hiddenFlags: inbred ? ['mystery-phase', 'inbreeding-penalty'] : ['mystery-phase'],
        fatherId: father.id,
        motherId: mother.id,
        breedingCount: 0,
        birthSeason: input.birthSeason,
    };
}

// ── 一次完整結緣 ───────────────────────────────────────────────────────────

export interface BreedingRequest {
    father: BreedingGeneral;
    mother: BreedingGeneral;
    pedigree: PedigreeSource;
    random: RandomSource;
    childId: string;
    birthSeason?: number;
    dictionary?: FactorDictionary;
    enabledColors?: readonly FactorColor[];
    maxFactors?: number;
    isHistoricalPair?: AffinityResolver;
    /** 用來取名冊裡武將的 genes（父母本人、或曾在名冊出生的祖先） */
    rosterLookup?: (uid: string) => GeneralConfig | undefined;
}

export type BreedingOutcome = 'blocked' | 'failed' | 'conceived';

export interface BreedingResult {
    outcome: BreedingOutcome;
    reasons: BreedingBlockReason[];
    conceptionRate: number;
    /** 結緣後的父母（blocked 時與輸入相同） */
    father: BreedingGeneral;
    mother: BreedingGeneral;
    child?: BreedingGeneral;
    childPedigree?: Pedigree;
    ep?: EpBreakdown;
    factors?: InheritedFactor[];
}

/** 預覽 EP（結緣介面用），不消耗亂數也不改任何資料 */
export function previewBreedingEp(request: Omit<BreedingRequest, 'random' | 'childId'>): { pedigree: Pedigree; ep: EpBreakdown } {
    const pedigree = buildChildPedigree(request.father.id, request.mother.id, request.pedigree);
    const profiles = collectProfiles(pedigree, request);
    const historical = request.isHistoricalPair?.(request.father, request.mother) ?? false;
    return { pedigree, ep: computeEpMvp(pedigree, profiles, historical) };
}

/** 子嗣可能繼承的一個因子：至少一位祖先進池的機率（不含星等與 5 格上限） */
export interface FactorPoolEntry {
    id: string;
    color: FactorColor;
    /** 1 − Π(1 − 進池率)，同因子多位祖先帶時機率疊加 */
    chance: number;
    displayName?: string;
}

/**
 * 預覽子嗣的因子池（名士預言用），不消耗亂數也不改任何資料。
 * 依祖譜位置的進池率（G1 100% / G2 50% / G3 25%）計算每個因子至少進池一次的機率，機率高的在前。
 */
export function previewFactorPool(
    request: Omit<BreedingRequest, 'random' | 'childId'>,
): FactorPoolEntry[] {
    const pedigree = buildChildPedigree(request.father.id, request.mother.id, request.pedigree);
    const sources = buildFactorSources(pedigree, collectProfiles(pedigree, request));
    const enabled = new Set(request.enabledColors ?? DEFAULT_ENABLED_FACTOR_COLORS);
    const miss = new Map<string, { color: FactorColor; miss: number }>();
    for (const source of sources) {
        for (const factorId of Array.from(new Set(source.factorIds))) {
            if (!factorId) continue;
            const gene = source.genes?.find((g) => g.id === factorId);
            const color = resolveFactorColor(factorId, request.dictionary, gene);
            if (!color || !enabled.has(color)) continue;
            const entry = miss.get(factorId) ?? { color, miss: 1 };
            entry.miss *= 1 - FACTOR_POOL_RATE[source.generation];
            miss.set(factorId, entry);
        }
    }
    // Cocos Web 轉譯的 loose spread 不會展開 Map iterator，一律用 Array.from（同 PROG-2-0062）
    return Array.from(miss.entries())
        .map(([id, { color, miss: m }]) => ({ id, color, chance: 1 - m, displayName: request.dictionary?.get(id)?.displayName }))
        .sort((a, b) => b.chance - a.chance || a.id.localeCompare(b.id));
}

function collectProfiles(
    pedigree: Pedigree,
    request: Pick<BreedingRequest, 'father' | 'mother' | 'pedigree' | 'rosterLookup'>,
): Map<string, AncestorProfile> {
    const lookup = (uid: string): GeneralConfig | undefined => {
        if (uid === request.father.id) return request.father;
        if (uid === request.mother.id) return request.mother;
        return request.rosterLookup?.(uid);
    };
    const profiles = new Map<string, AncestorProfile>();
    for (const slot of PEDIGREE_SLOTS) {
        const uid = pedigree[slot];
        if (uid && !profiles.has(uid)) profiles.set(uid, resolveAncestorProfile(uid, request.pedigree, lookup));
    }
    return profiles;
}

/**
 * 執行一次結緣。回傳新的父母與子嗣物件，不修改輸入。
 * 亂數消耗順序：受孕 → 因子（依祖譜位置）→ 子嗣性別。
 */
export function breed(request: BreedingRequest): BreedingResult {
    const eligibility = checkBreedingEligibility(request.father, request.mother, request.pedigree);
    const rate = conceptionRate(request.father, request.mother);
    if (!eligibility.ok) {
        return { outcome: 'blocked', reasons: eligibility.reasons, conceptionRate: rate, father: request.father, mother: request.mother };
    }

    const father: BreedingGeneral = { ...request.father, vitality: vigorOf(request.father) - FATHER_VIGOR_COST };
    const mother: BreedingGeneral = { ...request.mother, vitality: vigorOf(request.mother) - MOTHER_VIGOR_COST };

    if (request.random() >= rate) {
        return { outcome: 'failed', reasons: [], conceptionRate: rate, father, mother };
    }

    father.breedingCount = (father.breedingCount ?? 0) + 1;
    mother.breedingCount = (mother.breedingCount ?? 0) + 1;
    mother.pregnancySeasonsLeft = PREGNANCY_LOCK_SEASONS;

    const { pedigree, ep } = previewBreedingEp(request);
    const profiles = collectProfiles(pedigree, request);
    const factors = inheritFactors(buildFactorSources(pedigree, profiles), {
        random: request.random,
        dictionary: request.dictionary,
        enabledColors: request.enabledColors,
        maxFactors: request.maxFactors,
    });
    const child = createChild({
        id: request.childId,
        father: request.father,
        mother: request.mother,
        ep,
        factors,
        pedigree,
        random: request.random,
        dictionary: request.dictionary,
        birthSeason: request.birthSeason,
    });

    return { outcome: 'conceived', reasons: [], conceptionRate: rate, father, mother, child, childPedigree: pedigree, ep, factors };
}

/**
 * 每季呼叫一次：母方待產倒數 −1。回傳本季待產結束的武將 id。
 */
export function advanceBreedingSeason(generals: BreedingGeneral[]): { generals: BreedingGeneral[]; pregnancyEnded: string[] } {
    const pregnancyEnded: string[] = [];
    const next = generals.map((general) => {
        const left = general.pregnancySeasonsLeft ?? 0;
        if (left <= 0) return general;
        const remaining = left - 1;
        if (remaining === 0) pregnancyEnded.push(general.id);
        return { ...general, pregnancySeasonsLeft: remaining };
    });
    return { generals: next, pregnancyEnded };
}

/**
 * 待產凍結（Pregnancy_Lock）：本季開始時仍在待產的母方，精力不隨季度回補。
 * before = 回補前名冊、after = 回補後名冊；回傳把待產者精力還原後的 after。
 */
export function holdPregnancyVigor(before: readonly BreedingGeneral[], after: readonly BreedingGeneral[]): BreedingGeneral[] {
    const held = new Map<string, number | undefined>();
    for (const general of before) {
        if ((general.pregnancySeasonsLeft ?? 0) > 0) held.set(general.id, general.vitality);
    }
    if (held.size === 0) return [...after];
    return after.map((general) => (held.has(general.id) ? { ...general, vitality: held.get(general.id) } : general));
}

/** 給 BloodlineGraph.registerChild 用的輕量人物記錄 */
export function toPersonRecord(child: BreedingGeneral): PersonRecord {
    return {
        uid: child.id,
        template_id: child.templateId ?? null,
        name: child.name,
        gender: child.gender,
        gene_refs: (child.genes ?? []).map((g) => g.id).filter((id): id is string => !!id),
        ep_base: child.ep ?? EP_BASE,
        faction: String(child.faction ?? 'unknown'),
        core_tags: child.coreTags,
        is_virtual: false,
    };
}
