import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from './SkillRuntimeContract';

export interface TallyTraitDetail {
    label: string;
    detail?: string;
}

export interface TallyAbilityDetail {
    name: string;
    detail?: string;
}

export interface TallySourceInfo {
    faction?: string;
    origin?: string;
    sourceType?: string;
    obtainHint?: string;
}

export interface TallyLoreInfo {
    title?: string;
    summary?: string;
    body?: string;
}

export interface TallyCardData {
    unitType: string;
    unitName: string;
    unitSub: string;
    atk:  number;
    def:  number;
    hp:   number;
    spd:  number;
    cost: number;
    rarity: 'normal' | 'rare' | 'epic' | 'legendary' | 'mythic';
    traits: string[];
    abilities: string[];
    desc: string;
    traitDetails?: TallyTraitDetail[];
    abilityDetails?: TallyAbilityDetail[];
    source?: TallySourceInfo;
    lore?: TallyLoreInfo;
    tacticId?: string;
    battleSkillId?: string;
    battleSkillSourceType?: SkillSourceType;
    targetMode?: BattleSkillTargetMode;
    timing?: BattleSkillTiming;
    isDisabled?: boolean;
    rarityLabel?: string;
    stars?: string;
    artResource?: string;
    rarityResource?: string;
    typeBadgeResource?: string;
    typeIconResource?: string;
}
