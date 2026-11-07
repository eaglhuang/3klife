// @spec-source → 英靈世家系統 §F-1 積分構成、§F-2 世家階位、§D-3 階位不倒退（SPI-07，PROG-2-1961）
/**
 * ClanScoreTier — 家族積分 ClanScore = HeadScore + MeritScore 與四階世家等級（純邏輯，不依賴 cc）。
 *
 * - 人頭分沿用 SurnameAffiliation.headScoreOf（本家 100%／俘虜轉化 80%／隨母姓 120%）。
 * - 功勳分由呼叫端把傷害、擊殺、攻城、名將挑戰換算成點數後傳入；四項各自的換算權重規格未給。
 * - 四階：傳家之寶 → 名門望族 → 萬世宗親 → 武聖神祇；已解鎖階位不倒退（§D-3）。
 *
 * 暫定：門檻 0／500／5000／50000 取自討論來源 doc_spec_0050，正式規格 §F-2 未列數字。
 * 每人的人頭分點數（headPointPerMember）規格未給，預設 1。
 * Unity 對照：像 ScriptableObject 裡的等級門檻表，分數對表找最高的那一階。
 */
import { headScoreOf, type HeadScoreKind } from './SurnameAffiliation';

export type ClanTier = 'CLAN_RELIC' | 'NOBLE_HOUSE' | 'ETERNAL_KIN' | 'MARTIAL_DEITY';

export const CLAN_TIER_ORDER: readonly ClanTier[] = ['CLAN_RELIC', 'NOBLE_HOUSE', 'ETERNAL_KIN', 'MARTIAL_DEITY'];

/** 各階最低積分（暫定，見檔頭）。 */
export const CLAN_TIER_THRESHOLD: Readonly<Record<ClanTier, number>> = {
    CLAN_RELIC: 0,
    NOBLE_HOUSE: 500,
    ETERNAL_KIN: 5000,
    MARTIAL_DEITY: 50000,
};

/** 各階解鎖內容（§F-2 說明欄）。 */
export const CLAN_TIER_UNLOCKS: Readonly<Record<ClanTier, string>> = {
    CLAN_RELIC: '英靈卡基礎加成與陳列',
    NOBLE_HOUSE: '宗族加成與次級祖靈效果',
    ETERNAL_KIN: '跨代供養強化與視覺升格',
    MARTIAL_DEITY: '高階祖靈顯化與頂階傳道權限',
};

function nonNegative(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 0;
}

/** ClanScore = HeadScore × 每人點數 + MeritScore。 */
export function clanScoreOf(members: readonly HeadScoreKind[], meritScore: number, headPointPerMember = 1): number {
    return headScoreOf(members) * nonNegative(headPointPerMember) + nonNegative(meritScore);
}

/** 依積分找達到的最高階。 */
export function clanTierForScore(score: number): ClanTier {
    let tier: ClanTier = 'CLAN_RELIC';
    for (const t of CLAN_TIER_ORDER) {
        if (nonNegative(score) >= CLAN_TIER_THRESHOLD[t]) tier = t;
    }
    return tier;
}

/** 階位只升不降：取已解鎖階與本次積分階的較高者。 */
export function settleClanTier(unlocked: ClanTier | null, score: number): ClanTier {
    const next = clanTierForScore(score);
    if (!unlocked) return next;
    return CLAN_TIER_ORDER.indexOf(unlocked) >= CLAN_TIER_ORDER.indexOf(next) ? unlocked : next;
}

/** 某階是否已解鎖（含更高階）。 */
export function isClanTierUnlocked(current: ClanTier, required: ClanTier): boolean {
    return CLAN_TIER_ORDER.indexOf(current) >= CLAN_TIER_ORDER.indexOf(required);
}

/** 距離下一階還差多少分；已是最高階回傳 null。 */
export function pointsToNextClanTier(score: number): { next: ClanTier; remaining: number } | null {
    const idx = CLAN_TIER_ORDER.indexOf(clanTierForScore(score));
    const next = CLAN_TIER_ORDER[idx + 1];
    if (!next) return null;
    return { next, remaining: CLAN_TIER_THRESHOLD[next] - nonNegative(score) };
}
