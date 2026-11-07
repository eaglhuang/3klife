// @spec-source → 整併疑問書 Q50=D（doc_spec_0155 處置系統 × doc_spec_0026 培育系統）；WBS LVL-13；PROG-2-1984
/**
 * ReleaseEpiphany — 釋放敵將的頓悟捷徑（純邏輯，不依賴 cc）
 *
 * Q50=D：放走敵將時，要消耗資源，且我方武將達門檻人數才觸發；由我方隨機一名武將習得或升級戰法。
 * 暫定：門檻 10 人（含）、消耗軍資 500；資源不足或人數不足都不扣資源。
 * 「軍師演武模式」規格未定義，本檔不處理。
 */

/** 暫定：觸發所需我方武將人數（含） */
export const RELEASE_EPIPHANY_MIN_ROSTER = 10;
/** 暫定：觸發消耗軍資 */
export const RELEASE_EPIPHANY_SUPPLY_COST = 500;

export interface ReleaseEpiphanyInput {
    /** 可受惠的我方武將 id（人數即門檻判斷用） */
    rosterIds: readonly string[];
    supplies: number;
    /** 回傳 [0,1) 的亂數，測試可注入 */
    rng: () => number;
}

export type ReleaseEpiphanyReason = 'triggered' | 'roster-too-small' | 'not-enough-supplies';

export interface ReleaseEpiphanyResult {
    triggered: boolean;
    reason: ReleaseEpiphanyReason;
    /** 習得或升級戰法的武將 */
    winnerId: string | null;
    suppliesAfter: number;
}

export function resolveReleaseEpiphany(input: ReleaseEpiphanyInput): ReleaseEpiphanyResult {
    const miss = (reason: ReleaseEpiphanyReason): ReleaseEpiphanyResult =>
        ({ triggered: false, reason, winnerId: null, suppliesAfter: input.supplies });
    if (input.rosterIds.length < RELEASE_EPIPHANY_MIN_ROSTER) return miss('roster-too-small');
    if (input.supplies < RELEASE_EPIPHANY_SUPPLY_COST) return miss('not-enough-supplies');
    const index = Math.min(input.rosterIds.length - 1, Math.floor(input.rng() * input.rosterIds.length));
    return {
        triggered: true,
        reason: 'triggered',
        winnerId: input.rosterIds[index],
        suppliesAfter: input.supplies - RELEASE_EPIPHANY_SUPPLY_COST,
    };
}
