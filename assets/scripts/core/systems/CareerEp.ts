// @spec-source → 血脈命運系統 G2「每一場勝仗、每一次升官都在提高」、Career_EP（PROG-2-1827）
/**
 * CareerEp — 武將打仗累積 EP（純邏輯，不依賴 cc）
 *
 * EP 是生平功業評分，雙親 EP 決定子嗣的五錨點加成（EpLegacyBonus）。
 * 規格未定各項權重（DEC-R4-09），下列數值皆為暫定。
 *
 * Unity 對照：像戰後把經驗值寫回 ScriptableObject 存檔，評級再依新值重算。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { epRatingLabel } from './BreedingSystem';
import { epGradeOf } from './FamousClan';

/** 每場勝仗 +1（暫定）；平手與敗仗不加 */
export const CAREER_EP_PER_WIN = 1;
/** 每個新達成的戰功里程碑 +5（暫定，取規格「哪怕只多 5 點」） */
export const CAREER_EP_PER_MILESTONE = 5;
export const CAREER_EP_MAX = 100;

export function careerEpGain(outcome: 'win' | 'draw' | 'loss', newMilestoneCount: number): number {
    return (outcome === 'win' ? CAREER_EP_PER_WIN : 0) + newMilestoneCount * CAREER_EP_PER_MILESTONE;
}

/** 名將是字母評級、子嗣是文字評級，沿用武將原本那一套；沒有評級的不補 */
function nextRating(current: string | undefined, ep: number): string | undefined {
    if (!current) return current;
    return /^[A-Z]/.test(current) ? epGradeOf(ep) : epRatingLabel(ep);
}

/** 回傳加過 EP 的複本與實得點數；沒有 EP 的資料不補值，達上限時實得為 0 */
export function withCareerEp<T extends GeneralConfig>(general: T, gain: number): { general: T; gained: number } {
    if (typeof general.ep !== 'number') return { general, gained: 0 };
    const ep = Math.max(general.ep, Math.min(CAREER_EP_MAX, general.ep + gain));
    const gained = ep - general.ep;
    if (gained === 0) return { general, gained };
    return { general: { ...general, ep, epRating: nextRating(general.epRating, ep) }, gained };
}
