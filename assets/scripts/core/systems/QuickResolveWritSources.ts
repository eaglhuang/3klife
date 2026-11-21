// @spec-source → 出征極速決戰推演演算法與武將個性單挑演出規格書.md (doc_spec_1170) §三-5 軍令狀取得；獎勵系統 Base (doc_spec_1186)；PROG-2-9709（總PM 2026-11-22 裁決）
/**
 * QuickResolveWritSources — 軍令狀（ITEM_QUICK_RESOLVE_WRIT）的免費來源：該領哪個獎勵套件、何時領（純函式，不依賴 cc）。
 *
 * 張數全在 reward-config.json 的套件（BUNDLE_QUICK_RESOLVE_WRIT_*）；真正入帳走共通 API 的 reward.claim，
 * grantKey 冪等：同一件事重送回原結果、不重複入帳，所以呼叫端每場勝利都可以呼叫，不必自己記「領過沒」。
 * 三個來源：首次通關 Boss 關 ×1、年終守城勝利 ×2、每季第一場戰鬥勝利 ×1。
 */
import type { SupportTicketClaim } from './SupportTicketSources';

export const QUICK_RESOLVE_WRIT_BUNDLES = Object.freeze({
    bossFirstClear: 'BUNDLE_QUICK_RESOLVE_WRIT_BOSS',
    yearEndDefense: 'BUNDLE_QUICK_RESOLVE_WRIT_DEFENSE',
    seasonFirstWin: 'BUNDLE_QUICK_RESOLVE_WRIT_SEASON',
});

const KEY_PREFIX = 'quickResolveWrit';

/** 首次通關 Boss 關：每個 Boss 關一次（grantKey 含關卡 id） */
export function bossFirstClearWritClaim(stageId: string): SupportTicketClaim {
    return {
        bundleId: QUICK_RESOLVE_WRIT_BUNDLES.bossFirstClear,
        grantKey: `${KEY_PREFIX}:bossFirstClear:${stageId}`,
        source: { kind: 'battle', ref: stageId },
    };
}

/** 年終守城勝利：每年一次 */
export function yearEndDefenseWritClaim(year: number): SupportTicketClaim {
    return {
        bundleId: QUICK_RESOLVE_WRIT_BUNDLES.yearEndDefense,
        grantKey: `${KEY_PREFIX}:yearEndDefense:${year}`,
        source: { kind: 'battle', ref: `defense-${year}` },
    };
}

/** 每季第一場戰鬥勝利：每年每季一次 */
export function seasonFirstWinWritClaim(year: number, season: number): SupportTicketClaim {
    return {
        bundleId: QUICK_RESOLVE_WRIT_BUNDLES.seasonFirstWin,
        grantKey: `${KEY_PREFIX}:seasonFirstWin:${year}-${season}`,
        source: { kind: 'battle', ref: `${year}-${season}` },
    };
}

export interface QuickResolveWritEvent {
    readonly result: string;
    readonly stageId?: string | null;
    /** 該關是否 Boss 關（天下征鋒） */
    readonly isBossStage: boolean;
    /** 是否年終守城戰 */
    readonly isDefense: boolean;
    readonly year: number;
    readonly season: number;
}

/**
 * 一場戰鬥結算後該領的軍令狀：只有勝利才有；Boss 關首勝、年終守城勝、每季首勝可同時成立（各自一份）。
 * 每場勝利都會回每季首勝那份，是否真的入帳由 grantKey 冪等決定。
 */
export function quickResolveWritClaimsFor(event: QuickResolveWritEvent): SupportTicketClaim[] {
    if (event.result !== 'player-win') return [];
    const claims: SupportTicketClaim[] = [seasonFirstWinWritClaim(event.year, event.season)];
    if (event.isBossStage && event.stageId) claims.push(bossFirstClearWritClaim(event.stageId));
    if (event.isDefense) claims.push(yearEndDefenseWritClaim(event.year));
    return claims;
}
