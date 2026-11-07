// @spec-source → 血脈命鏡過場載入規格補遺_2026-04-02_v3.md「aura 顏色表達稀有度」、元件 mirror-rarity-aura（BMV3-03，PROG-2-2062）
/**
 * MirrorRarityAura — 血脈命鏡稀有度 aura 色映射（純邏輯，不依賴 cc）
 *
 * 規格：金色＝傳說、紫色＝史詩、藍色＝稀有、銀白＝低階或未完整覺醒。
 * 命紋還沒覺醒（crestState 不是 awakened）時一律銀白，覺醒後才顯示稀有度本色。
 *
 * 暫定（可逆）：mythic 併入金色；色碼沿用 ui-design-tokens 既有 rarity* token，不另開新色。
 * Unity 對照：像一個 static 的 ScriptableObject 對照表，給 UI 查顏色與標籤。
 */
import type { GeneralDetailCrestState, GeneralDetailRarityTier } from '../models/GeneralUnit';

export type MirrorAuraColor = 'gold' | 'purple' | 'blue' | 'silver';

export interface MirrorRarityAura {
    aura: MirrorAuraColor;
    /** ui-design-tokens.json colors 內的 token 名稱 */
    colorToken: string;
    /** RarityAuraLabel 顯示文字 */
    label: string;
}

/** 稀有度 → aura 色（mythic 暫併金色） */
export const MIRROR_AURA_BY_TIER: Readonly<Record<GeneralDetailRarityTier, MirrorAuraColor>> = {
    mythic: 'gold',
    legendary: 'gold',
    epic: 'purple',
    rare: 'blue',
    common: 'silver',
};

export const MIRROR_AURA_COLOR_TOKEN: Readonly<Record<MirrorAuraColor, string>> = {
    gold: 'rarityGold',
    purple: 'rarityPurple',
    blue: 'rarityBlue',
    silver: 'rarityWhite',
};

const AURA_TIER_LABEL: Readonly<Record<MirrorAuraColor, string>> = {
    gold: '傳說',
    purple: '史詩',
    blue: '稀有',
    silver: '低階',
};

const UNAWAKENED_LABEL = '命紋未全';

/** 依稀有度與命紋狀態決定 aura；未覺醒一律銀白。未知稀有度視為 common。 */
export function resolveMirrorRarityAura(
    tier: GeneralDetailRarityTier | null | undefined,
    crestState: GeneralDetailCrestState | null | undefined,
): MirrorRarityAura {
    const awakened = crestState === 'awakened';
    const aura: MirrorAuraColor = awakened ? MIRROR_AURA_BY_TIER[tier ?? 'common'] ?? 'silver' : 'silver';
    const label = `稀有度: ${awakened ? AURA_TIER_LABEL[aura] : UNAWAKENED_LABEL}`;
    return { aura, colorToken: MIRROR_AURA_COLOR_TOKEN[aura], label };
}
