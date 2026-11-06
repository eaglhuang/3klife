// @spec-source → 武將人物介面規格補遺_2026-04-14 §2 忠誠度條、§5 資料 Schema 擴充（HUM-01，PROG-2-1931）
/**
 * GeneralLoyalty — 忠誠度讀模型與沒收虎符扣忠誠（純邏輯，不依賴 cc）。
 *
 * - 範圍 0~100；轉蛋武將鎖定 100，不受扣減。
 * - 低於 60 橘色警示、低於 30 紅色危險。
 * - 沒收虎符扣 30 點（鎖定者不扣）。
 * - 缺欄位時依來源補預設：轉蛋鎖定 100；招降、傭兵暫定 100 未鎖定。
 *
 * 暫定：招降、傭兵的初始忠誠規格未給，先給 100；下野／勸降判定另卡。
 * Unity 對照：像一個有 clamp 的屬性加上依區間換色的血條。
 */
import type { GeneralLoyalty, GeneralSourceType } from '../models/GeneralUnit';

export const LOYALTY_MIN = 0;
export const LOYALTY_MAX = 100;
export const LOYALTY_WARNING_BELOW = 60;
export const LOYALTY_DANGER_BELOW = 30;
export const TALLY_CONFISCATE_LOYALTY_COST = 30;

export type LoyaltyBand = 'locked' | 'normal' | 'warning' | 'danger';

function clamp(value: number): number {
    return Math.max(LOYALTY_MIN, Math.min(LOYALTY_MAX, Number.isFinite(value) ? Math.round(value) : LOYALTY_MAX));
}

/** 缺欄位或壞值時補成合法忠誠度；轉蛋一律鎖定 100。 */
export function normalizeLoyalty(loyalty: Readonly<GeneralLoyalty> | undefined, sourceType: GeneralSourceType = 'Gacha'): GeneralLoyalty {
    const source = loyalty?.sourceType ?? sourceType;
    if (source === 'Gacha') return { value: LOYALTY_MAX, isLocked: true, sourceType: 'Gacha' };
    return { value: clamp(loyalty?.value ?? LOYALTY_MAX), isLocked: false, sourceType: source };
}

export function loyaltyBandOf(loyalty: Readonly<GeneralLoyalty>): LoyaltyBand {
    if (loyalty.isLocked) return 'locked';
    if (loyalty.value < LOYALTY_DANGER_BELOW) return 'danger';
    if (loyalty.value < LOYALTY_WARNING_BELOW) return 'warning';
    return 'normal';
}

/** 沒收虎符：未鎖定者扣 30（不低於 0）；回傳新值與實際扣了多少。不改輸入。 */
export function confiscateTallyLoyalty(loyalty: Readonly<GeneralLoyalty>): { loyalty: GeneralLoyalty; lost: number } {
    if (loyalty.isLocked) return { loyalty: { ...loyalty }, lost: 0 };
    const value = clamp(loyalty.value - TALLY_CONFISCATE_LOYALTY_COST);
    return { loyalty: { ...loyalty, value }, lost: loyalty.value - value };
}
