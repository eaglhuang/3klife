// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 第 3 章成員類別、第 7 章分家、第 8 章義子、第 9 章家臣子嗣、第 11 章 JSON；PROG-2-9441
/**
 * FamilyTypes — 家族資料模型的型別與常數（零依賴，不 import 引擎或 UI）。
 *
 * 成員只有四種 kind；「進家譜、傳血統、可入學」等旗標一律由 kind／來源／分家標記推出（familyTraits），
 * 不在紀錄裡各存一份，避免兩處不一致。
 */

/** 家族成員類別：配偶、親生子嗣、義子、家臣子嗣（家主本人是家譜根，不在這張表） */
export const FAMILY_MEMBER_KINDS = ['spouse', 'biological', 'adopted', 'retainerChild'] as const;
export type FamilyMemberKind = (typeof FAMILY_MEMBER_KINDS)[number];

/**
 * 義子來源：劇情來投、招賢館征募、歷史名將義子，以及 Q-F1 裁決的「開局義子特例」（開局三位 14 歲少年）。
 * 開局義子特例：標記義子、進家譜、可入學府，但不遺傳血統（與一般義子相同，只是來源不同）。
 */
export const ADOPT_SOURCES = ['story', 'recruit', 'historical', 'starter'] as const;
export type AdoptSource = (typeof ADOPT_SOURCES)[number];

/**
 * 哺乳方式（規格 3.4 節）：breast 母乳＝哺乳占用到孩子 breastfeedEndAge 歲或改方式止；
 * formula 其他方式＝產後休養 postpartumQuarters 季；wetNurse 乳母＝母親不占用。
 */
export const NURSING_METHODS = ['breast', 'formula', 'wetNurse'] as const;
export type NursingMethod = (typeof NURSING_METHODS)[number];

export const FAMILY_STATE_VERSION = 1 as const;

/** 一位家族成員（存檔欄位 familyState.members 的元素） */
export interface FamilyMemberRecord {
    /** 對應名冊武將 id（少年與成年版同 id） */
    personId: string;
    kind: FamilyMemberKind;
    /** 只有 kind=adopted 才有，且必填 */
    adoptSource?: AdoptSource;
    /** 父母 id（最多兩位）；家臣子嗣必填至少一位（家臣），開局義子特例為空 */
    parentIds: string[];
    /** 分家標記：已分家者填分家 id，null＝仍在本家；分家後改算家臣家、不進家譜 */
    branchId: string | null;
    /** 加入家族的時間（已過季數，呼叫端刻度） */
    joinedAt: number;
}

/** 分家紀錄：用來擋「重複領 branchPrestige」（TC-FAM-05） */
export interface FamilyBranchRecord {
    branchId: string;
    /** 分家家主 personId */
    headId: string;
    /** 分家時間（已過季數） */
    atSeason: number;
}

/** 存檔欄位 familyState：自帶版號（v），舊檔缺值讀回為空，不升存檔版號 */
export interface FamilyStateV1 {
    v: typeof FAMILY_STATE_VERSION;
    members: FamilyMemberRecord[];
    branches: FamilyBranchRecord[];
}

/** 由紀錄推出的家族屬性（總規格書第 3.1 節表格） */
export interface FamilyTraits {
    /** 進家譜：決定世家積分、血統樹與家譜畫面是否顯示；家臣子嗣與已分家者不進 */
    inGenealogy: boolean;
    /** 作為親代傳血統因子：配偶與親生子嗣會，義子（含開局義子特例）與家臣子嗣不會 */
    passesBloodline: boolean;
    /** 可入學府：配偶不可；其餘皆可（家臣子嗣另需入學令，第 9 章） */
    canEnroll: boolean;
}

export type FamilyErrorCode = 'INVALID' | 'DUPLICATE' | 'NOT_FOUND' | 'CAP_REACHED';

export class FamilyError extends Error {
    public readonly code: FamilyErrorCode;

    public constructor(code: FamilyErrorCode, message: string) {
        super(message);
        this.name = 'FamilyError';
        this.code = code;
    }
}

export function emptyFamilyState(): FamilyStateV1 {
    return { v: FAMILY_STATE_VERSION, members: [], branches: [] };
}

export function isEmptyFamilyState(state: FamilyStateV1 | null | undefined): boolean {
    return !state || (state.members.length === 0 && state.branches.length === 0);
}

export function familyTraits(member: Pick<FamilyMemberRecord, 'kind' | 'branchId'>): FamilyTraits {
    return {
        inGenealogy: member.kind !== 'retainerChild' && member.branchId === null,
        passesBloodline: member.kind === 'spouse' || member.kind === 'biological',
        canEnroll: member.kind !== 'spouse',
    };
}
