// PROG-2-9810：轉蛋結果卡的稀有度配色對應（純函式，不依賴 Cocos）。
//
// 外框、角標、底圖、名牌、星列、右側大圖標籤的配色一律由「卡片自己的 rarityTier」決定。
// 色票不寫在這裡：全部放在 ui-spec/skins/gacha-pull-result.skin.json 的 `gacha.card.<稀有度>.<部位>` slot，
// 本檔只負責「稀有度 → 要用哪個 slot」，由 UIScreenPreviewHost.restyleWithSlots 套到卡片節點。
// Unity 對照：依稀有度挑 ScriptableObject 色盤，再套到卡片 Image／Text。

/** 結果卡支援的稀有度等級（顯示標籤，同時是 skin slot 的稀有度段） */
export type GachaCardTier = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

/** 版面每張卡需要換色的部位（卡片節點名 + `_` + 部位名即該部位的 skin slot 尾碼） */
export const GACHA_CARD_PARTS = ['art', 'frame', 'gloss', 'sheen', 'tagbox', 'tag', 'plate', 'name', 'stars'] as const;
export type GachaCardPart = typeof GACHA_CARD_PARTS[number];

/** 版面 slot 命名前綴（由 HTML 轉換器產生） */
const LAYOUT_SLOT_PREFIX = 'auto.gacha-pull-result.';
/** 稀有度色票 slot 命名前綴 */
const THEME_SLOT_PREFIX = 'gacha.card.';

/** 每個稀有度的星數（名牌下方星列） */
const TIER_STARS: Record<GachaCardTier, number> = { N: 1, R: 2, SR: 3, SSR: 4, UR: 5 };

/**
 * 資料裡的 rarityTier（common／rare／epic／legendary／mythic，或已是 N／R／SR／SSR／UR／LR）
 * 轉成結果卡的稀有度標籤。LR 沿用 UR 的樣式；未知值退回 R（跟舊行為一致）。
 */
export function toGachaCardTier(rarityTier: string | null | undefined): GachaCardTier {
    switch (String(rarityTier ?? '').trim().toLowerCase()) {
        case 'common': case 'n': return 'N';
        case 'rare': case 'r': return 'R';
        case 'epic': case 'sr': return 'SR';
        case 'legendary': case 'ssr': return 'SSR';
        case 'mythic': case 'ur': case 'lr': return 'UR';
        default: return 'R';
    }
}

/** 名牌下方的星列文字，例如 SR → ★★★ */
export function gachaCardStars(tier: GachaCardTier): string {
    return '★'.repeat(TIER_STARS[tier]);
}

/** 某稀有度某部位的色票 slot id（存在 skin 檔） */
export function gachaThemeSlotId(tier: GachaCardTier, part: string): string {
    return `${THEME_SLOT_PREFIX}${tier}.${part}`;
}

/** 版面上某節點自己的 slot id，例如 GachaPullResult_hero_rarity → auto.gacha-pull-result.gachapullresult_hero_rarity */
export function gachaLayoutNodeSlotId(nodeName: string): string {
    return `${LAYOUT_SLOT_PREFIX}${nodeName.toLowerCase()}`;
}

/** 版面上某卡片某部位的 slot id，例如 (GachaPullResult_card_3, tag) → auto.gacha-pull-result.gachapullresult_card_3_tag */
export function gachaLayoutSlotId(nodeName: string, part: string): string {
    return `${gachaLayoutNodeSlotId(nodeName)}_${part}`;
}

/** 一張結果卡所有部位要用的「版面 slot → 色票 slot」對應 */
export function buildCardSlotAliases(cardNodeName: string, tier: GachaCardTier): Record<string, string> {
    const aliases: Record<string, string> = {};
    for (const part of GACHA_CARD_PARTS) {
        aliases[gachaLayoutSlotId(cardNodeName, part)] = gachaThemeSlotId(tier, part);
    }
    return aliases;
}

/** 右側大圖展示區（稀有度標籤與底框）依稀有度換色的對應 */
export function buildHeroSlotAliases(tier: GachaCardTier): Record<string, string> {
    return {
        [gachaLayoutNodeSlotId('GachaPullResult_hero_badge_box')]: gachaThemeSlotId(tier, 'heroBox'),
        [gachaLayoutNodeSlotId('GachaPullResult_hero_rarity')]: gachaThemeSlotId(tier, 'hero'),
    };
}

/**
 * 整個結果畫面的換色對應：每張卡依自己的稀有度，另加展示區依最高稀有度。
 * results 比卡片少時，多的卡不處理（保持預設樣式、畫面上本來就隱藏）。
 */
export function buildResultSlotAliases(
    cardNodeNames: readonly string[],
    rarityTiers: ReadonlyArray<string | null | undefined>,
    heroRarityTier: string | null | undefined,
): Record<string, string> {
    const aliases: Record<string, string> = {};
    cardNodeNames.forEach((name, index) => {
        if (index >= rarityTiers.length) return;
        Object.assign(aliases, buildCardSlotAliases(name, toGachaCardTier(rarityTiers[index])));
    });
    if (heroRarityTier !== undefined) Object.assign(aliases, buildHeroSlotAliases(toGachaCardTier(heroRarityTier)));
    return aliases;
}

/** 重複卡彈窗左側立繪框與稀有度徽章的換色對應（色票在 duplicate-pull-popup-screen.skin.json，數值同結果卡色票） */
export function buildDupPopupAliases(rarityTier: string | null | undefined): Record<string, string> {
    const tier = toGachaCardTier(rarityTier);
    return {
        'dup.hero.bg': `dup.hero.bg.${tier}`,
        'dup.rarity.bg': `dup.rarity.bg.${tier}`,
        'dup.label.rarity': `dup.label.rarity.${tier}`,
    };
}
