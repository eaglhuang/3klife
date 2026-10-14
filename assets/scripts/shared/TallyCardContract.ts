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

/** 虎符適性等級（規格 S/A/B/C/D） */
export type TallyAffinityGradeKey = 'S' | 'A' | 'B' | 'C' | 'D';

/**
 * 虎符適性資料（TRP-13，全部選填；缺的欄位用預設：地形 B、無家族、無性別偏好、無史實羈絆）。
 * terrainGrades 的 key 用 TerrainType 的值（plain/mountain/forest/river/fortress/desert）。
 * 規格寫的「城市」對應遊戲的 fortress（城池／關隘）。
 */
export interface TallyAffinityProfile {
    terrainGrades?: Readonly<Record<string, TallyAffinityGradeKey>>;
    clanID?: string;
    genderPref?: 'NONE' | 'MALE' | 'FEMALE';
    /** 有史實羈絆的武將 uid */
    historicBonds?: readonly string[];
}

export interface TallyCardData {
    unitType: string;
    affinity?: TallyAffinityProfile;
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
