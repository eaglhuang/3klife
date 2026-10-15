import { TestSuite, assert } from './TestRunner';
import { checkRecommendedLoadout } from '../assets/scripts/core/systems/LoadoutCheck';

export function createLoadoutCheckSuite(): TestSuite {
    const suite = new TestSuite('LoadoutCheck (推薦戰法三態 LVL-04)');

    suite.test('必備與高建議都涵蓋 → 已具備，無缺口', () => {
        const r = checkRecommendedLoadout(['water-shield', 'anti-chaos'], ['water-shield'], ['anti-chaos']);
        assert.equals('ready', r.state);
        assert.equals(0, r.gaps.length);
    });

    suite.test('只缺高建議 → 缺少，列出該缺口', () => {
        const r = checkRecommendedLoadout(['water-shield'], ['water-shield'], ['anti-chaos']);
        assert.equals('missing', r.state);
        assert.equals('anti-chaos', r.gaps[0]);
    });

    suite.test('缺必備 → 高風險，仍可挑戰', () => {
        const r = checkRecommendedLoadout([], ['water-shield'], ['anti-chaos']);
        assert.equals('high-risk', r.state);
        assert.equals(true, r.canChallenge);
        assert.equals(2, r.gaps.length);
    });

    suite.test('空的需求清單 → 已具備', () => {
        assert.equals('ready', checkRecommendedLoadout([], [], []).state);
    });

    return suite;
}
