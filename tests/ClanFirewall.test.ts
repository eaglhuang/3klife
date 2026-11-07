/**
 * ClanFirewall — 近親衰減、同宗不相殘、質重於量（SPI-10；PROG-2-1963）
 */
import { assert, TestSuite } from './TestRunner';
import {
    battleMeritForClan, kinshipScoreEfficiency, qualityWeightedReturn,
} from '../assets/scripts/core/systems/ClanFirewall';

function near(expected: number, actual: number): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, `expected ${expected}, got ${actual}`);
}

export function createClanFirewallSuite(): TestSuite {
    const suite = new TestSuite('ClanFirewall (家族防火牆 SPI-10 PROG-2-1963)');

    suite.test('同宗互戰功勳減半；異姓或無姓不打折', () => {
        assert.equals(50, battleMeritForClan(100, 'GUAN', 'GUAN'));
        assert.equals(100, battleMeritForClan(100, 'GUAN', 'CAO'));
        assert.equals(100, battleMeritForClan(100, null, null));
        assert.equals(0, battleMeritForClan(-3, 'GUAN', 'GUAN'));
    });

    suite.test('近親效率隨血脈疲勞下降並有下限', () => {
        near(1, kinshipScoreEfficiency(0, 0.15, 0.4));
        near(0.7, kinshipScoreEfficiency(2, 0.15, 0.4));
        near(0.4, kinshipScoreEfficiency(9, 0.15, 0.4));
        near(1, kinshipScoreEfficiency('x', 0.15, 0.4));
    });

    suite.test('質重於量：低品質合計封頂，無高品質時照計', () => {
        const lows = Array.from({ length: 50 }, () => ({ qualityWeight: 1, lowQuality: true }));
        near(10 + 5, qualityWeightedReturn([{ qualityWeight: 10, lowQuality: false }, ...lows], 0.5));
        near(10 + 2, qualityWeightedReturn([{ qualityWeight: 10, lowQuality: false }, ...lows.slice(0, 2)], 0.5));
        near(50, qualityWeightedReturn(lows, 0.5));
        near(0, qualityWeightedReturn([], 0.5));
    });

    return suite;
}
