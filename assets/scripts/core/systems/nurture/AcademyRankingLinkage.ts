/**
 * AcademyRankingLinkage.ts
 *
 * 史境天下風雲榜與學府結業連動純函式模組 (PROG-2-9613)
 *
 * 規格依據：
 * 1. 稱號亮點判定：若子嗣結業時，其世家在年度風雲榜有名列前茅之成員，結業時獲賦「世家光環」稱號亮點標記（clanGloryHighlight）。
 * 2. 結業當季好感票加成：結業時依世家是否上榜發放導師/同窗好感票，數值由配表驅動，嚴禁程式碼硬編碼。
 */

export interface AcademyGraduationFavorConfig {
    /** 基礎結業好感票（預設 10） */
    baseFavorTickets: number;
    /** 入榜世家額外好感票加成（預設 5） */
    rankedClanBonusTickets: number;
    /** 單季好感票上限（預設 30） */
    maxSeasonFavorTickets: number;
}

export const DEFAULT_ACADEMY_GRADUATION_FAVOR_CONFIG: AcademyGraduationFavorConfig = {
    baseFavorTickets: 10,
    rankedClanBonusTickets: 5,
    maxSeasonFavorTickets: 30,
};

export interface AcademyGraduationLinkageQuery {
    /** 結業子嗣所屬世家是否有成員名列年度風雲榜 */
    hasRankedClanMember: boolean;
    /** 子嗣在學府期間已獲取的好感票數（可選） */
    accumulatedSeasonTickets?: number;
    /** 可選客製化配表 */
    config?: Partial<AcademyGraduationFavorConfig>;
}

export interface AcademyGraduationLinkageResult {
    /** 是否享有世家光環稱號亮點 */
    hasClanGloryHighlight: boolean;
    /** 本次結業獲贈之好感票數量 */
    awardedFavorTickets: number;
    /** 亮點稱號鍵值 */
    highlightTitleKey?: string;
}

/**
 * 計算學府結業連動成果（稱號亮點與好感票）
 *
 * @param query 查詢條件
 * @returns 結業連動成果
 */
export function calculateAcademyGraduationLinkage(
    query: AcademyGraduationLinkageQuery
): AcademyGraduationLinkageResult {
    const config: AcademyGraduationFavorConfig = {
        baseFavorTickets: query.config?.baseFavorTickets ?? DEFAULT_ACADEMY_GRADUATION_FAVOR_CONFIG.baseFavorTickets,
        rankedClanBonusTickets: query.config?.rankedClanBonusTickets ?? DEFAULT_ACADEMY_GRADUATION_FAVOR_CONFIG.rankedClanBonusTickets,
        maxSeasonFavorTickets: query.config?.maxSeasonFavorTickets ?? DEFAULT_ACADEMY_GRADUATION_FAVOR_CONFIG.maxSeasonFavorTickets,
    };

    const hasClanGloryHighlight = Boolean(query.hasRankedClanMember);
    const highlightTitleKey = hasClanGloryHighlight ? 'ui.academy.highlight.clan_glory' : undefined;

    let tickets = config.baseFavorTickets;
    if (hasClanGloryHighlight) {
        tickets += config.rankedClanBonusTickets;
    }

    const currentAccumulated = query.accumulatedSeasonTickets ?? 0;
    const remainingCap = Math.max(0, config.maxSeasonFavorTickets - currentAccumulated);
    const awardedFavorTickets = Math.min(tickets, remainingCap);

    return {
        hasClanGloryHighlight,
        awardedFavorTickets,
        highlightTitleKey,
    };
}