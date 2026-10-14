// @spec-source → 教官系統（支援卡）.md (doc_spec_0027) §I Data Schema（本機端 JSON）、§J 名詞定義
/**
 * MentorSupportSchema — 教官支援卡（SUP_*）資料結構與解析（純邏輯，不依賴 cc）
 *
 * 負責把策劃寫的支援卡 JSON（Teaching_Style / Tactic_Inspire_Events / Passive_Effects …）
 * 解析成一份型別安全的 SupportCardDef，並把所有錯誤一次列出來，方便策劃改表。
 * 這裡只管「資料長什麼樣、哪裡寫錯」，不管培育時怎麼用（那是 NurtureSystem / MentorInspiration 的事）。
 *
 * Unity 對照：像 ScriptableObject 的 OnValidate：資料進來時就檢查欄位範圍，
 * 不合格就在編輯器（這裡是測試）直接報錯，而不是等到遊戲跑到一半才炸。
 *
 * 暫定（規格沒有寫清楚的部分）：
 *   - Friendship_Bonus / Training_Effect 是 6 格陣列，暫定依「教官星等 ★0~★5」索引；
 *     友情倍率換算成靈感引擎的小數加成：倍率 − 1（1.2 → 0.2）。
 *   - 陣列必須不遞減（星等越高效果不會變差）。
 *   - Stat_Bonus 與 Training_Slot_Affinity 用規格鍵名（STR/INT/AGI/POL/CHA），解析時對照成培育五格
 *     （STR→str、INT→int、AGI→lea、POL→pol、CHA→cha）；不認得的鍵名報錯。PM 裁定（2026-10-14，暫定）。
 *   - rarity 只檢查非空字串，稀有度對照表（R/SR/SSR…）待定。
 */
import { NURTURE_TOTAL_ROUNDS } from '../systems/NurtureSystem';
import type { TrainingKind } from '../systems/NurtureSystem';
import { MENTOR_SOURCES, MentorSource } from './MentorCard';

export const SUPPORT_MAX_STAR = 5;
/** 友情／訓練效果陣列長度：★0 ~ ★5 共 6 格 */
export const SUPPORT_STAR_TABLE_LENGTH = SUPPORT_MAX_STAR + 1;
/** 規格鍵名 → 培育五格（PM 裁定 2026-10-14，暫定） */
export const SPEC_STAT_TO_TRAINING: Readonly<Record<string, TrainingKind>> = {
    STR: 'str',
    INT: 'int',
    AGI: 'lea',
    POL: 'pol',
    CHA: 'cha',
};
export const PASSIVE_EFFECT_KINDS = ['TP_Bonus', 'Training_Rate', 'Initial_Friendship'] as const;
export type PassiveEffectKind = typeof PASSIVE_EFFECT_KINDS[number];

export interface TacticInspireEventDef {
    eventId: string;
    tacticId: string;
    /** 觸發回合區間 [起, 迄]，含端點，1 ~ NURTURE_TOTAL_ROUNDS */
    triggerWindow: readonly [number, number];
    /** 基礎觸發率 0~1 */
    baseRate: number;
    /** 最低教官星等 0 ~ 5 */
    minStar: number;
    /** 家傳戰法需要的血統代碼；沒有則為 undefined */
    bloodlineRequired?: string;
}

export interface PassiveEffectDef {
    effect: PassiveEffectKind;
    value: number;
    minStar: number;
}

export interface SupportCardDef {
    supportId: string;
    name: string;
    rarity: string;
    teachingStyle: string;
    statBonus: Partial<Record<TrainingKind, number>>;
    tacticInspireEvents: readonly TacticInspireEventDef[];
    passiveEffects: readonly PassiveEffectDef[];
    /** 友情倍率，索引 = 教官星等（1.0 = 無加成） */
    friendshipBonus: readonly number[];
    /** 訓練效果倍率，索引 = 教官星等 */
    trainingEffect: readonly number[];
    trainingSlotAffinity: readonly TrainingKind[];
    slotBurstRate: number;
    synergyPartners: readonly string[];
    synergyEventId?: string;
    source: MentorSource;
    /** 固定 TeachingOnly：教官只負責教學，不具血統親傳資格 */
    roleBoundary: 'TeachingOnly';
}

