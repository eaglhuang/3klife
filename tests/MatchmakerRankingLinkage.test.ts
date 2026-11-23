/**
 * MatchmakerRankingLinkage.test.ts
 *
 * 史境天下風雲榜與媒人候選名額連動單元測試 (PROG-2-9605)
 */

import { TestSuite, assert } from './TestRunner';
import {
    calculateMatchmakerCandidateCount,
    isClanRankedInAnnualBoard,
    DEFAULT_MATCHMAKER_RANKING_CONFIG,
} from '../assets/scripts/core/systems/marriage/MatchmakerRankingLinkage';

export function createMatchmakerRankingLinkageSuite(): TestSuite {
    const suite = new TestSuite('MatchmakerRankingLinkage (史境天下風雲榜與媒人候選名額連動 PROG-2-9605)');

    suite.test('應在家族未上榜時回傳預設 2 人名額', () => {
        const count = calculateMatchmakerCandidateCount({ hasRankedClanMember: false });
        assert(count === 2, '預期名額為 2');
        assert(count === DEFAULT_MATCHMAKER_RANKING_CONFIG.defaultCandidateCount, '應等於預設設定');
    });

    suite.test('應在家族有成員上榜時擴充為 4 人名額', () => {
        const count = calculateMatchmakerCandidateCount({ hasRankedClanMember: true });
        assert(count === 4, '預期名額為 4');
        assert(count === DEFAULT_MATCHMAKER_RANKING_CONFIG.rankedFamilyCandidateCount, '應等於入榜設定');
    });

    suite.test('應支援客製化配表覆蓋預設名額', () => {
        const customConfig = {
            defaultCandidateCount: 3,
            rankedFamilyCandidateCount: 6,
        };
        const countNormal = calculateMatchmakerCandidateCount({
            hasRankedClanMember: false,
            config: customConfig,
        });
        assert(countNormal === 3, '預期名額為 3');

        const countRanked = calculateMatchmakerCandidateCount({
            hasRankedClanMember: true,
            config: customConfig,
        });
        assert(countRanked === 6, '預期名額為 6');
    });

    suite.test('isClanRankedInAnnualBoard 判定邏輯正確性', () => {
        assert(!isClanRankedInAnnualBoard([], ['gen_01', 'gen_02']), '空家族成員清單應回傳 false');

        const clanMembers = ['clan_gen_01', 'clan_gen_02'];
        const rankedList = ['gen_cao_cao', 'gen_liu_bei'];
        assert(!isClanRankedInAnnualBoard(clanMembers, rankedList), '家族無人入榜應回傳 false');

        const rankedWithMember = ['clan_gen_02', 'gen_liu_bei'];
        assert(isClanRankedInAnnualBoard(clanMembers, rankedWithMember), '家族有成員入榜應回傳 true (Array)');

        const rankedSet = new Set(rankedWithMember);
        assert(isClanRankedInAnnualBoard(clanMembers, rankedSet), '家族有成員入榜應回傳 true (Set)');
    });

    return suite;
}