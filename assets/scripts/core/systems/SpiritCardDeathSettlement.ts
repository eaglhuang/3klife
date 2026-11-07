// @spec-source → 英靈世家系統 (doc_spec_0022) §A-1、§D-1 誕生條件、§D-2 唯一性、§D-3 覆蓋、§I-2 Data Schema；WBS SPI-02；PROG-2-2078
/**
 * SpiritCardDeathSettlement — 名將死亡結算時產生英靈卡（純邏輯，不依賴 cc）。
 *
 * - §D-1：只處理這次才變成陣亡的名將；非名將不產卡；生前已退役（教官）仍補發。
 * - §D-2／D-3：同模板已有英靈卡就交給 SpiritCardMerge.upsertSpiritCard 覆蓋，不新增第二張。
 * - 產出的是統一物件庫的 SPIRIT_CARD 列（InventoryProjection 能投影成 SpiritCardEntry）。
 *
 * 暫定：
 * - 「名將」以 characterCategory 為 famed／mythical／titled 判定。
 * - Spirit_Family_Key 取模板 id 的第一段轉大寫（zhao-yun → FAMILY_ZHAO），對齊 §I-2 範例。
 * - 本次死亡貢獻的 LineageScore 暫用五維（武智統政魅）總和，規格只給累加公式未給貢獻值。
 * - 新卡放陳列室（CLAN_RELIC）、副卡、非家族主卡（只寫 isPrimary，PROG-2-1971）；依 §E-3 允許雙卡同裝。
 * Unity 對照：像死亡事件的 handler 往背包 upsert 一筆 ScriptableObject 實例。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { GENERAL_STATUS_DEAD } from './GeneralAging';
import type { InventoryRecord } from './InventoryProjection';
import { upsertSpiritCard } from './SpiritCardMerge';

/** 視為「名將」、死亡必出英靈卡的角色分類（暫定） */
export const SPIRIT_CARD_CATEGORIES: readonly string[] = ['famed', 'mythical', 'titled'];

/** 死亡快照保存的核心數值欄位 */
export const SPIRIT_CARD_STAT_KEYS = ['str', 'int', 'lea', 'pol', 'cha'] as const;

type DeathCandidate = Pick<GeneralConfig, 'id' | 'templateId' | 'characterCategory' | 'rarityTier'>
    & Partial<Pick<GeneralConfig, (typeof SPIRIT_CARD_STAT_KEYS)[number]>>
    & { status?: string; isMentorCard?: boolean };

function isDead(general: DeathCandidate): boolean {
    return (general.status ?? '').toLowerCase() === GENERAL_STATUS_DEAD;
}

export function isSpiritCardEligible(general: Pick<GeneralConfig, 'characterCategory'>): boolean {
    return !!general.characterCategory && SPIRIT_CARD_CATEGORIES.includes(general.characterCategory);
}

export function spiritFamilyKeyOf(templateId: string): string {
    return `FAMILY_${(templateId.split(/[-_]/)[0] || templateId).toUpperCase()}`;
}

export function spiritCardIdOf(templateId: string): string {
    return `SPIRIT_${templateId}`;
}

/** 依死亡快照組英靈卡列 */
export function buildDeathSpiritCard(general: DeathCandidate): InventoryRecord {
    const templateId = general.templateId ?? general.id;
    const stats: Record<string, number> = {};
    for (const key of SPIRIT_CARD_STAT_KEYS) {
        const value = general[key];
        if (typeof value === 'number' && Number.isFinite(value)) stats[key] = value;
    }
    return {
        Inventory_ID: spiritCardIdOf(templateId),
        Item_Type: 'SPIRIT_CARD',
        Slot_Type: 'DESTINY',
        Bound_General_UID: null,
        Quantity: 1,
        Quality: general.rarityTier ?? 'common',
        Source_Type: 'DeathSettlement',
        Display_Bucket: 'CLAN_RELIC',
        Is_Displayed: true,
        isPrimary: false,
        Attributes: {
            General_Template_ID: templateId,
            Spirit_Family_Key: spiritFamilyKeyOf(templateId),
            LineageScore: Object.values(stats).reduce((sum, v) => sum + v, 0),
            Card_Role: 'BACKUP',
            DualEquip_Allowed: true,
            Has_Retired_Before: general.isMentorCard === true,
            Final_Stats: stats,
        },
    };
}

export interface SpiritCardDeathResult {
    records: InventoryRecord[];
    /** 新增英靈卡的模板 id */
    produced: string[];
    /** 覆蓋既有英靈卡的模板 id */
    merged: string[];
}

/** 只處理 alive → dead 的名將；同一武將重複呼叫不會重複結算（before 已陣亡就略過） */
export function settleDeathSpiritCards(
    records: readonly InventoryRecord[],
    before: readonly DeathCandidate[],
    after: readonly DeathCandidate[],
): SpiritCardDeathResult {
    const wasDead = new Set(before.filter(isDead).map((g) => g.id));
    let next = [...records];
    const produced: string[] = [];
    const merged: string[] = [];
    for (const general of after) {
        if (!isDead(general) || wasDead.has(general.id) || !isSpiritCardEligible(general)) continue;
        const result = upsertSpiritCard(next, buildDeathSpiritCard(general));
        next = result.records;
        (result.merged ? merged : produced).push(general.templateId ?? general.id);
    }
    return { records: next, produced, merged };
}
