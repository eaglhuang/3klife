// @spec-source → 使用者裁決 2026-11-26（新局第 1 年送一位 7 歲幼苗，一年＝四季＝長一歲）；PROG-2-10058；家族子嗣與血統總規格書 (doc_spec_1241) 第 8 章義子
/**
 * StarterSeedlingService — 新局開局「7 歲幼苗」生成器（純邏輯，不依賴 cc）
 *
 * 與 14 歲投靠少年（StarterYouthService）不同：幼苗是自家孩子，走「子嗣」同一套資料——
 * - 名冊上的武將（age 會隨季結算自動長：一季 +0.25，一年 +1 歲），不是 Mystery 狀態：
 *   5 歲開獎、抓周那套給親生子嗣用，幼苗的天賦節奏是第 2 年 8 歲徵兆、第 6 年 12 歲顯露、第 9 年 15 歲覺醒（後續卡接）。
 * - 家族登記表寫 kind='adopted'、adoptSource='starter'、父＝核心主將（進家譜、可入學，不遺傳血統）。
 * - 出生年由 birthSeason 推得（第 1 年開局時 7 歲 → 出生年 -6，見 childBirthYear）。
 * 立繪路徑留空，id 以 child_ 開頭，交給既有的性別／年齡立繪解析。
 */
import type { GeneralConfig, GeneralGeneConfig, GeneralStatsConfig } from '../models/GeneralUnit';
import { Faction } from '../config/Constants';
import { childRoleOf, type BreedingGeneral } from '../systems/BreedingSystem';
import { inheritChildAptitudes } from '../systems/ChildAptitudeInheritance';
import { STARTER_CORE_GENERAL_ID } from './StarterRosterService';

export type SeedlingGenderStrategy = 'random' | 'male' | 'female';

export interface SeedlingRange {
    min: number;
    max: number;
}

export interface StarterSeedlingConfig {
    childId: string;
    age: number;
    genderStrategy: SeedlingGenderStrategy;
    nameByGender: { 男: string; 女: string };
    statRange: SeedlingRange;
    lukRange: SeedlingRange;
    epRange: SeedlingRange;
    epRating: 'S' | 'A' | 'B' | 'C' | 'D';
    rarityTier: GeneralConfig['rarityTier'];
    characterCategory: GeneralConfig['characterCategory'];
    /** 血量＝父親（核心主將）血量 × 此比例，至少 30 */
    hpRatio: number;
    vitality: number;
    maxVitality: number;
    /** 親子好感起始值（0~100） */
    initialFavor: number;
    fallbackGenes: GeneralGeneConfig[];
}

export const STARTER_SEEDLING_ORIGIN = 'starter' as const;

/** 每年幾季（出生年換算用；與 GameClock 一年四季一致） */
const SEASONS_PER_YEAR = 4;

export const DEFAULT_STARTER_SEEDLING_CONFIG: StarterSeedlingConfig = {
    childId: 'child_starter_seedling',
    age: 7,
    genderStrategy: 'random',
    nameByGender: { 男: '{fatherName}之少主', 女: '{fatherName}之千金' },
    statRange: { min: 18, max: 30 },
    lukRange: { min: 40, max: 60 },
    epRange: { min: 62, max: 72 },
    epRating: 'B',
    rarityTier: 'rare',
    characterCategory: 'general',
    hpRatio: 0.4,
    vitality: 100,
    maxVitality: 100,
    initialFavor: 30,
    fallbackGenes: [
        { id: 'gene_str', level: 1, isLocked: true },
        { id: 'gene_int', level: 1, isLocked: true },
    ],
};

export const STARTER_SEEDLING_CONFIG_JSON = 'data/starter-seedling-config';

let activeConfig: StarterSeedlingConfig = DEFAULT_STARTER_SEEDLING_CONFIG;

