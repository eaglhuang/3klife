// @spec-source → 技能系統 Base 框架規格書 (doc_spec_1187) §3 資料結構、§4 共用 API；共用框架總綱 (doc_spec_1182) §12 SKL-M；PROG-2-9204
/**
 * SkillTypes — 技能系統 base 的型別（零依賴純型別）。
 *
 * 人物、戰場、培育、家族技能與個人天賦都屬同一套技能系統；`domain` 區分類別。
 * MVP 只實作 nurture（學府）與 battle（讀取）兩個域，其餘域的欄位先留位，不用暫時欄位名佔位。
 *
 * Unity 對照：像一份 ScriptableObject（SkillDef）加上存檔內的 SkillHolding。
 */

/** 技能類別（規格 §2）；MVP 只有 nurture／battle 會被寫入，其餘 TODO(第二版) 補持有結構 */
export type SkillDomain = 'battle' | 'nurture' | 'career' | 'clan' | 'talent' | 'general';

export const SKILL_DOMAINS: readonly SkillDomain[] = Object.freeze(['battle', 'nurture', 'career', 'clan', 'talent', 'general']);

/** 觸發方式（規格 §2） */
export type SkillTriggerMode = 'activeCast' | 'passive' | 'auto' | 'onEvent' | 'inspired';

/** 條件為 shared/foundation/Condition 的 JSON；此處不 import，保持本檔零依賴 */
export type SkillConditionJson = Record<string, unknown>;

/** 冷卻：現行戰法規格無冷卻（有 schema 守門測試禁用該欄位），第二版若要冷卻先改守門 */
export interface SkillCost {
    tp?: number;
    sp?: number;
    energy?: number;
    /** null＝不限；'oncePerLife'／'oncePerBattle' 之類由第二版補 */
    uses?: number | string | null;
}

export interface SkillLevelDef {
    lv: number;
    /** 升到此等級需要的熟練度（xp）；第 1 級不需要 */
    xpRequired?: number;
    effectRef?: string;
    cost?: SkillCost;
}

/** 技能定義 skill-def.v1（靜態資料；新增技能只改資料，不改程式） */
export interface SkillDef {
    schema: 'skill-def.v1';
    id: string;
    domain: SkillDomain;
    /** 繁中顯示名；nameKey 留給 i18n，缺名稱時 UI 用 nameKey 查字串表 */
    name: string;
    nameKey?: string;
    category?: string;
    tags: string[];
    rarity?: string;
    /** 技能來源類型：academy／seed-tactic／mentor／bloodline／tiger-tally／talent… */
    source?: { type: string; ids?: string[] };
    learn?: {
        /** 學習 TP 門檻 = cost.tp × tpThresholdMul（戰法現行為 2） */
        tpThresholdMul?: number;
        needs?: SkillConditionJson[];
    };
    /** 等級表；省略或只有一級＝不分等級（規格 Q2：戰法不分等級） */
    levels?: SkillLevelDef[];
    trigger?: { mode: SkillTriggerMode; conditions?: SkillConditionJson[] };
    cost?: SkillCost;
    /** 效果描述；解算由戰場端註冊的 resolver 負責，本框架只存資料 */
    effect?: { kind: string; params?: Record<string, unknown>; description?: string };
    presentation?: { castKey?: string; ultimate?: boolean };
}

export interface HolderRef {
    kind: 'general';
    id: string;
}

/** 持有紀錄 skill-holding.v1 的單筆 */
export interface SkillRecord {
    skillId: string;
    level: number;
    xp: number;
    /** 取得來源：academy／inspired／reward／learn… */
    learnedFrom: string;
    learnedAt: number;
}

/** 持續到某個時機的調整值（規格 §3.3；期中方針 policy:* 即此型） */
export interface SkillModifier {
    id: string;
    source: string;
    /** 'graduation'：結業時清除；MVP 只有這一種，季級持續由 status-effect（第二版）接手 */
    until: 'graduation' | 'manual';
    appliedAt: number;
}

export interface SkillHolding {
    holder: HolderRef;
    skills: SkillRecord[];
    modifiers: SkillModifier[];
}

/** 不可學／不可升的原因（沿用 TacticLearnBlock 並補 E6xx 對應） */
export type SkillBlock =
    | 'INVALID_SKILL' | 'ALREADY_LEARNED' | 'TP_SHORT' | 'NO_SLOT' | 'APTITUDE_UNMET'
    | 'NOT_INSPIRED' | 'MAX_LEVEL' | 'NOT_LEARNED';

export interface LearnCheck {
    ok: boolean;
    blocked?: SkillBlock;
    /** 學習所需 TP 門檻與實際消耗（有成本時） */
    tpThreshold?: number;
    tpCost?: number;
}

export interface LearnResult {
    ok: boolean;
    blocked?: SkillBlock;
    skill?: SkillRecord;
    spent?: { tp: number };
}

export interface GrantResult {
    /** 這次新增的技能（已持有者不重複加，所以重送同一筆回空陣列） */
    granted: string[];
    /** 已持有而略過 */
    skipped: string[];
    /** 技能定義庫查無的 id：grant 寬容寫入（舊資料、暫定 id），但回報給呼叫端 */
    unknown: string[];
}

export interface UpgradeResult {
    ok: boolean;
    blocked?: SkillBlock;
    skill?: SkillRecord;
}

/** 學習判定所需的宿主事實（TP、槽位上限、技能條件的事實）；由權威端提供，客戶端不能傳入 */
export interface LearnFacts {
    tp: number;
    /** 實際 TP 成本（已含教官、因子折扣）；省略則用 def.cost.tp */
    tpCost?: number;
    slotCapacity: number;
    /** 是否取得來源資格（教官靈感等）；省略視為 true */
    qualified?: boolean;
}

/** 持有存放 port：單機由 GameSession 的名冊實作，連線時換伺服器存檔 */
export interface SkillHolderStore {
    load(holder: HolderRef): SkillHolding | null;
    save(holder: HolderRef, holding: SkillHolding): void;
}

/** 學習權威 port：提供事實與扣 TP；沒有綁定時 learn 不可用（grant 不需要） */
export interface SkillLearnAuthority {
    facts(holder: HolderRef, def: SkillDef): LearnFacts | null;
    spendTp(holder: HolderRef, amount: number): boolean;
}
