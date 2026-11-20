// @spec-source → 新手開場規格書.md、PROG-2-9179 開局宗室幼苗
/**
 * StarterChildService — 新帳號開局宗室幼苗生成器（純邏輯，不依賴 cc）
 *
 * 數值與策略皆由 assets/resources/data/starter-child-config.json 驅動：
 * - 開局給予一位 4 歲未開蒙（Mystery）宗室幼苗，滿一年（4 季）即可於 5 歲開蒙並進入學府培育。
 * - 只在新局初始化流程（startNewGameWithStarters）呼叫，舊存檔不補送。
 * - 立繪路徑留空交由 Gender/Age PortraitResolver 依 gender + age 動態解析。
 */
import type { GeneralConfig, GeneralGeneConfig, GeneralStatsConfig } from '../models/GeneralUnit';
import { Faction } from '../config/Constants';
import {
    CHILD_STATUS_MYSTERY,
    childRoleOf,
    type BreedingGeneral,
} from '../systems/BreedingSystem';
import { inheritChildAptitudes } from '../systems/ChildAptitudeInheritance';
import { STARTER_CORE_GENERAL_ID } from './StarterRosterService';

export type StarterChildGenderStrategy = 'random' | 'male' | 'female';

export interface StarterChildRange {
    min: number;
    max: number;
}

export interface StarterChildConfig {
    childId: string;
    age: number;
    genderStrategy: StarterChildGenderStrategy;
    nameByGender: {
        男: string;
        女: string;
    };
    statRange: StarterChildRange;
    lukRange: StarterChildRange;
    epRange: StarterChildRange;
    epRating: 'S' | 'A' | 'B' | 'C' | 'D';
    rarityTier: GeneralConfig['rarityTier'];
    characterCategory: GeneralConfig['characterCategory'];
    vitality: number;
    maxVitality: number;
    fallbackGenes: GeneralGeneConfig[];
}

export const DEFAULT_STARTER_CHILD_CONFIG: StarterChildConfig = {
    childId: 'starter-royal-child',
    age: 4,
    genderStrategy: 'random',
    nameByGender: {
        男: '{fatherName}之少主',
        女: '{fatherName}之千金',
    },
    statRange: { min: 52, max: 68 },
    lukRange: { min: 40, max: 60 },
    epRange: { min: 62, max: 72 },
    epRating: 'B',
    rarityTier: 'rare',
    characterCategory: 'general',
    vitality: 100,
    maxVitality: 100,
    fallbackGenes: [
        { id: 'gene_str', level: 1, isLocked: true },
        { id: 'gene_int', level: 1, isLocked: true },
    ],
};

export interface BuildStarterChildOptions {
    coreGeneralId?: string;
    beautyGeneralId?: string;
    config?: StarterChildConfig;
    random?: () => number;
    birthSeason?: number;
}

function rollInt(range: StarterChildRange, random: () => number): number {
    const low = Math.min(range.min, range.max);
    const high = Math.max(range.min, range.max);
    const r = Math.max(0, Math.min(0.999999, random()));
    return low + Math.floor(r * (high - low + 1));
}

function resolveGender(strategy: StarterChildGenderStrategy, random: () => number): '男' | '女' {
    if (strategy === 'male') return '男';
    if (strategy === 'female') return '女';
    return random() < 0.5 ? '男' : '女';
}

function pickStarterGenes(
    father: GeneralConfig | undefined,
    mother: GeneralConfig | undefined,
    fallback: readonly GeneralGeneConfig[],
): GeneralGeneConfig[] {
    const picked: GeneralGeneConfig[] = [];
    const seen = new Set<string>();
    const addFrom = (genes: readonly GeneralGeneConfig[] | undefined) => {
        for (const gene of genes ?? []) {
            if (!gene.id || seen.has(gene.id)) continue;
            seen.add(gene.id);
            picked.push({
                ...gene,
                level: Math.max(1, Math.min(3, gene.level ?? 1)),
                isLocked: true,
            });
            return;
        }
    };
    addFrom(father?.genes);
    addFrom(mother?.genes);
    for (const fb of fallback) {
        if (picked.length >= 2) break;
        if (!fb.id || seen.has(fb.id)) continue;
        seen.add(fb.id);
        picked.push({ ...fb, isLocked: true });
    }
    return picked;
}

export function buildStarterChild(
    starters: readonly GeneralConfig[],
    options: BuildStarterChildOptions = {},
): BreedingGeneral {
    const config = options.config ?? DEFAULT_STARTER_CHILD_CONFIG;
    const random = options.random ?? Math.random;
    const coreId = options.coreGeneralId ?? STARTER_CORE_GENERAL_ID;
    const father = starters.find((g) => g.id === coreId)
        ?? starters.find((g) => g.gender === '男')
        ?? starters[0];
    const mother = (options.beautyGeneralId ? starters.find((g) => g.id === options.beautyGeneralId) : undefined)
        ?? starters.find((g) => g.gender === '女');

    const gender = resolveGender(config.genderStrategy, random);
    const fatherName = father?.name ?? '宗室';
    const template = config.nameByGender[gender] ?? '{fatherName}之少主';
    const name = template.replace('{fatherName}', fatherName);

    const stats: GeneralStatsConfig = {
        str: rollInt(config.statRange, random),
        int: rollInt(config.statRange, random),
        lea: rollInt(config.statRange, random),
        pol: rollInt(config.statRange, random),
        cha: rollInt(config.statRange, random),
        luk: rollInt(config.lukRange, random),
    };
    const ep = rollInt(config.epRange, random);
    const genes = pickStarterGenes(father, mother, config.fallbackGenes);
    const aptitudes = father
        ? inheritChildAptitudes(father as BreedingGeneral, (mother ?? father) as BreedingGeneral)
        : {};
    const hp = Math.max(60, Math.round((father?.hp ?? 100) * 0.65));

    return {
        id: config.childId,
        name,
        faction: father?.faction ?? Faction.Player,
        gender,
        age: config.age,
        status: CHILD_STATUS_MYSTERY,
        hp,
        currentHp: hp,
        ...stats,
        stats,
        ...aptitudes,
        vitality: config.vitality,
        maxVitality: config.maxVitality,
        ep,
        epRating: config.epRating,
        rarityTier: config.rarityTier,
        characterCategory: config.characterCategory,
        bloodlineId: father?.bloodlineId,
        role: father && mother ? childRoleOf(father.role, mother.role) : (father?.role ?? 'Combat'),
        parentsSummary: mother ? `父：${fatherName} / 母：${mother.name}` : `父：${fatherName} / 宗室撫育`,
        genes,
        ancestor_chain: [father?.id, mother?.id].filter((uid): uid is string => !!uid),
        hiddenFlags: ['mystery-phase'],
        fatherId: father?.id,
        motherId: mother?.id,
        breedingCount: 0,
        birthSeason: options.birthSeason ?? -(config.age * 4),
    };
}
