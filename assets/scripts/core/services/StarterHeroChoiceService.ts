// @spec-source → O-02 開局名將三選一 (PROG-2-9951)
import type { GeneralConfig } from '../models/GeneralUnit';
import starterHeroChoiceData from '../../../resources/data/starter-hero-choice-config.json';

export const OPENING_HERO_CHOICE_IDS = ['zhao-yun', 'guan-yu', 'zhuge-liang'] as const;
export type OpeningHeroChoiceId = typeof OPENING_HERO_CHOICE_IDS[number];

export interface StarterHeroCandidateConfig {
    readonly id: OpeningHeroChoiceId;
    readonly roleTag: string;
}

export interface StarterHeroChoiceConfig {
    readonly defaultPickId: OpeningHeroChoiceId;
    readonly candidates: readonly StarterHeroCandidateConfig[];
}

export interface StarterHeroChoiceOption {
    readonly id: OpeningHeroChoiceId;
    readonly name: string;
    readonly roleTag: string;
    readonly str: number;
    readonly int: number;
    readonly lea: number;
}

export function getStarterHeroChoiceConfig(): StarterHeroChoiceConfig {
    return starterHeroChoiceData as StarterHeroChoiceConfig;
}

export function isOpeningHeroChoiceId(id: string | null | undefined): id is OpeningHeroChoiceId {
    return OPENING_HERO_CHOICE_IDS.some(candidateId => candidateId === id);
}

export function buildStarterHeroChoiceOptions(
    generals: readonly GeneralConfig[],
    config: StarterHeroChoiceConfig = getStarterHeroChoiceConfig(),
): StarterHeroChoiceOption[] {
    return config.candidates.map(candidate => {
        const found = generals.find(g => g.id === candidate.id);
        return {
            id: candidate.id,
            name: found?.name ?? candidate.id,
            roleTag: candidate.roleTag,
            str: found?.str ?? 0,
            int: found?.int ?? 0,
            lea: found?.lea ?? 0,
        };
    });
}
