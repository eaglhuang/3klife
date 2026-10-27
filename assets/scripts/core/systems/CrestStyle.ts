// @spec-source → 血統樹14人UI規格書.md §4.2 視覺語言原則（祖先連線用祖紋命篆、色彩與六色因子一致）、§4.3 UI微調限制；WBS BUI-08；PROG-2-1211
/**
 * CrestStyle — 祖紋命篆的視覺樣式解析（純邏輯，不依賴 cc）。
 *
 * - 依六色因子決定色調（tint）、徽記字串 key（badgeKey）與紋樣 id（glyphId）。
 * - 色調取自 FactorTagTokens 的色碼，與標籤色一致；不另立一套色票。
 * - 空值、未知色或非字串一律退回中性樣式（neutral: true），不讓壞資料把連線染成空白。
 * - 只改色調、徽記與紋樣，不改版型（依 §4.3）。
 *
 * Unity 對照：像一個 ScriptableObject 樣式表，輸入因子色枚舉，輸出 Material 色、Sprite 名稱與 Localization key；查不到就用預設 Material。
 */
import { ALL_FACTOR_COLORS, type FactorColor } from './FactorInheritance';
import { FACTOR_NEUTRAL_TINT, FACTOR_TAG_COLORS, FACTOR_TAG_I18N_KEYS } from './FactorTagTokens';

/** 中性樣式色：與連線共用 FACTOR_NEUTRAL_TINT，灰階不與六色混淆。 */
export const CREST_NEUTRAL_TINT = FACTOR_NEUTRAL_TINT;

/** 中性樣式的紋樣 id（暫定）。 */
export const CREST_NEUTRAL_GLYPH_ID = 'crest_neutral';

export interface CrestStyle {
    /** 是否為中性樣式（無因子色或未知色）。 */
    neutral: boolean;
    /** #RRGGBB 色調。 */
    tint: string;
    /** 徽記的語系 key；中性樣式為 null，呼叫端不顯示徽記字。 */
    badgeKey: string | null;
    /** 紋樣 id，對應圖集中的 sprite 名稱。 */
    glyphId: string;
}

function isFactorColor(value: unknown): value is FactorColor {
    return typeof value === 'string' && (ALL_FACTOR_COLORS as readonly string[]).includes(value);
}

/**
 * 解析祖紋命篆樣式。
 * @param color 因子色；null、undefined、未知字串都視為無色。
 * @param colors 色碼表，預設為 FACTOR_TAG_COLORS；測試或套用 JSON 後可傳入。
 */
export function resolveCrestStyle(
    color: FactorColor | null | undefined,
    colors: Readonly<Record<FactorColor, string>> = FACTOR_TAG_COLORS,
): CrestStyle {
    if (!isFactorColor(color)) {
        return { neutral: true, tint: CREST_NEUTRAL_TINT, badgeKey: null, glyphId: CREST_NEUTRAL_GLYPH_ID };
    }
    return {
        neutral: false,
        tint: colors[color],
        badgeKey: FACTOR_TAG_I18N_KEYS[color],
        glyphId: `crest_${color}`,
    };
}
