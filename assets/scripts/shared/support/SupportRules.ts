// @spec-source → 學府支援卡與教官池規格書 (doc_spec_1264) §5.1 等級上限、§5.2 升級與材料、§22.3 support-rules.json；PROG-2-9241
/**
 * SupportRules — 支援卡的成長規則設定（等級上限、升級經驗曲線、階、經驗材料）與「材料 → 物品定義」推導（零依賴純函式庫，不 import cc）。
 *
 * 數值全部在 assets/resources/data/support-rules.json；這裡的 DEFAULT_SUPPORT_RULES 是缺檔時的後備，兩者內容必須一致（測試鎖定）。
 * 升級邏輯本身是通用的實例成長（shared/item/ItemRules 的 applyInstanceExp），這裡只負責把支援卡的規則轉成每張卡物品定義上的 growth，
 * 以及把四種材料（小抄／講義／錄播回放／學分）註冊成帶 useEffect 的物品。
 *
 * Unity 對照：像一份 LevelCurve（ScriptableObject）加幾個「經驗藥水」ItemSO 的設定表。
 */
import type { ItemDefV1, ItemGrowthRule } from '../item/ItemConfig';
import { supportCardItemDefs, type SupportCardsConfigV1, type SupportRarity } from './SupportCardConfig';

export const SUPPORT_RULES_JSON = 'data/support-rules';
export const SUPPORT_RULES_SCHEMA = 'support-rules.v1';

/** 學分（傳承滿後的溢出材料，也能當經驗材料，每個 creditExp 經驗） */
export const ITEM_SUP_CREDIT = 'ITEM_SUP_CREDIT';

export interface SupportTierDef {
    /** 從幾級起算這一階 */
    minLevel: number;
    /** 階名（初窺／入門／登堂／入室／出師），顯示與效果欄解鎖用 */
    key: string;
}

export interface SupportMaterialDef {
    itemId: string;
    /** 預設繁中名稱（語系檔未補時的後備） */
    name: string;
    nameKey: string;
    kind: 'consumable' | 'material';
    /** 每個提供的經驗 */
    exp: number;
}

export interface SupportRulesV1 {
    schema: typeof SUPPORT_RULES_SCHEMA;
    /** 各稀有度的初始等級上限 */
    cap0: Record<SupportRarity, number>;
    /** 每次傳承增加的上限 */
    capPerBreak: number;
    /** 傳承次數上限 */
    maxBreak: number;
    /** 升到下一級的經驗：base＋perLevel×(L−1) */
    expToNext: { base: number; perLevel: number };
    /** 學分當經驗材料時每個提供的經驗 */
    creditExp: number;
    /** 材料堆疊上限 */
    materialStackMax: number;
    /** 傳承滿後再抽到同一張卡，轉成的學分數量（依稀有度） */
    creditOverflow: Record<SupportRarity, number>;
    tiers: SupportTierDef[];
    /** 經驗材料（小抄、講義、錄播回放）；學分由 creditExp 推導，不在這裡列 */
    materials: SupportMaterialDef[];
}

export const DEFAULT_SUPPORT_RULES: SupportRulesV1 = Object.freeze({
    schema: SUPPORT_RULES_SCHEMA,
    cap0: { R: 20, SR: 25, SSR: 30 },
    capPerBreak: 5,
    maxBreak: 4,
    expToNext: { base: 100, perLevel: 40 },
    creditExp: 20,
    materialStackMax: 9999,
    creditOverflow: { R: 5, SR: 20, SSR: 60 },
    tiers: [
        { minLevel: 1, key: '初窺' }, { minLevel: 10, key: '入門' }, { minLevel: 20, key: '登堂' },
        { minLevel: 30, key: '入室' }, { minLevel: 40, key: '出師' },
    ],
    materials: [
        { itemId: 'ITEM_SUP_EXP_S', name: '小抄', nameKey: 'item.ITEM_SUP_EXP_S.name', kind: 'consumable', exp: 100 },
        { itemId: 'ITEM_SUP_EXP_M', name: '講義', nameKey: 'item.ITEM_SUP_EXP_M.name', kind: 'consumable', exp: 500 },
        { itemId: 'ITEM_SUP_EXP_L', name: '錄播回放', nameKey: 'item.ITEM_SUP_EXP_L.name', kind: 'consumable', exp: 2000 },
    ],
}) as SupportRulesV1;

function isPosInt(v: unknown): v is number {
    return typeof v === 'number' && Number.isInteger(v) && v > 0;
}

