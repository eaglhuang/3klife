// @spec-source → 武將壽命系統.md (doc_spec_0018) §E-1 戰傷減損、§J War_Injury；PROG-2-1570
import { resolveMaxLifespan, AgingGeneral } from './GeneralAging';

/**
 * 重傷門檻（暫定，PROG-2-1570）：戰鬥結束時主將血量比例 ≤ 25% 視為重傷。
 * 血量歸零（陣亡撤退）同樣算重傷。
 */
export const WAR_INJURY_HP_RATIO = 0.25;
/** 每次重傷扣除的壽命上限年數（暫定，PROG-2-1570） */
export const WAR_INJURY_LIFESPAN_PENALTY_YEARS = 1;

export function isSevereWarInjury(hpRatio: number): boolean {
    return Number.isFinite(hpRatio) && hpRatio <= WAR_INJURY_HP_RATIO;
}

/** 重傷時回傳壽命上限減 1 年的新武將；沒有重傷時原樣回傳 */
export function applyWarInjury<T extends AgingGeneral>(general: T, hpRatio: number): T {
    if (!isSevereWarInjury(hpRatio)) return general;
    return { ...general, maxLifespan: resolveMaxLifespan(general) - WAR_INJURY_LIFESPAN_PENALTY_YEARS };
}