export type SupportCardParseResult =
    | { ok: true; value: SupportCardDef }
    | { ok: false; errors: string[] };

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown, min: number, max: number): value is number {
    return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function isNonDecreasing(values: readonly number[]): boolean {
    return values.every((v, i) => i === 0 || v >= values[i - 1]);
}

function parseStarTable(raw: unknown, field: string, errors: string[]): number[] {
    if (!Array.isArray(raw) || raw.length !== SUPPORT_STAR_TABLE_LENGTH) {
        errors.push(`${field} 必須是 ${SUPPORT_STAR_TABLE_LENGTH} 格陣列（★0~★${SUPPORT_MAX_STAR}）`);
        return [];
    }
    const values = raw as unknown[];
    if (!values.every((v) => isFiniteNumber(v) && v >= 1)) {
        errors.push(`${field} 每格必須是 ≥ 1 的數字（1.0 = 無加成）`);
        return [];
    }
    const numbers = values as number[];
    if (!isNonDecreasing(numbers)) errors.push(`${field} 必須依星等遞增或持平`);
    return numbers;
}

function parseInspireEvent(raw: unknown, index: number, errors: string[]): TacticInspireEventDef | null {
    const at = `Tactic_Inspire_Events[${index}]`;
    if (!isRecord(raw)) {
        errors.push(`${at} 必須是物件`);
        return null;
    }
    const before = errors.length;
    if (!isNonEmptyString(raw.Event_ID)) errors.push(`${at}.Event_ID 必須是非空字串`);
    if (!isNonEmptyString(raw.Tactic_ID)) errors.push(`${at}.Tactic_ID 必須是非空字串`);
    const triggerWindow = raw.Trigger_Window;
    if (!Array.isArray(triggerWindow) || triggerWindow.length !== 2) {
        errors.push(`${at}.Trigger_Window 必須是 [起, 迄]`);
    } else {
        const [from, to] = triggerWindow;
        if (!isInteger(from, 1, NURTURE_TOTAL_ROUNDS) || !isInteger(to, 1, NURTURE_TOTAL_ROUNDS)) {
            errors.push(`${at}.Trigger_Window 必須是 1~${NURTURE_TOTAL_ROUNDS} 的整數`);
        } else if (from > to) {
            errors.push(`${at}.Trigger_Window 起點不可大於迄點`);
        }
    }
    if (!isFiniteNumber(raw.Base_Rate) || raw.Base_Rate < 0 || raw.Base_Rate > 1) {
        errors.push(`${at}.Base_Rate 必須在 0~1 之間`);
    }
    if (!isInteger(raw.Min_Star, 0, SUPPORT_MAX_STAR)) errors.push(`${at}.Min_Star 必須是 0~${SUPPORT_MAX_STAR} 的整數`);
    if (raw.Bloodline_Required !== undefined && !isNonEmptyString(raw.Bloodline_Required)) {
        errors.push(`${at}.Bloodline_Required 若有，必須是非空字串`);
    }
    if (errors.length !== before) return null;
    const [windowFrom, windowTo] = triggerWindow as [number, number];
    return {
        eventId: raw.Event_ID as string,
        tacticId: raw.Tactic_ID as string,
        triggerWindow: [windowFrom, windowTo],
        baseRate: raw.Base_Rate as number,
        minStar: raw.Min_Star as number,
        bloodlineRequired: raw.Bloodline_Required as string | undefined,
    };
}

function parsePassive(raw: unknown, index: number, errors: string[]): PassiveEffectDef | null {
    const at = `Passive_Effects[${index}]`;
    if (!isRecord(raw)) {
        errors.push(`${at} 必須是物件`);
        return null;
    }
    const before = errors.length;
    if (!(PASSIVE_EFFECT_KINDS as readonly unknown[]).includes(raw.Effect)) {
        errors.push(`${at}.Effect 必須是 ${PASSIVE_EFFECT_KINDS.join(' / ')}`);
    }
    if (!isFiniteNumber(raw.Value)) errors.push(`${at}.Value 必須是數字`);
    if (!isInteger(raw.Min_Star, 0, SUPPORT_MAX_STAR)) errors.push(`${at}.Min_Star 必須是 0~${SUPPORT_MAX_STAR} 的整數`);
    if (errors.length !== before) return null;
    return { effect: raw.Effect as PassiveEffectKind, value: raw.Value as number, minStar: raw.Min_Star as number };
}

/**
 * 解析一張支援卡 JSON。錯誤會全部收集後一起回傳，不會只報第一個。
 * 成功時回傳的 SupportCardDef 是深拷貝後的新物件，不會改到輸入。
 */
export function parseSupportCard(raw: unknown): SupportCardParseResult {
    if (!isRecord(raw)) return { ok: false, errors: ['支援卡必須是物件'] };
    const errors: string[] = [];

    if (!isNonEmptyString(raw.Support_ID)) errors.push('Support_ID 必須是非空字串');
    if (!isNonEmptyString(raw.Name)) errors.push('Name 必須是非空字串');
    if (!isNonEmptyString(raw.Rarity)) errors.push('Rarity 必須是非空字串');
    if (!isNonEmptyString(raw.Teaching_Style)) errors.push('Teaching_Style 必須是非空字串');

    const statBonus: Partial<Record<TrainingKind, number>> = {};
    if (!isRecord(raw.Stat_Bonus)) {
        errors.push('Stat_Bonus 必須是物件（屬性鍵 → 數值）');
    } else {
        for (const [key, value] of Object.entries(raw.Stat_Bonus)) {
            const kind = SPEC_STAT_TO_TRAINING[key];
            if (!kind) errors.push(`Stat_Bonus.${key} 不認得（可用 ${Object.keys(SPEC_STAT_TO_TRAINING).join(' / ')}）`);
            else if (!isFiniteNumber(value)) errors.push(`Stat_Bonus.${key} 必須是數字`);
            else statBonus[kind] = value;
        }
    }

    const tacticInspireEvents: TacticInspireEventDef[] = [];
    if (!Array.isArray(raw.Tactic_Inspire_Events)) {
        errors.push('Tactic_Inspire_Events 必須是陣列');
    } else {
        raw.Tactic_Inspire_Events.forEach((item, i) => {
            const parsed = parseInspireEvent(item, i, errors);
            if (parsed) tacticInspireEvents.push(parsed);
        });
        const ids = tacticInspireEvents.map((e) => e.eventId);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        if (dupes.length > 0) errors.push(`Tactic_Inspire_Events 的 Event_ID 重複：${[...new Set(dupes)].join(', ')}`);
    }

    const passiveEffects: PassiveEffectDef[] = [];
    if (!Array.isArray(raw.Passive_Effects)) {
        errors.push('Passive_Effects 必須是陣列');
    } else {
        raw.Passive_Effects.forEach((item, i) => {
            const parsed = parsePassive(item, i, errors);
            if (parsed) passiveEffects.push(parsed);
        });
    }

    const friendshipBonus = parseStarTable(raw.Friendship_Bonus, 'Friendship_Bonus', errors);
    const trainingEffect = parseStarTable(raw.Training_Effect, 'Training_Effect', errors);

    const trainingSlotAffinity: TrainingKind[] = [];
    if (!Array.isArray(raw.Training_Slot_Affinity)) {
        errors.push('Training_Slot_Affinity 必須是陣列');
    } else {
        for (const key of raw.Training_Slot_Affinity) {
            const kind = typeof key === 'string' ? SPEC_STAT_TO_TRAINING[key] : undefined;
            if (!kind) errors.push(`Training_Slot_Affinity 不認得 ${String(key)}（可用 ${Object.keys(SPEC_STAT_TO_TRAINING).join(' / ')}）`);
            else trainingSlotAffinity.push(kind);
        }
    }
    if (!isFiniteNumber(raw.Slot_Burst_Rate) || raw.Slot_Burst_Rate < 0 || raw.Slot_Burst_Rate > 1) {
        errors.push('Slot_Burst_Rate 必須在 0~1 之間');
    }
    if (!Array.isArray(raw.Synergy_Partners) || !raw.Synergy_Partners.every(isNonEmptyString)) {
        errors.push('Synergy_Partners 必須是非空字串陣列');
    }
    if (raw.Synergy_Event_ID !== undefined && !isNonEmptyString(raw.Synergy_Event_ID)) {
        errors.push('Synergy_Event_ID 若有，必須是非空字串');
    }
    if (!(MENTOR_SOURCES as readonly unknown[]).includes(raw.Source)) {
        errors.push(`Source 必須是 ${MENTOR_SOURCES.join(' / ')}`);
    }
    if (raw.Role_Boundary !== 'TeachingOnly') errors.push('Role_Boundary 必須是 TeachingOnly（教官不具血統親傳資格）');

    if (errors.length > 0) return { ok: false, errors };
    return {
        ok: true,
        value: {
            supportId: raw.Support_ID as string,
            name: raw.Name as string,
            rarity: raw.Rarity as string,
            teachingStyle: raw.Teaching_Style as string,
            statBonus,
            tacticInspireEvents,
            passiveEffects,
            friendshipBonus,
            trainingEffect,
            trainingSlotAffinity,
            slotBurstRate: raw.Slot_Burst_Rate as number,
            synergyPartners: [...(raw.Synergy_Partners as string[])],
            synergyEventId: raw.Synergy_Event_ID as string | undefined,
            source: raw.Source as MentorSource,
            roleBoundary: 'TeachingOnly',
        },
    };
}

function clampStar(star: number): number {
    if (!Number.isFinite(star)) return 0;
    return Math.min(SUPPORT_MAX_STAR, Math.max(0, Math.floor(star)));
}

/** 目前星等生效的被動效果（Min_Star ≤ 星等） */
export function activePassiveEffects(def: SupportCardDef, star: number): PassiveEffectDef[] {
    const s = clampStar(star);
    return def.passiveEffects.filter((effect) => effect.minStar <= s);
}

/**
 * 友情加成的小數形式（給靈感引擎用，0.2 = +20%）。
 * 倍率表依星等索引；星等超出 0~5 會被夾住，不會丟錯。
 */
export function friendshipBonusFor(def: SupportCardDef, star: number): number {
    return def.friendshipBonus[clampStar(star)] - 1;
}
