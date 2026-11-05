import { TestSuite, assert } from './TestRunner';
import { applyEpBonus, epBonusOdds, epContribLine, meanEpBonus, parentLegacyEp, rollEpBonus } from '../assets/scripts/core/systems/EpLegacyBonus';

function closeTo(expected: number, actual: number): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, `expected ${expected}, got ${actual}`);
}

export function createEpLegacyBonusSuite(): TestSuite {
    const suite = new TestSuite('EpLegacyBonus');

    suite.test('R4 golden：E74、E76、E94 的分布與均值', () => {
        [[74, [0.356, 0.3, 0.2472, 0.0968], 5.424], [76, [0.3425, 0.2975, 0.255, 0.105], 5.6125], [94, [0.2075, 0.2525, 0.345, 0.195], 7.6375]].forEach(([ep, odds, mean]) => {
            const actual = epBonusOdds(ep as number);
            (odds as number[]).forEach((odd, i) => closeTo(odd, actual[i]));
            closeTo(mean as number, meanEpBonus(ep as number));
        });
    });

    suite.test('錨點均值，95 以上封頂，負值視為 0', () => {
        closeTo(1.1, meanEpBonus(0));
        closeTo(2.15, meanEpBonus(25));
        closeTo(3.6, meanEpBonus(50));
        closeTo(5.5, meanEpBonus(75));
        closeTo(7.75, meanEpBonus(95));
        closeTo(7.75, meanEpBonus(100));
        closeTo(1.1, meanEpBonus(-5));
    });

    suite.test('每多 1 EP 的均值都不下降，機率和為 1', () => {
        for (let ep = 0; ep <= 100; ep++) {
            closeTo(1, epBonusOdds(ep).reduce((sum, odd) => sum + odd, 0));
            if (ep > 0) assert.isTrue(meanEpBonus(ep) >= meanEpBonus(ep - 1));
        }
    });

    suite.test('抽樣只會出現表上的值，依累積區間', () => {
        assert.equals(0, rollEpBonus(50, () => 0));
        assert.equals(5, rollEpBonus(50, () => 0.5));
        assert.equals(10, rollEpBonus(50, () => 0.85));
        assert.equals(15, rollEpBonus(50, () => 0.99));
        assert.equals(15, rollEpBonus(95, () => 0.999999));
    });

    suite.test('五維上限 100，原本超過的不往下壓', () => {
        assert.equals(55, applyEpBonus(50, 5));
        assert.equals(100, applyEpBonus(95, 15));
        assert.equals(120, applyEpBonus(120, 5));
    });

    suite.test('雙親平均與畫面句', () => {
        assert.equals(80, parentLegacyEp(90, 70));
        assert.equals('雙親生平功業（父 EP 90 / 母 EP 70）已平滑加成此胎先天根骨分佈', epContribLine(90, 70));
    });

    return suite;
}
