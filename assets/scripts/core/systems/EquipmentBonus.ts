// @spec-source → 武將背包（倉庫）系統.md §「裝備數值加成」「裝備品質與來源」與 §「裝備欄位」；WBS BAG-04；PROG-2-1011
/**
 * EquipmentBonus — 裝備的品質加成範圍與合入武將面板數值（純邏輯，不依賴 cc）。
 *
 * - 品質決定加成範圍（SSR +50~100、SR +20~49、R +5~19、N +1~4）；超出範圍的加成夾回範圍。
 * - 基礎欄的加成對應：武器 → 武力、智力；防具 → 統帥、生命；飾品 → 政治、魅力（規格表）。
 * - 進階欄（坐騎、典籍、傳家寶物）規格表沒有對應的屬性，這版不加成（暫定）。
 * - 最終數值 = 基礎數值 + 所有裝備加成（規格公式 final_stat = base_stat + Σ bonus）。
 *
 * Unity 對照：像 StatModifier 堆疊，裝備每件送一個 modifier，角色面板最後加總。
 */
import type { EquipSlot } from './GeneralBackpack';

export type EquipQuality = 'SSR' | 'SR' | 'R' | 'N';
export type EquipStatKey = 'str' | 'int' | 'lea' | 'pol' | 'cha' | 'hp';

export interface EquipBonusRange {
    min: number;
    max: number;
}

export const EQUIP_BONUS_RANGE: Readonly<Record<EquipQuality, EquipBonusRange>> = Object.freeze({
    SSR: { min: 50, max: 100 },
    SR: { min: 20, max: 49 },
    R: { min: 5, max: 19 },
    N: { min: 1, max: 4 },
});

const SLOT_STATS: Readonly<Partial<Record<EquipSlot, readonly EquipStatKey[]>>> = Object.freeze({
    WEAPON: ['str', 'int'],
    ARMOR: ['lea', 'hp'],
    ACCESSORY: ['pol', 'cha'],
});

export interface EquipModifierItem {
    kind: EquipSlot;
    quality: EquipQuality;
    /** 這件裝備的加成值；超出品質範圍的部分夾回範圍。 */
    bonus: number;
}

/** 把加成夾進品質的範圍；非有限數視為範圍下限。 */
export function clampEquipBonus(quality: EquipQuality, bonus: number): number {
    const { min, max } = EQUIP_BONUS_RANGE[quality];
    if (!Number.isFinite(bonus)) return min;
    return Math.min(max, Math.max(min, bonus));
}

/** 一件裝備對各屬性的加成；進階欄沒有對應屬性時回傳空物件。 */
export function equipStatBonuses(item: Readonly<EquipModifierItem>): Partial<Record<EquipStatKey, number>> {
    const stats = SLOT_STATS[item.kind] ?? [];
    const value = clampEquipBonus(item.quality, item.bonus);
    const out: Partial<Record<EquipStatKey, number>> = {};
    for (const stat of stats) out[stat] = value;
    return out;
}

/** 合入面板：final = base + Σ 裝備加成；回傳新物件，不改動輸入。 */
export function applyEquipBonuses(
    base: Readonly<Partial<Record<EquipStatKey, number>>>,
    items: readonly Readonly<EquipModifierItem>[],
): Partial<Record<EquipStatKey, number>> {
    const out: Partial<Record<EquipStatKey, number>> = { ...base };
    for (const item of items) {
        for (const [stat, value] of Object.entries(equipStatBonuses(item)) as [EquipStatKey, number][]) {
            out[stat] = (out[stat] ?? 0) + value;
        }
    }
    return out;
}
