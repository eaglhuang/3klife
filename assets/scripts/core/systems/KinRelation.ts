/**
 * 家族關係（史實相性）系統：關係 Schema（KIN-01）與相性標籤引擎（KIN-03）。
 *
 * 規格：docs/遊戲規格文件/系統規格書/家族關係（史實相性）系統.md §F、§I
 * Unity 對照：關係型別像 ScriptableObject 的列舉欄位；parse* 像 JsonUtility 讀入後的驗證；
 * analyzeTagResonance 是純函式工具，不碰場景與存檔。
 *
 * 本檔只做純邏輯。史實資料表（KIN-02）與爆發力接線（KIN-04）另卡處理。
 */
/** 血脈共鳴門檻：同一標籤至少出現在幾位祖先身上（規格 §F，EP +15）。BreedingSystem 沿用此值 */
export const KIN_RESONANCE_MIN_COUNT = 3;

/** 史實關係（靜態資料，以 Template_ID 配對） */
export const HISTORICAL_RELATION_TYPES = ['COUPLE', 'SWORN', 'MASTER_STUDENT', 'RIVAL', 'LORD_VASSAL'] as const;
export type HistoricalRelationType = (typeof HISTORICAL_RELATION_TYPES)[number];

/** 動態關係（遊戲中累積，以 UID 配對） */
export const DYNAMIC_RELATION_TYPES = ['COMRADE', 'DYNAMIC_SWORN', 'SPOUSE', 'PARENT_CHILD'] as const;
export type DynamicRelationType = (typeof DYNAMIC_RELATION_TYPES)[number];

export interface HistoricalRelationExtraEffects {
    /** 受孕率倍率（宿敵 0.7、夫妻 +20% 即 1.2） */
    conceptionRateMod?: number;
    /** 合攻觸發率倍率（義兄弟 1.3） */
    comboAttackRateMod?: number;
    /** 忠誠度加成（主從 +20） */
    loyaltyBonus?: number;
}

export interface HistoricalRelation {
    relationId: string;
    templateA: string;
    templateB: string;
    type: HistoricalRelationType;
    epBonus: number;
    extraEffects: HistoricalRelationExtraEffects;
    loreKey: string;
}

export interface DynamicRelation {
    uidA: string;
    uidB: string;
    type: DynamicRelationType;
    /** 親密度 0~100 */
    intimacy: number;
    createdSeason: number;
    /** 每季衰減值 */
    decayRate: number;
}

export type RelationParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

function isRecord(raw: unknown): raw is Record<string, unknown> {
    return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

function nonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function finiteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 驗證一筆史實關係的 raw JSON（欄位名稱沿用 JSON 資料的 camelCase）。
 * 型別不在清單內、必填欄位缺失、或 A/B 為同一人時回傳 reason。
 */
export function parseHistoricalRelation(raw: unknown): RelationParseResult<HistoricalRelation> {
    if (!isRecord(raw)) return { ok: false, reason: 'not-an-object' };
    if (!nonEmptyString(raw.relationId)) return { ok: false, reason: 'missing-relation-id' };
    if (!nonEmptyString(raw.templateA) || !nonEmptyString(raw.templateB)) return { ok: false, reason: 'missing-template' };
    if (raw.templateA === raw.templateB) return { ok: false, reason: 'self-relation' };
    if (!(HISTORICAL_RELATION_TYPES as readonly unknown[]).includes(raw.type)) return { ok: false, reason: 'unknown-type' };
    if (!finiteNumber(raw.epBonus)) return { ok: false, reason: 'invalid-ep-bonus' };
    if (!isRecord(raw.extraEffects)) return { ok: false, reason: 'missing-extra-effects' };
    if (!nonEmptyString(raw.loreKey)) return { ok: false, reason: 'missing-lore-key' };

    const effects = raw.extraEffects;
    const extraEffects: HistoricalRelationExtraEffects = {};
    for (const key of ['conceptionRateMod', 'comboAttackRateMod', 'loyaltyBonus'] as const) {
        if (effects[key] === undefined) continue;
        if (!finiteNumber(effects[key])) return { ok: false, reason: `invalid-${key}` };
        extraEffects[key] = effects[key];
    }

    return {
        ok: true,
        value: {
            relationId: raw.relationId,
            templateA: raw.templateA,
            templateB: raw.templateB,
            type: raw.type as HistoricalRelationType,
            epBonus: raw.epBonus,
            extraEffects,
            loreKey: raw.loreKey,
        },
    };
}

/** 驗證一筆動態關係的 raw JSON；親密度超出 0~100 直接拒絕，不做靜默裁切。 */
export function parseDynamicRelation(raw: unknown): RelationParseResult<DynamicRelation> {
    if (!isRecord(raw)) return { ok: false, reason: 'not-an-object' };
    if (!nonEmptyString(raw.uidA) || !nonEmptyString(raw.uidB)) return { ok: false, reason: 'missing-uid' };
    if (raw.uidA === raw.uidB) return { ok: false, reason: 'self-relation' };
    if (!(DYNAMIC_RELATION_TYPES as readonly unknown[]).includes(raw.type)) return { ok: false, reason: 'unknown-type' };
    if (!finiteNumber(raw.intimacy) || raw.intimacy < 0 || raw.intimacy > 100) return { ok: false, reason: 'intimacy-out-of-range' };
    if (!finiteNumber(raw.createdSeason) || raw.createdSeason < 0) return { ok: false, reason: 'invalid-created-season' };
    if (!finiteNumber(raw.decayRate) || raw.decayRate < 0) return { ok: false, reason: 'invalid-decay-rate' };

    return {
        ok: true,
        value: {
            uidA: raw.uidA,
            uidB: raw.uidB,
            type: raw.type as DynamicRelationType,
            intimacy: raw.intimacy,
            createdSeason: raw.createdSeason,
            decayRate: raw.decayRate,
        },
    };
}

/** 家風傳承門檻（規格 §F：同一標籤 5+ 位祖先 → 家風傳承） */
export const FAMILY_TRADITION_MIN_COUNT = 5;

export interface TagResonance {
    /** 出現在最多位祖先身上的標籤（並列時取字典序較前者，與 computeEpMvp 相同） */
    topTag: string | null;
    topTagCount: number;
    /** 血脈共鳴達標（≥ KIN_RESONANCE_MIN_COUNT，EP +15） */
    resonance: boolean;
    /** 家風傳承達標（≥ FAMILY_TRADITION_MIN_COUNT）；只判定，Buff 內容待 KIN-11 */
    familyTradition: boolean;
}

/**
 * 相性標籤引擎：輸入每位祖先（最多 14 人）的標籤清單，統計同一標籤出現在幾位祖先身上。
 * 同一位祖先重複列出的標籤只計一次。空陣列回傳無共鳴。
 * 計法與 computeEpMvp 的 tagCounts 相同，兩處結果必須一致。
 */
export function analyzeTagResonance(ancestors: ReadonlyArray<ReadonlyArray<string>>): TagResonance {
    const tagCounts = new Map<string, number>();
    for (const tags of ancestors) {
        for (const tag of new Set(tags)) {
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

    return {
        topTag,
        topTagCount,
        resonance: topTagCount >= KIN_RESONANCE_MIN_COUNT,
        familyTradition: topTagCount >= FAMILY_TRADITION_MIN_COUNT,
    };
}
