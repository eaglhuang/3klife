// @spec-source → 學府支援卡與教官池規格書 (doc_spec_1264) §4.2 卡片資料、§19 物品化、§22.1 檔案；物品庫存 Base (doc_spec_1184)；PROG-2-9240
/**
 * SupportCardConfig — 學府支援卡（頭盔連線卡）的資料型別、讀檔正規化與「卡 → 物品定義」推導（零依賴純函式庫，不 import cc）。
 *
 * 支援卡是物品的一種：不另建庫存。25 張卡的資料寫在 assets/resources/data/academy-support-cards.json（舊的 support-cards.json 是舊版支援卡／紅顏池資料，仍被舊系統讀取，故新檔另名；規格 §22.1 寫 support-cards.json，改名待決）。
 * 物品定義（category=supportCard、kind=card、unique、bind=household、usage=academyOnly、instanceState）
 * 由這裡的 supportCardItemDefs 從卡片資料推導並併入物品設定，所以「有哪些卡」只有一份真相。
 *
 * Unity 對照：像一份 CardDatabase（ScriptableObject）加一個在載入時把每張卡註冊進 ItemDatabase 的 Editor 腳本。
 */
import type { ItemDefV1, ItemInstanceState } from '../item/ItemConfig';

export type SupportRarity = 'R' | 'SR' | 'SSR';
export const SUPPORT_RARITIES: readonly SupportRarity[] = Object.freeze(['R', 'SR', 'SSR']);

/** sage＝歷史名師名士；general＝武將特別版；beauty＝紅顏教官（doc_spec_1264 §4.1） */
export type SupportKind = 'sage' | 'general' | 'beauty';
export const SUPPORT_KINDS: readonly SupportKind[] = Object.freeze(['sage', 'general', 'beauty']);

/** 主屬性；陣映射統率、醫映射體力上限、藝映射魅力（映射由學府結算讀取，這裡只存分類） */
export type SupportFocus = '武' | '智' | '統' | '政' | '魅' | '陣' | '醫' | '藝';
export const SUPPORT_FOCUSES: readonly SupportFocus[] = Object.freeze(['武', '智', '統', '政', '魅', '陣', '醫', '藝']);

export type SupportCourse = '武' | '文' | '兵法' | '禮樂' | '午睡';
export const SUPPORT_COURSES: readonly SupportCourse[] = Object.freeze(['武', '文', '兵法', '禮樂', '午睡']);

export type SupportSchool = '水鏡門下' | '鄭學' | '黃老' | '兵家' | '散修';
export const SUPPORT_SCHOOLS: readonly SupportSchool[] = Object.freeze(['水鏡門下', '鄭學', '黃老', '兵家', '散修']);

/** A 專科／B 羈絆／C 養生／D 點撥：決定三個效果欄的種類（doc_spec_1264 §6.2） */
export type SupportRole = 'A' | 'B' | 'C' | 'D';
export const SUPPORT_ROLES: readonly SupportRole[] = Object.freeze(['A', 'B', 'C', 'D']);

/** 固定值：支援卡不出征、不上戰場、不進出征編制 */
export const SUPPORT_USAGE = 'academyOnly' as const;
export const SUPPORT_CARD_CATEGORY = 'supportCard';
export const SUPPORT_CARDS_JSON = 'data/academy-support-cards';
export const SUPPORT_CARD_SCHEMA = 'support-card.v1';
export const SUPPORT_CARDS_FILE_SCHEMA = 'support-cards.v1';
export const SUPPORT_ITEM_PREFIX = 'ITEM_SUPCARD_';
export const SUPPORT_CARD_PREFIX = 'SUP_';

/** 物品稀有度：R 1、SR 2、SSR 3（doc_spec_1264 §19 範例 SSR＝3） */
export const SUPPORT_ITEM_RARITY: Readonly<Record<SupportRarity, number>> = Object.freeze({ R: 1, SR: 2, SSR: 3 });

export interface SupportCardV1 {
    schema: typeof SUPPORT_CARD_SCHEMA;
    cardId: string;
    itemId: string;
    kind: SupportKind;
    rarity: SupportRarity;
    /** 投影的人物 id（名冊內有同一人時填，用於「本尊駕到」並存規則）；沒有為 null */
    projectionOf: string | null;
    focus: SupportFocus;
    favoredCourse: SupportCourse;
    school: SupportSchool;
    role: SupportRole;
    /** 主欄倍率 0.9～1.1，做同稀有度的差異 */
    mult: number;
    /** 點撥的學府戰法 id（兩招） */
    hintTactics: [string, string];
    /** 連續事件 id：SUPEVT_<cardId 去前綴>_1..n */
    events: string[];
    /** 預設繁中名稱（語系檔未補時的後備；正式文案走 nameKey） */
    name: string;
    nameKey: string;
    introKey: string;
    artKey: string;
    usage: typeof SUPPORT_USAGE;
}

export interface SupportCardsConfigV1 {
    schema: typeof SUPPORT_CARDS_FILE_SCHEMA;
    cards: SupportCardV1[];
}

export const DEFAULT_SUPPORT_CARDS_CONFIG: SupportCardsConfigV1 = Object.freeze({ schema: SUPPORT_CARDS_FILE_SCHEMA, cards: [] }) as SupportCardsConfigV1;

