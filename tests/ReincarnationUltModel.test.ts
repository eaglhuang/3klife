/**
 * ReincarnationUltModel — 轉生上限與奧義精力階梯（doc_spec_0341；PROG-2-2026）
 */
import { assert, TestSuite } from './TestRunner';
import {
    canCastUltimate, clampStatToReincarnationCap, reincarnationStatCap, reincarnationTotalCap, ultimateVitalityCost, ultimateVitalityTierOf,
} from '../assets/scripts/core/systems/ReincarnationUltModel';

export function createReincarnationUltModelSuite(): TestSuite {
    const suite = new TestSuite('ReincarnationUltModel (轉生上限與奧義精力 doc_spec_0341 PROG-2-2026)');

    suite.test('§1.1 轉生階梯 0～5 轉，封頂 125', () => {
        assert.equals(100, reincarnationStatCap(0));
        assert.equals(115, reincarnationStatCap(3));
        assert.equals(125, reincarnationStatCap(9));
        assert.equals(100, reincarnationStatCap(-2));
        assert.equals(625, reincarnationTotalCap(5));
        assert.equals(105, clampStatToReincarnationCap(130, 1));
    });

    suite.test('§3 依基礎威力分階與門檻', () => {
        assert.equals('minor', ultimateVitalityTierOf(350).tier);
        assert.equals('mid', ultimateVitalityTierOf(351).tier);
        assert.equals('major', ultimateVitalityTierOf(800).tier);
        assert.isFalse(canCastUltimate(74, 600));
        assert.isTrue(canCastUltimate(75, 600));
    });

    suite.test('§3 減免取最大一項、不疊加', () => {
        assert.equals(70, ultimateVitalityCost(600));
        assert.equals(56, ultimateVitalityCost(600, { isInherited: true }));
        assert.equals(43, ultimateVitalityCost(450, { inResonance: true }));
        assert.equals(40, ultimateVitalityCost(450, { inResonance: true, hasGreenGene: true }));
    });

    return suite;
}
