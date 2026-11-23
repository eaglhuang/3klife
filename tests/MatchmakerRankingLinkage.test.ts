import {
    calculateMatchmakerCandidateCount,
    isClanRankedInAnnualBoard,
    DEFAULT_MATCHMAKER_RANKING_CONFIG,
} from '../assets/scripts/core/systems/marriage/MatchmakerRankingLinkage';

describe('MatchmakerRankingLinkage (PROG-2-9605)', () => {
    describe('calculateMatchmakerCandidateCount', () => {
        it('應在家族未上榜時回傳預設 2 人名額', () => {
            const count = calculateMatchmakerCandidateCount({ hasRankedClanMember: false });
            expect(count).toBe(2);
            expect(count).toBe(DEFAULT_MATCHMAKER_RANKING_CONFIG.defaultCandidateCount);
        });

        it('應在家族有成員上榜時擴充為 4 人名額', () => {
            const count = calculateMatchmakerCandidateCount({ hasRankedClanMember: true });
            expect(count).toBe(4);
            expect(count).toBe(DEFAULT_MATCHMAKER_RANKING_CONFIG.rankedFamilyCandidateCount);
        });

        it('應支援客製化配表覆蓋預設名額', () => {
            const customConfig = {
                defaultCandidateCount: 3,
                rankedFamilyCandidateCount: 6,
            };
            expect(
                calculateMatchmakerCandidateCount({
                    hasRankedClanMember: false,
                    config: customConfig,
                })
            ).toBe(3);

            expect(
                calculateMatchmakerCandidateCount({
                    hasRankedClanMember: true,
                    config: customConfig,
                })
            ).toBe(6);
        });
    });

    describe('isClanRankedInAnnualBoard', () => {
        it('空家族成員清單應回傳 false', () => {
            expect(isClanRankedInAnnualBoard([], ['gen_01', 'gen_02'])).toBe(false);
        });

        it('家族無人入榜應回傳 false', () => {
            const clanMembers = ['clan_gen_01', 'clan_gen_02'];
            const rankedList = ['gen_cao_cao', 'gen_liu_bei'];
            expect(isClanRankedInAnnualBoard(clanMembers, rankedList)).toBe(false);
        });

        it('家族有任一成員入榜應回傳 true（支援 Array 與 Set）', () => {
            const clanMembers = ['clan_gen_01', 'clan_gen_02'];
            const rankedList = ['clan_gen_02', 'gen_liu_bei'];
            expect(isClanRankedInAnnualBoard(clanMembers, rankedList)).toBe(true);

            const rankedSet = new Set(rankedList);
            expect(isClanRankedInAnnualBoard(clanMembers, rankedSet)).toBe(true);
        });
    });
});