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

/** 色碼的設計 token 來源檔（assets/resources/data/uid-design-tokens.json） */
export const FACTOR_TAG_TOKEN_PATH = 'data/uid-design-tokens';

const FACTOR_COLORS: readonly FactorColor[] = ['blue', 'pink', 'green', 'purple', 'white', 'red'];
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * 從 uid-design-tokens.json 解析六色色碼；缺色或格式不是 #RRGGBB 時回傳 null，
 * 呼叫端退回預設值，不讓壞資料把畫面染成空白。
 *
 * Unity 對照：像讀 ScriptableObject 的欄位，欄位缺失就走 Inspector 預設值。
 */
export function parseFactorTagColors(raw: unknown): Readonly<Record<FactorColor, string>> | null {
    const table = (raw as { factorTagColors?: Record<string, unknown> } | null)?.factorTagColors;
    if (!table) return null;
    const out = {} as Record<FactorColor, string>;
    for (const color of FACTOR_COLORS) {
        const hex = table[color];
        if (typeof hex !== 'string' || !HEX_COLOR.test(hex)) return null;
        out[color] = hex.toUpperCase();
    }
    return out;
}

/**
 * 暫定色碼（藍 粉 綠 紫 白 紅）。
 * 與 uid-design-tokens.json 的 factorTagColors 必須一致（tests/FactorTagTokens.test.ts 會比對）；
 * LoadingScene 載入 JSON 成功時會以 applyFactorTagTokens 覆蓋；失敗則沿用這份常數。
 */
export const FACTOR_TAG_COLORS: Readonly<Record<FactorColor, string>> = {
    blue: '#50A0FF',
    pink: '#FF8CBE',
    green: '#6EC878',
    purple: '#AA78E6',
    white: '#F0F0F0',
    red: '#E65046',
};

let activeFactorTagColors: Readonly<Record<FactorColor, string>> = FACTOR_TAG_COLORS;

/**
 * 載入 uid-design-tokens.json 後套用色碼；格式不合時保留目前色碼（預設為常數）並回傳 false。
 */
export function applyFactorTagTokens(raw: unknown): boolean {
    const parsed = parseFactorTagColors(raw);
    if (!parsed) return false;
    activeFactorTagColors = parsed;
    return true;
}

/** 目前生效的因子色碼：JSON 套用後用 JSON，否則用常數。 */
export function factorTagColorOf(color: FactorColor): string {
    return activeFactorTagColors[color];
}

/** 查語系表取標籤文字；查不到時退回 key 本身，避免畫面空白。 */
export function factorTagText(color: FactorColor, lookup: (key: string) => string | undefined): string {
    const key = FACTOR_TAG_I18N_KEYS[color];
    return lookup(key) ?? key;
}
