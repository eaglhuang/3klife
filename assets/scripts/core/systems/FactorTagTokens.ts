// @spec-source → 因子爆發系統.md §H 字串內容相關（UI_GENE_TAG_*）；FBR-08（PROG-2-0725）
/**
 * FactorTagTokens — 六色因子標籤的字串 key 與色碼 token（純資料，不依賴 cc）
 *
 * 文案在 assets/resources/i18n/*.json，key 為 ui.gene.tag.{色}；色碼是暫定值，
 * 與 FactorHexGraphic 的色票一致，等 UI 定稿後一起改。
 *
 * Unity 對照：像一張 ScriptableObject 表，色系 enum 對到字串 key 與顏色，文案由 Localization 表查。
 */
import type { FactorColor } from './FactorInheritance';

export const FACTOR_TAG_I18N_KEYS: Readonly<Record<FactorColor, string>> = {
    blue: 'ui.gene.tag.blue',
    pink: 'ui.gene.tag.pink',
    green: 'ui.gene.tag.green',
    purple: 'ui.gene.tag.purple',
    white: 'ui.gene.tag.white',
    red: 'ui.gene.tag.red',
};

/** 暫定色碼（藍 粉 綠 紫 白 紅） */
export const FACTOR_TAG_COLORS: Readonly<Record<FactorColor, string>> = {
    blue: '#50A0FF',
    pink: '#FF8CBE',
    green: '#6EC878',
    purple: '#AA78E6',
    white: '#F0F0F0',
    red: '#E65046',
};

/** 查語系表取標籤文字；查不到時退回 key 本身，避免畫面空白。 */
export function factorTagText(color: FactorColor, lookup: (key: string) => string | undefined): string {
    const key = FACTOR_TAG_I18N_KEYS[color];
    return lookup(key) ?? key;
}
