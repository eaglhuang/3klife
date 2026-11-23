/**
 * MatchmakerRankingLinkage.ts
 *
 * 史境天下風雲榜與媒人候選名額連動純函式模組 (PROG-2-9605)
 *
 * 規格依據：
 * 1. 預設季常媒人提供之推薦候選人為 2 名。
 * 2. 若當前世家（家族）有成員名列風雲榜（上榜家族），媒人聞名來訪，提供之推薦候選人名額擴充至 4 名。
 */

export interface MatchmakerRankingConfig {
    /** 基礎媒人名額（預設 2） */
    defaultCandidateCount: number;
    /** 入榜家族媒人名額（預設 4） */
    rankedFamilyCandidateCount: number;
}

export const DEFAULT_MATCHMAKER_RANKING_CONFIG: MatchmakerRankingConfig = {
    defaultCandidateCount: 2,
    rankedFamilyCandidateCount: 4,
};

export interface MatchmakerCandidateCountQuery {
    /** 當前世家在年度風雲榜中是否有成員上榜 */
    hasRankedClanMember: boolean;
    /** 可選客製化設定 */
    config?: Partial<MatchmakerRankingConfig>;
}

/**
 * 計算當季媒人候選人推薦名額
 *
 * @param query 查詢條件
 * @returns 候選人名額數量（純整數）
 */
export function calculateMatchmakerCandidateCount(query: MatchmakerCandidateCountQuery): number {
    const defaultCount = query.config?.defaultCandidateCount ?? DEFAULT_MATCHMAKER_RANKING_CONFIG.defaultCandidateCount;
    const rankedCount = query.config?.rankedFamilyCandidateCount ?? DEFAULT_MATCHMAKER_RANKING_CONFIG.rankedFamilyCandidateCount;

    return query.hasRankedClanMember ? rankedCount : defaultCount;
}

/**
 * 判定指定家族在年度結算記錄中是否有成員名列前茅（入榜判定輔助函式）
 *
 * @param clanMemberIds 該世家所有武將 ID 清單
 * @param rankedGeneralIds 當年風雲榜所有上榜武將 ID 集合或清單
 * @returns 是否有名列風雲榜之家族成員
 */
export function isClanRankedInAnnualBoard(
    clanMemberIds: readonly string[],
    rankedGeneralIds: ReadonlySet<string> | readonly string[]
): boolean {
    if (!clanMemberIds || clanMemberIds.length === 0) {
        return false;
    }
    const rankedSet = rankedGeneralIds instanceof Set ? rankedGeneralIds : new Set(rankedGeneralIds);
    return clanMemberIds.some((id) => rankedSet.has(id));
}