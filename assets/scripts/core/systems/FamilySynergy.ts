// @spec-source → 血統傳承G3三代深淵_外戚純化與世交合譜規格書.md §E #4、§F-2、§H UI_G3_SYNERGY_K_WINDOW、§I；G4 §F-1 高門條件；PROG-2-1812
/**
 * FamilySynergy — 世交相性 K 的定長滑動窗（純邏輯，不依賴 cc）
 *
 * 取兩家最近 8 名滿 18 歲結算子代：信心 min(1, n/4)，品質看平滑後的成材比例，K = 信心 × 品質。
 * K 不碰先天能力與傳星機率；世交合譜與世交太傅還沒做，目前只顯示並用於高門檢定。
 * 暫定（可逆）：規格沒定「成材」的門檻，這裡用地方豪族同一條 EP 60。
 * 暫定（可逆）：規格公式印的分母 0.30 與它自己的例子不合（4/4、5/6、6/8 都寫滿額，而 0.30 下 5/6 只有 83%、6/8 只有 67%），
 * 這裡用 0.20，規格列出的例子全部成立。
 * 暫定（可逆）：§I 的「提親禮金折扣」目前沒有玩家出錢提親的流程，名門上門時改為加厚聘禮；累計 8 名成材才稱百年世交。
 *
 * Unity 對照：像存在 ScriptableObject 的環形緩衝區，用一個 byte 當位元遮罩。
 */
import type { GeneralConfig } from '../models/GeneralUnit';

export const PLAYER_FAMILY_UID = 'FAM_PLAYER_001';
export const SYNERGY_WINDOW = 8;
export const SYNERGY_QUALIFIED_EP = 60;
export const SYNERGY_ADULT_AGE = 18;
/** 4 胎即滿信心 */
const FULL_CONFIDENCE_SAMPLES = 4;
const QUALITY_FLOOR = 0.5;
const QUALITY_SPAN = 0.2;
const WINDOW_MASK = (1 << SYNERGY_WINDOW) - 1;
/** 世交太傅伴讀的修業效率上限（§F-2 作用面限制） */
export const SYNERGY_TUTOR_MAX_BONUS = 0.15;
export const CENTURY_ALLIANCE_QUALIFIED = 8;
const ALLIANCE_GIFT_PER_QUALIFIED = 0.05;
const ALLIANCE_GIFT_MAX_RATE = 0.5;

export interface FamilyPairRecord {
    /** Recent_8_Bitmap：最低位是最新一名，1 為成材 */
    recentBitmap: number;
    /** Recent_8_Count：窗內樣本數 */
    recentCount: number;
    /** Lifetime_Qualified_Total：只供敘事與提親優待，不混入 K */
    lifetimeQualified: number;
}

export interface FamilySynergyLedger {
    pairs: Record<string, FamilyPairRecord>;
    /** 已結算的子嗣；每人只結算一次 */
    finalizedIds: string[];
}

type SynergyGeneral = GeneralConfig & { fatherId?: string; motherId?: string; familyUid?: string };

export function emptyFamilySynergyLedger(): FamilySynergyLedger {
    return { pairs: {}, finalizedIds: [] };
}

/** 排序後的無序配對鍵 */
export function familyPairKey(a: string, b: string): string {
    return a < b ? `${a}__${b}` : `${b}__${a}`;
}

export function recordFinalizedChild(record: FamilyPairRecord | undefined, qualified: boolean): FamilyPairRecord {
    const previous = record ?? { recentBitmap: 0, recentCount: 0, lifetimeQualified: 0 };
    return {
        recentBitmap: ((previous.recentBitmap << 1) | (qualified ? 1 : 0)) & WINDOW_MASK,
        recentCount: Math.min(SYNERGY_WINDOW, previous.recentCount + 1),
        lifetimeQualified: previous.lifetimeQualified + (qualified ? 1 : 0),
    };
}

function qualifiedInWindow(record: FamilyPairRecord): number {
    let count = 0;
    for (let bit = 0; bit < record.recentCount; bit++) if ((record.recentBitmap >> bit) & 1) count++;
    return count;
}

export function synergyKOf(record: FamilyPairRecord | undefined): number {
    if (!record || record.recentCount <= 0) return 0;
    const confidence = Math.min(1, record.recentCount / FULL_CONFIDENCE_SAMPLES);
    const smooth = (qualifiedInWindow(record) + 1) / (record.recentCount + 2);
    return confidence * Math.min(1, Math.max(0, smooth - QUALITY_FLOOR) / QUALITY_SPAN);
}

