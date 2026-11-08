// @spec-source → 使用者裁決 2026-11-08 第二批：虎符每升 1 階（★1~★5）特種部隊攻防基礎值 +6%；PROG-2-1998（接 PROG-2-2081／2099 的層級資料）
/**
 * TallyInfusionBonus — 虎符灌注層級對攻防的加成（純邏輯，不依賴 cc）。
 *
 * 層級 = 血脈灌注累積的虎符層級（GameSession.tallyInfusionLevelOf，0~5，沒灌注過是 0）。
 * 攻防倍率 = 1 + 0.06 × 層級，與星級倍率（TigerTallyStar.starStatMultiplier）相乘，不互相取代。
 *
 * 暫定解讀：層級 ★1~★5 取灌注層級夾 0~5；「專屬兵種戰法發動率 +3%」尚無對應掛點，使用者未裁決，本檔不做。
 *
 * Unity 對照：像一個疊在基礎倍率上的第二層乘算 Modifier。
 */

/** 每層攻防加成 */
export const TALLY_INFUSION_STAT_BONUS_PER_LEVEL = 0.06;
/** 層級上限（★5） */
export const TALLY_INFUSION_MAX_LEVEL = 5;

/** 層級夾到 0~TALLY_INFUSION_MAX_LEVEL 的整數；缺值、非有限數、負數視為 0 */
export function clampTallyInfusionLevel(level: number | undefined | null): number {
    if (typeof level !== 'number' || !Number.isFinite(level) || level <= 0) return 0;
    return Math.min(TALLY_INFUSION_MAX_LEVEL, Math.floor(level));
}

/** 灌注層級的攻防倍率：1 + 0.06 × 層級；0 層為 1 */
export function tallyInfusionStatMultiplier(level: number | undefined | null): number {
    return 1 + TALLY_INFUSION_STAT_BONUS_PER_LEVEL * clampTallyInfusionLevel(level);
}