/** SUP_SIMA_HUI → ITEM_SUPCARD_SIMA_HUI */
export function supportItemIdOf(cardId: string): string {
    return `${SUPPORT_ITEM_PREFIX}${cardId.startsWith(SUPPORT_CARD_PREFIX) ? cardId.slice(SUPPORT_CARD_PREFIX.length) : cardId}`;
}

function oneOf<T extends string>(list: readonly T[], v: unknown): v is T {
    return typeof v === 'string' && (list as readonly string[]).indexOf(v) >= 0;
}

function nonEmpty(v: unknown): v is string {
    return typeof v === 'string' && v.length > 0;
}

/**
 * 讀進來的 JSON 逐張檢查；壞掉的卡丟掉（欄位不合法、itemId 與 cardId 對不上、重複 cardId），
 * 整份不是物件時回空設定。不丟例外：設定壞了不能讓遊戲開不起來（比照其他 normalize*）。
 */
export function normalizeSupportCards(raw: unknown): SupportCardsConfigV1 {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_SUPPORT_CARDS_CONFIG;
    const list = (raw as Record<string, unknown>).cards;
    const cards: SupportCardV1[] = [];
    const seen = new Set<string>();
    for (const entry of Array.isArray(list) ? list : []) {
        const e = entry as Record<string, unknown> | null;
        if (!e || !nonEmpty(e.cardId) || !e.cardId.startsWith(SUPPORT_CARD_PREFIX) || seen.has(e.cardId)) continue;
        if (!oneOf(SUPPORT_KINDS, e.kind) || !oneOf(SUPPORT_RARITIES, e.rarity) || !oneOf(SUPPORT_FOCUSES, e.focus)) continue;
        if (!oneOf(SUPPORT_COURSES, e.favoredCourse) || !oneOf(SUPPORT_SCHOOLS, e.school) || !oneOf(SUPPORT_ROLES, e.role)) continue;
        if (typeof e.mult !== 'number' || !(e.mult >= 0.9 && e.mult <= 1.1)) continue;
        if (!Array.isArray(e.hintTactics) || e.hintTactics.length !== 2 || !e.hintTactics.every(nonEmpty)) continue;
        if (!Array.isArray(e.events) || !e.events.every(nonEmpty)) continue;
        if (!nonEmpty(e.name) || !nonEmpty(e.nameKey) || !nonEmpty(e.introKey) || !nonEmpty(e.artKey)) continue;
        if (e.itemId !== supportItemIdOf(e.cardId)) continue;
        // general、beauty 必填投影人物（doc_spec_1264 §4.2）
        const projectionOf = nonEmpty(e.projectionOf) ? e.projectionOf : null;
        if (e.kind !== 'sage' && projectionOf === null) continue;
        seen.add(e.cardId);
        cards.push({
            schema: SUPPORT_CARD_SCHEMA, cardId: e.cardId, itemId: e.itemId as string, kind: e.kind, rarity: e.rarity, projectionOf,
            focus: e.focus, favoredCourse: e.favoredCourse, school: e.school, role: e.role, mult: e.mult,
            hintTactics: [e.hintTactics[0], e.hintTactics[1]], events: [...(e.events as string[])],
            name: e.name, nameKey: e.nameKey, introKey: e.introKey, artKey: e.artKey, usage: SUPPORT_USAGE,
        });
    }
    return { schema: SUPPORT_CARDS_FILE_SCHEMA, cards };
}

/** 新實例的初始狀態：Lv1、經驗 0、傳承 0 */
export const SUPPORT_INSTANCE_DEFAULT: Readonly<ItemInstanceState> = Object.freeze({ level: 1, exp: 0, limitBreak: 0 });

/** 一張卡對應的物品定義：kind=card、unique（max 1）、綁家庭倉庫、不折金、academyOnly、帶實例狀態 */
export function supportCardItemDef(card: SupportCardV1): ItemDefV1 {
    return {
        id: card.itemId, kind: 'card', stack: { mode: 'unique', max: 1 }, bind: 'household', overflow: null,
        category: SUPPORT_CARD_CATEGORY, usage: SUPPORT_USAGE, rarity: SUPPORT_ITEM_RARITY[card.rarity],
        instanceState: { ...SUPPORT_INSTANCE_DEFAULT },
    };
}

export function supportCardItemDefs(config: SupportCardsConfigV1): ItemDefV1[] {
    return config.cards.map(supportCardItemDef);
}

export function findSupportCard(config: SupportCardsConfigV1, cardIdOrItemId: string): SupportCardV1 | null {
    return config.cards.find((c) => c.cardId === cardIdOrItemId || c.itemId === cardIdOrItemId) ?? null;
}

/**
 * 把支援卡的物品定義併入物品設定（同 id 以支援卡為準、其餘保留）。
 * 載入時呼叫一次；物品設定裡手寫的同 id 條目不應存在，有的話被覆蓋。
 */
export function withSupportCardItems<T extends { items: ItemDefV1[] }>(itemConfig: T, cards: SupportCardsConfigV1): T {
    const defs = supportCardItemDefs(cards);
    if (defs.length === 0) return itemConfig;
    const ids = new Set(defs.map((d) => d.id));
    return { ...itemConfig, items: [...itemConfig.items.filter((d) => !ids.has(d.id)), ...defs] };
}