function num(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function range(value: Partial<SeedlingRange> | undefined, fallback: SeedlingRange): SeedlingRange {
    return value && Number.isFinite(value.min) && Number.isFinite(value.max) ? { min: value.min as number, max: value.max as number } : fallback;
}

/** 套用 starter-seedling-config.json（缺欄位退回內建預設；範圍必須是數字）。 */
export function configureStarterSeedling(raw: Partial<StarterSeedlingConfig> | null | undefined): void {
    if (!raw || typeof raw !== 'object') {
        activeConfig = DEFAULT_STARTER_SEEDLING_CONFIG;
        return;
    }
    const d = DEFAULT_STARTER_SEEDLING_CONFIG;
    activeConfig = {
        ...d,
        childId: typeof raw.childId === 'string' && raw.childId ? raw.childId : d.childId,
        age: num(raw.age, d.age),
        genderStrategy: raw.genderStrategy === 'male' || raw.genderStrategy === 'female' ? raw.genderStrategy : d.genderStrategy,
        nameByGender: { ...d.nameByGender, ...(raw.nameByGender ?? {}) },
        statRange: range(raw.statRange, d.statRange),
        lukRange: range(raw.lukRange, d.lukRange),
        epRange: range(raw.epRange, d.epRange),
        epRating: raw.epRating ?? d.epRating,
        rarityTier: raw.rarityTier ?? d.rarityTier,
        characterCategory: raw.characterCategory ?? d.characterCategory,
        hpRatio: num(raw.hpRatio, d.hpRatio),
        vitality: num(raw.vitality, d.vitality),
        maxVitality: num(raw.maxVitality, d.maxVitality),
        initialFavor: num(raw.initialFavor, d.initialFavor),
        fallbackGenes: Array.isArray(raw.fallbackGenes) ? raw.fallbackGenes : d.fallbackGenes,
    };
}

/** 目前生效的幼苗設定（JSON 載入後即為 JSON 值）。 */
export function getStarterSeedlingConfig(): StarterSeedlingConfig {
    return activeConfig;
}

export interface BuildStarterSeedlingOptions {
    coreGeneralId?: string;
    config?: StarterSeedlingConfig;
    random?: () => number;
    /** 出生時的 totalSeasonsElapsed；預設 -(age × 4)，即新局第 1 季時剛好 age 歲 */
    birthSeason?: number;
}

function rollInt(r: SeedlingRange, random: () => number): number {
    const low = Math.min(r.min, r.max);
    const high = Math.max(r.min, r.max);
    return low + Math.floor(Math.max(0, Math.min(0.999999, random())) * (high - low + 1));
}

function resolveGender(strategy: SeedlingGenderStrategy, random: () => number): '男' | '女' {
    if (strategy === 'male') return '男';
    if (strategy === 'female') return '女';
    return random() < 0.5 ? '男' : '女';
}

function pickGenes(father: GeneralConfig | undefined, fallback: readonly GeneralGeneConfig[]): GeneralGeneConfig[] {
    const picked: GeneralGeneConfig[] = [];
    const seen = new Set<string>();
    for (const gene of [...(father?.genes ?? []).slice(0, 1), ...fallback]) {
        if (picked.length >= 2) break;
        if (!gene.id || seen.has(gene.id)) continue;
        seen.add(gene.id);
        picked.push({ ...gene, level: Math.max(1, Math.min(3, gene.level ?? 1)), isLocked: true });
    }
    return picked;
}

/**
 * 產生幼苗：父＝核心主將，沒有母親（宗室撫育）。不設 Mystery 狀態（不走 5 歲自動開獎）；
 * 加 'mystery-phase' 旗標讓五維在顯露前維持保密、不可出戰。
 */
export function buildStarterSeedling(starters: readonly GeneralConfig[], options: BuildStarterSeedlingOptions = {}): BreedingGeneral {
    const config = options.config ?? activeConfig;
    const random = options.random ?? Math.random;
    const coreId = options.coreGeneralId ?? STARTER_CORE_GENERAL_ID;
    const father = starters.find((g) => g.id === coreId) ?? starters.find((g) => g.gender === '男') ?? starters[0];
    const gender = resolveGender(config.genderStrategy, random);
    const fatherName = father?.name ?? '宗室';
    const name = (config.nameByGender[gender] ?? '{fatherName}之少主').replace('{fatherName}', fatherName);

    const stats: GeneralStatsConfig = {
        str: rollInt(config.statRange, random),
        int: rollInt(config.statRange, random),
        lea: rollInt(config.statRange, random),
        pol: rollInt(config.statRange, random),
        cha: rollInt(config.statRange, random),
        luk: rollInt(config.lukRange, random),
    };
    const aptitudes = father ? inheritChildAptitudes(father as BreedingGeneral, father as BreedingGeneral) : {};
    const hp = Math.max(30, Math.round((father?.hp ?? 100) * config.hpRatio));

    return {
        id: config.childId,
        name,
        faction: father?.faction ?? Faction.Player,
        gender,
        age: config.age,
        hp,
        currentHp: hp,
        ...stats,
        stats,
        ...aptitudes,
        vitality: config.vitality,
        maxVitality: config.maxVitality,
        ep: rollInt(config.epRange, random),
        epRating: config.epRating,
        rarityTier: config.rarityTier,
        characterCategory: config.characterCategory,
        bloodlineId: father?.bloodlineId,
        role: father ? childRoleOf(father.role, father.role) : 'Combat',
        parentsSummary: `父：${fatherName} / 宗室撫育`,
        genes: pickGenes(father, config.fallbackGenes),
        ancestor_chain: father ? [father.id] : [],
        hiddenFlags: ['mystery-phase', 'seedling'],
        fatherId: father?.id,
        breedingCount: 0,
        birthSeason: options.birthSeason ?? -(config.age * SEASONS_PER_YEAR),
    };
}

/** 孩子的出生年（遊戲曆年；新局第 1 年）：幼苗 7 歲 → -6；沒有 birthSeason 回 null */
export function childBirthYear(child: { birthSeason?: number }, startYear = 1): number | null {
    return typeof child.birthSeason === 'number' && Number.isFinite(child.birthSeason)
        ? startYear + Math.floor(child.birthSeason / SEASONS_PER_YEAR)
        : null;
}
