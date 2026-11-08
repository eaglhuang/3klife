// @spec-source → 育成與戰鬥公式基準手冊 第六章 6.1 教官卡四大核心設計原型；WBS FORM-04；PROG-2-2087、PROG-2-2092
/**
 * MentorArchetype — 教官支援卡的四大設計原型與公式干預點（純邏輯，不依賴 cc）。
 *
 * - 數值炮台型 STAT_STICK：高得意率＋高傾囊相授爆發，堆單項極限屬性。
 * - 戰法大核型 SKILL_BANK：戰法啟發多、本身屬性加成低。
 * - 資源調度型 RESOURCE：無專精設施，靠體力減免／回復運勢維持訓練節奏，不觸發傾囊相授。
 * - 集團體系型 GROUP：多角色共綁，帶專屬連動事件（全局光環）。
 *
 * 判定依特徵（裁決 2026-11-08），不比屬性總值；照 MENTOR_ARCHETYPE_ORDER 取第一個成立的原型：
 * - 資源調度：有體力減免（VITALITY_SAVE），或無專精設施。
 * - 戰法大核：金戰法啟發率 ≥ 20%，或戰法 TP 折扣 ≥ 30%。
 * - 集團體系：至少 2 位羈絆夥伴，或有連動事件（全局光環）。
 * - 其餘為數值炮台。
 * 暫定：
 * - 卡資料沒有金戰法標記，先把帶血統需求的家傳戰法事件視為金戰法。
 * - 「多武將」取至少 2 位夥伴：現有卡多半只有 1 位（呂布也是），算進去會違背裁決「呂布為數值炮台」。
 * - TP 折扣先讀 TP_Bonus 被動；VITALITY_SAVE 目前只影響分類，培育公式尚未讀取。
 * - 範例卡沿用規格 6.1 的情境範例（呂布／郭嘉／荀彧／桃園結義），尚未有正式卡資料。
 * Unity 對照：像一張 ScriptableObject 的分類規則表，UI 和平衡工具都只查表。
 */
import type { PassiveEffectKind, SupportCardDef } from '../models/MentorSupportSchema';

export const MENTOR_ARCHETYPES = ['RESOURCE', 'SKILL_BANK', 'GROUP', 'STAT_STICK'] as const;
export type MentorArchetype = typeof MENTOR_ARCHETYPES[number];

/** 判定先後依裁決：資源調度 → 戰法大核 → 集團體系，數值炮台是預設 */
export const MENTOR_ARCHETYPE_ORDER: readonly MentorArchetype[] = MENTOR_ARCHETYPES;

export const MENTOR_ARCHETYPE_THRESHOLDS = {
    /** 戰法大核：金戰法啟發率下限 */
    skillBankMinGoldInspireRate: 0.2,
    /** 戰法大核：戰法 TP 折扣下限 */
    skillBankMinTpDiscount: 0.3,
    /** 集團體系：多武將羈絆至少幾位夥伴 */
    groupMinPartners: 2,
} as const;

export interface MentorArchetypeDef {
    id: MentorArchetype;
    label: string;
    /** 規格 6.1「設計邏輯與公式干預點」 */
    logic: string;
    /** 在培育公式中介入的 SupportCardDef 欄位 */
    interventionFields: readonly (keyof SupportCardDef)[];
    /** 規格 6.1 情境範例 */
    example: string;
}

export const MENTOR_ARCHETYPE_DEFS: Readonly<Record<MentorArchetype, MentorArchetypeDef>> = {
    STAT_STICK: {
        id: 'STAT_STICK',
        label: '數值炮台型',
        logic: '高教學頻率＋極高傾囊相授加成，堆出單項極限屬性',
        interventionFields: ['trainingSlotAffinity', 'slotBurstRate', 'statBonus', 'trainingEffect'],
        example: '武力教官・呂布：在騎術營爆發 +40 STR',
    },
    SKILL_BANK: {
        id: 'SKILL_BANK',
        label: '戰法大核型',
        logic: '高戰法啟發率＋戰法 TP 折扣，本身不提供高屬性',
        interventionFields: ['tacticInspireEvents', 'passiveEffects'],
        example: '策略教官・郭嘉：提供絕版戰法，TP 折扣 60%',
    },
    RESOURCE: {
        id: 'RESOURCE',
        label: '資源調度型',
        logic: '無專精設施，降低體力損耗並回復運勢；不觸發傾囊相授',
        interventionFields: ['passiveEffects', 'friendshipBonus'],
        example: '後勤教官・荀彧：同行訓練體力消耗 -25%，固定回復士氣',
    },
    GROUP: {
        id: 'GROUP',
        label: '集團體系型',
        logic: '多角色共綁，條件達成後提供全局常駐光環',
        interventionFields: ['synergyPartners', 'synergyEventId'],
        example: '桃園結義卡：情義計量表集滿後 3 回合訓練大成功率 100%',
    },
};

/** 舊存檔或測試假資料可能缺欄位：缺 trainingSlotAffinity 不視為「無專精」，其餘缺值當空 */
type ArchetypeSource = Pick<SupportCardDef, 'passiveEffects' | 'tacticInspireEvents' | 'trainingSlotAffinity' | 'synergyPartners' | 'synergyEventId'>;

function passiveValue(def: ArchetypeSource, effect: PassiveEffectKind): number {
    return Math.max(0, ...(def.passiveEffects ?? []).filter((p) => p.effect === effect).map((p) => p.value));
}

const RULES: Readonly<Record<MentorArchetype, (def: ArchetypeSource) => boolean>> = {
    RESOURCE: (def) => passiveValue(def, 'VITALITY_SAVE') > 0
        || (Array.isArray(def.trainingSlotAffinity) && def.trainingSlotAffinity.length === 0),
    SKILL_BANK: (def) => passiveValue(def, 'TP_Bonus') >= MENTOR_ARCHETYPE_THRESHOLDS.skillBankMinTpDiscount
        || (def.tacticInspireEvents ?? []).some((event) => !!event.bloodlineRequired && event.baseRate >= MENTOR_ARCHETYPE_THRESHOLDS.skillBankMinGoldInspireRate),
    GROUP: (def) => !!def.synergyEventId || (def.synergyPartners?.length ?? 0) >= MENTOR_ARCHETYPE_THRESHOLDS.groupMinPartners,
    STAT_STICK: () => true,
};

export function classifyMentorArchetype(def: ArchetypeSource): MentorArchetype {
    return MENTOR_ARCHETYPE_ORDER.find((id) => RULES[id](def)) ?? 'STAT_STICK';
}

/** 卡池原型分布（平衡盤點用）：每個原型都列出，沒有卡的為 0 */
export function mentorArchetypeCounts(defs: Iterable<ArchetypeSource>): Record<MentorArchetype, number> {
    const counts = Object.fromEntries(MENTOR_ARCHETYPES.map((id) => [id, 0])) as Record<MentorArchetype, number>;
    for (const def of defs) counts[classifyMentorArchetype(def)] += 1;
    return counts;
}
