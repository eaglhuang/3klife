/**
 * AcademyRankingLinkage.test.ts
 *
 * 史境天下風雲榜與學府稱號亮點及結業好感票連動單元測試 (PROG-2-9613)
 */

import { TestSuite, assert } from './TestRunner';
import {
    calculateAcademyGraduationLinkage,
    DEFAULT_ACADEMY_GRADUATION_FAVOR_CONFIG,
} from '../assets/scripts/core/systems/nurture/AcademyRankingLinkage';

export function createAcademyRankingLinkageSuite(): TestSuite {
    const suite = new TestSuite('AcademyRankingLinkage (PROG-2-9613)');

    suite.test('世家未上榜時應發放基礎好感票且無稱號亮點', () => {
        const result = calculateAcademyGraduationLinkage({ hasRankedClanMember: false });
        assert.isFalse(result.hasClanGloryHighlight, '未上榜不應有世家光環');
        assert.equals(undefined, result.highlightTitleKey, '未上榜無亮點稱號鍵值');
        assert.equals(DEFAULT_ACADEMY_GRADUATION_FAVOR_CONFIG.baseFavorTickets, result.awardedFavorTickets, '應為基礎票數 10');
    });

    suite.test('世家有成員上榜時應發放基礎加加成票且賦予世家光環', () => {
        const result = calculateAcademyGraduationLinkage({ hasRankedClanMember: true });
        assert.isTrue(result.hasClanGloryHighlight, '上榜世家應享有世家光環');
        assert.equals('ui.academy.highlight.clan_glory', result.highlightTitleKey, '稱號鍵值應正確');
        const expectedTickets = DEFAULT_ACADEMY_GRADUATION_FAVOR_CONFIG.baseFavorTickets + DEFAULT_ACADEMY_GRADUATION_FAVOR_CONFIG.rankedClanBonusTickets;
        assert.equals(expectedTickets, result.awardedFavorTickets, '應為 10 + 5 = 15 票');
    });

    suite.test('應支援自定義配表覆蓋並遵守單季上限約束', () => {
        const customConfig = {
            baseFavorTickets: 12,
            rankedClanBonusTickets: 8,
            maxSeasonFavorTickets: 25,
        };

        // 已累積 15 票，本次應得 12+8=20，但受限於上限 25，只能發 10 票
        const cappedResult = calculateAcademyGraduationLinkage({
            hasRankedClanMember: true,
            accumulatedSeasonTickets: 15,
            config: customConfig,
        });
        assert.isTrue(cappedResult.hasClanGloryHighlight, '應有亮點');
        assert.equals(10, cappedResult.awardedFavorTickets, '受上限約束應發 10 票');

        // 已達或超過上限時應發 0 票
        const fullResult = calculateAcademyGraduationLinkage({
            hasRankedClanMember: true,
            accumulatedSeasonTickets: 25,
            config: customConfig,
        });
        assert.equals(0, fullResult.awardedFavorTickets, '滿額應發 0 票');
    });

    return suite;
}