function isNonNegInt(v: unknown): v is number {
    return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/**
 * 讀進來的 JSON 逐欄檢查；缺欄位或壞值的欄位用預設補，壞條目丟掉；整份不是物件時回預設。不丟例外。
 */
export function normalizeSupportRules(raw: unknown): SupportRulesV1 {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_SUPPORT_RULES;
    const src = raw as Record<string, unknown>;
    const d = DEFAULT_SUPPORT_RULES;
    const cap = (src.cap0 ?? {}) as Record<string, unknown>;
    const exp = (src.expToNext ?? {}) as Record<string, unknown>;
    const overflow = (src.creditOverflow ?? {}) as Record<string, unknown>;
    const tiers: SupportTierDef[] = [];
    for (const t of Array.isArray(src.tiers) ? src.tiers : []) {
        const e = t as Record<string, unknown> | null;
        if (e && isPosInt(e.minLevel) && typeof e.key === 'string' && e.key.length > 0) tiers.push({ minLevel: e.minLevel, key: e.key });
    }
    tiers.sort((a, b) => a.minLevel - b.minLevel);
    const materials: SupportMaterialDef[] = [];
    const seen = new Set<string>();
    for (const m of Array.isArray(src.materials) ? src.materials : []) {
        const e = m as Record<string, unknown> | null;
        if (!e || typeof e.itemId !== 'string' || e.itemId.length === 0 || seen.has(e.itemId) || e.itemId === ITEM_SUP_CREDIT) continue;
        if (!isPosInt(e.exp) || typeof e.name !== 'string' || e.name.length === 0) continue;
        seen.add(e.itemId);
        materials.push({
            itemId: e.itemId, name: e.name, nameKey: typeof e.nameKey === 'string' && e.nameKey.length > 0 ? e.nameKey : `item.${e.itemId}.name`,
            kind: e.kind === 'material' ? 'material' : 'consumable', exp: e.exp,
        });
    }
    return {
        schema: SUPPORT_RULES_SCHEMA,
        cap0: { R: isPosInt(cap.R) ? cap.R : d.cap0.R, SR: isPosInt(cap.SR) ? cap.SR : d.cap0.SR, SSR: isPosInt(cap.SSR) ? cap.SSR : d.cap0.SSR },
        capPerBreak: isPosInt(src.capPerBreak) ? src.capPerBreak : d.capPerBreak,
        maxBreak: isNonNegInt(src.maxBreak) ? src.maxBreak : d.maxBreak,
        expToNext: { base: isPosInt(exp.base) ? exp.base : d.expToNext.base, perLevel: isNonNegInt(exp.perLevel) ? exp.perLevel : d.expToNext.perLevel },
        creditExp: isPosInt(src.creditExp) ? src.creditExp : d.creditExp,
        materialStackMax: isPosInt(src.materialStackMax) ? src.materialStackMax : d.materialStackMax,
        creditOverflow: {
            R: isPosInt(overflow.R) ? overflow.R : d.creditOverflow.R, SR: isPosInt(overflow.SR) ? overflow.SR : d.creditOverflow.SR,
            SSR: isPosInt(overflow.SSR) ? overflow.SSR : d.creditOverflow.SSR,
        },
        tiers: tiers.length > 0 ? tiers : d.tiers.map((t) => ({ ...t })),
        materials: materials.length > 0 ? materials : d.materials.map((m) => ({ ...m })),
    };
}

/** 抽到（或領到）一張支援卡時的處置：入學／傳承＋1／傳承已滿轉學分 */
export type SupportDuplicatePlan =
    | { action: 'enroll' }
    | { action: 'limitBreak'; limitBreak: number }
    | { action: 'credit'; qty: number };

/**
 * 重複卡的處置（doc_spec_1264 §5.3、§5.4；純函式）：沒持有→入學；持有且傳承未滿→傳承 +1；傳承已滿→依稀有度轉成學分。
 * held＝是否已持有；limitBreak＝現有傳承次數（未持有時忽略）。
 */
export function planSupportDuplicate(rules: SupportRulesV1, rarity: SupportRarity, held: boolean, limitBreak: number): SupportDuplicatePlan {
    if (!held) return { action: 'enroll' };
    if (limitBreak < rules.maxBreak) return { action: 'limitBreak', limitBreak: limitBreak + 1 };
    return { action: 'credit', qty: rules.creditOverflow[rarity] };
}

/** 一張該稀有度的卡適用的成長規則 */
export function supportGrowthRule(rules: SupportRulesV1, rarity: SupportRarity): ItemGrowthRule {
    return {
        cap0: rules.cap0[rarity], capPerBreak: rules.capPerBreak, maxBreak: rules.maxBreak,
        expBase: rules.expToNext.base, expPerLevel: rules.expToNext.perLevel,
    };
}

/** 等級所在的階（初窺…出師）；等級低於第一階時取第一階 */
export function supportTierOf(rules: SupportRulesV1, level: number): string {
    let key = rules.tiers[0]?.key ?? '';
    for (const t of rules.tiers) if (level >= t.minLevel) key = t.key;
    return key;
}

/** 材料物品定義：可疊加、不綁定、不折金、帶 useEffect（item.use 把經驗加到支援卡）；含學分 */
export function supportMaterialItemDefs(rules: SupportRulesV1): ItemDefV1[] {
    const base = { stack: { mode: 'stackable' as const, max: rules.materialStackMax }, bind: 'none' as const, overflow: null, rarity: 1 };
    const defs: ItemDefV1[] = rules.materials.map((m) => ({
        id: m.itemId, kind: m.kind, ...base, useEffect: { effectType: 'supportExp' as const, exp: m.exp },
    }));
    defs.push({ id: ITEM_SUP_CREDIT, kind: 'material', ...base, useEffect: { effectType: 'supportExp' as const, exp: rules.creditExp } });
    return defs;
}

/**
 * 把支援卡與經驗材料的物品定義併入物品設定：卡帶 growth（依稀有度的等級上限與經驗曲線），材料帶 useEffect。
 * 同 id 以這裡推導的為準、其餘保留；載入時（任何一份設定重載後）呼叫。卡與材料都不在 item-config.json 重複列。
 */
export function withSupportItems<T extends { items: ItemDefV1[] }>(itemConfig: T, cards: SupportCardsConfigV1, rules: SupportRulesV1): T {
    const rarityOf = new Map(cards.cards.map((c) => [c.itemId, c.rarity] as const));
    const defs: ItemDefV1[] = supportCardItemDefs(cards).map((d) => {
        const rarity = rarityOf.get(d.id);
        return rarity ? { ...d, growth: supportGrowthRule(rules, rarity) } : d;
    });
    defs.push(...supportMaterialItemDefs(rules));
    const ids = new Set(defs.map((d) => d.id));
    return { ...itemConfig, items: [...itemConfig.items.filter((d) => !ids.has(d.id)), ...defs] };
}
