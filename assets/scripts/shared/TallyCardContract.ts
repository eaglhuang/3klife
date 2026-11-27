// @spec-source → 兵種（虎符）系統.md (doc_spec_0012)；PROG-2-1429 依建檔紀錄補標出處
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
    /** 玩家持有的卡片實例 uid（PROG-2-0579）；出陣時以它查星級與戰後經驗，沒綁到持有卡時為 undefined */
    instanceUid?: string;
    battleSkillId?: string;
    battleSkillSourceType?: SkillSourceType;
    targetMode?: BattleSkillTargetMode;
    timing?: BattleSkillTiming;
    isDisabled?: boolean;
    /** 守城保底券可用於這張卡（卡面顯示「保」小標；PROG-2-10041） */
    guardTicket?: boolean;
    /** 持有卡品質 R／SR／SSR／UR（綁到持有實例時填；卡面品階優先採用，沒有就看 rarity；PROG-2-10131） */
    qualityTier?: string;
    /** 持有卡實際星級 1~5（卡面星數與共鳴倍率依此；沒有就數 stars 字串的 ★） */
    starLevel?: number;
    /** 持有武將名（卡面「持有 ○○」；沒有就不顯示該行） */
    ownerName?: string;
    /** 灌注等級（Lv5 銀章、Lv8 金章） */
    infuseLevel?: number;
    /** 圖鑑狀態 LOCKED／DISCOVERED／ACQUIRED／STAR_ENHANCED；戰場出戰卡沒填，依星級推導 */
    collectionState?: 'LOCKED' | 'DISCOVERED' | 'ACQUIRED' | 'STAR_ENHANCED';
    /** 已出戰（卡面顯示「出戰中」標籤，不做冷卻） */
    deployed?: boolean;
    rarityLabel?: string;
    stars?: string;
    artResource?: string;
    rarityResource?: string;
    typeBadgeResource?: string;
    typeIconResource?: string;
}

/**
 * 兵種單字符號（PROG-2-9392）：各兵種的圖示還沒畫，面板先在圓底上寫一個字，免得玩家看到空格。
 * 暫代用，等圖示交件後由 typeIconResource 接手，這張表就可以拿掉。
 */
export const TROOP_TYPE_GLYPH: Readonly<Record<string, string>> = {
    cavalry: '騎',
    infantry: '步',
    shield: '盾',
    archer: '弓',
    pikeman: '槍',
    engineer: '工',
    medic: '醫',
    navy: '水',
};

/** 兵種代號 → 單字符號；不認得的兵種回空字串 */
export function troopTypeGlyph(unitType: string | undefined | null): string {
    return TROOP_TYPE_GLYPH[(unitType ?? '').trim().toLowerCase()] ?? '';
}