/** 把已滿 18 歲、父母之一來自聯姻名門的子嗣結算進滑動窗；名冊順序不影響結果 */
export function finalizeAdultChildren(ledger: FamilySynergyLedger, roster: readonly GeneralConfig[]): FamilySynergyLedger {
    const generals = roster as readonly SynergyGeneral[];
    const familyOf = (parentId: string | undefined): string | undefined => (parentId ? generals.find((g) => g.id === parentId)?.familyUid : undefined);
    const fresh = generals
        .filter((g) => (g.age ?? 0) >= SYNERGY_ADULT_AGE && ledger.finalizedIds.indexOf(g.id) < 0 && !!(familyOf(g.fatherId) ?? familyOf(g.motherId)))
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (fresh.length === 0) return ledger;
    const pairs = { ...ledger.pairs };
    for (const child of fresh) {
        const key = familyPairKey(PLAYER_FAMILY_UID, (familyOf(child.fatherId) ?? familyOf(child.motherId)) as string);
        pairs[key] = recordFinalizedChild(pairs[key], (child.ep ?? 0) >= SYNERGY_QUALIFIED_EP);
    }
    return { pairs, finalizedIds: [...ledger.finalizedIds, ...fresh.map((g) => g.id)] };
}

/** 滿額相性的世家數，給 G4 高門檢定 */
export function fullSynergyAlliesOf(ledger: FamilySynergyLedger): number {
    return Object.keys(ledger.pairs).filter((key) => synergyKOf(ledger.pairs[key]) >= 1).length;
}

/** 兩家累計成材人數；不影響 K */
export function lifetimeQualifiedOf(family: string, ledger: FamilySynergyLedger | undefined): number {
    return ledger?.pairs[familyPairKey(PLAYER_FAMILY_UID, family)]?.lifetimeQualified ?? 0;
}

export function allianceGiftBonus(baseGold: number, lifetimeQualified: number): number {
    return Math.round(baseGold * Math.min(ALLIANCE_GIFT_MAX_RATE, ALLIANCE_GIFT_PER_QUALIFIED * lifetimeQualified));
}

export function isCenturyAlliance(lifetimeQualified: number): boolean {
    return lifetimeQualified >= CENTURY_ALLIANCE_QUALIFIED;
}

/** 結緣畫面用的短稱號；未達門檻時回傳 null */
export function centuryAllianceTag(father: { familyUid?: string }, mother: { familyUid?: string }, ledger: FamilySynergyLedger): string | null {
    const family = father.familyUid ?? mother.familyUid;
    if (!family) return null;
    const total = lifetimeQualifiedOf(family, ledger);
    return isCenturyAlliance(total) ? `百年世交：累計成材 ${total} 名` : null;
}

/** UI_G3_SYNERGY_K_WINDOW；雙親都不是聯姻名門時回傳 null。合譜與太傅還沒做，先不寫規格句尾的括號 */
export function synergyWindowLine(father: { familyUid?: string }, mother: { familyUid?: string }, ledger: FamilySynergyLedger): string | null {
    const family = father.familyUid ?? mother.familyUid;
    if (!family) return null;
    const record = ledger.pairs[familyPairKey(PLAYER_FAMILY_UID, family)];
    const n = record?.recentCount ?? 0;
    const g = record ? qualifiedInWindow(record) : 0;
    return `世交門風契合度 K：近 ${n} 名結算子嗣中有 ${g} 名成材｜契合加成：${Math.round(synergyKOf(record) * 100)}%`;
}

/** 入學教官中名門出身者的最高 K 換算成修業效率加成；沒有名門教官時為 0 */
export function synergyTutorBonusOf(mentors: readonly { familyUid?: string }[], ledger: FamilySynergyLedger): number {
    const best = mentors.reduce((max, mentor) => (mentor.familyUid ? Math.max(max, synergyKOf(ledger.pairs[familyPairKey(PLAYER_FAMILY_UID, mentor.familyUid)])) : max), 0);
    return best * SYNERGY_TUTOR_MAX_BONUS;
}

export function synergyTutorLine(bonus: number): string {
    return `世交太傅伴讀：修業效率 +${Math.round(bonus * 100)}%`;
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** 舊檔沒有此欄位；壞掉的配對略過 */
export function normalizeFamilySynergy(raw: unknown): FamilySynergyLedger {
    const value = raw as Partial<FamilySynergyLedger> | null | undefined;
    const pairs: Record<string, FamilyPairRecord> = {};
    const source = value?.pairs ?? {};
    for (const key of Object.keys(source)) {
        const record = source[key];
        if (record && isCount(record.recentBitmap) && isCount(record.recentCount) && isCount(record.lifetimeQualified)) {
            pairs[key] = {
                recentBitmap: record.recentBitmap & WINDOW_MASK,
                recentCount: Math.min(SYNERGY_WINDOW, record.recentCount),
                lifetimeQualified: record.lifetimeQualified,
            };
        }
    }
    const finalizedIds = Array.isArray(value?.finalizedIds) ? (value?.finalizedIds as unknown[]).filter((id): id is string => typeof id === 'string') : [];
    return { pairs, finalizedIds };
}
