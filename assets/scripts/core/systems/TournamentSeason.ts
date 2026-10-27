// @spec-source → 名將挑戰賽系統 §賽季週期（TOURNAMENT_CONFIG）、§段位對照（RANK_TIERS）、§賽季 rollover（SEASON_ROLLOVER_RULE）；WBS v16.3 TRN-01（PROG-2-0989）
/**
 * TournamentSeason — 名將挑戰賽的賽季相位、段位與賽季結束軟重置（純邏輯，不依賴 cc）。
 *
 * - 一季 14 天：第 0–6 日培育期（PREPARATION），第 7–13 日競賽期（COMPETITION），第 14 日起結束（ENDED）。
 * - 段位依排名分數落在門檻區間內判定（規格門檻照用）。
 * - 賽季結束的軟重置：傳說 -250、鑽石 -200、白金 -150，下限 0。
 *   銅、銀、金的軟重置規格沒有列，維持不變（暫定）。
 *
 * Unity 對照：像一個依日數切換狀態的 Timeline，段位是分數落在哪個 Range 的查表。
 */

export const TOURNAMENT_SEASON_DAYS = 14;
export const TOURNAMENT_PREPARATION_DAYS = 7;

export type TournamentPhase = 'PREPARATION' | 'COMPETITION' | 'ENDED';

/** 依賽季第幾日（0 起算）判定相位；賽季開始前（負數）視為培育期。 */
export function tournamentPhaseOf(dayInSeason: number): TournamentPhase {
    if (dayInSeason < TOURNAMENT_PREPARATION_DAYS) return 'PREPARATION';
    if (dayInSeason < TOURNAMENT_SEASON_DAYS) return 'COMPETITION';
    return 'ENDED';
}

export type RankTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'LEGEND';

/** 段位門檻（規格 RANK_TIERS）：分數落在 [min, max] 內。 */
const RANK_TIER_FLOORS: readonly { tier: RankTier; min: number }[] = [
    { tier: 'LEGEND', min: 3000 },
    { tier: 'DIAMOND', min: 2500 },
    { tier: 'PLATINUM', min: 2000 },
    { tier: 'GOLD', min: 1500 },
    { tier: 'SILVER', min: 1000 },
    { tier: 'BRONZE', min: 0 },
];

/** 排名分數的段位；負數或非有限值視為銅。 */
export function rankTierOf(points: number): RankTier {
    const safe = Number.isFinite(points) ? points : 0;
    const hit = RANK_TIER_FLOORS.find(entry => safe >= entry.min);
    return hit ? hit.tier : 'BRONZE';
}

/** 賽季結束的軟重置扣分（規格 SEASON_ROLLOVER_RULE）；未列出的段位為 0。 */
const SOFT_RESET_BY_TIER: Readonly<Partial<Record<RankTier, number>>> = {
    LEGEND: 250,
    DIAMOND: 200,
    PLATINUM: 150,
};

/** 賽季結束後的排名分數：扣除段位對應的軟重置，下限 0；不改輸入。 */
export function softResetPoints(points: number): number {
    const safe = Number.isFinite(points) ? Math.max(0, points) : 0;
    const reset = SOFT_RESET_BY_TIER[rankTierOf(safe)] ?? 0;
    return Math.max(0, safe - reset);
}
