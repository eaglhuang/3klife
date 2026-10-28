/**
 * RivalBonding.test.ts — 他國武將待命池與結緣配對純邏輯（E-7 最小切片，PROG-2-1507）
 */
import {
    BOND_FOOD_GATE, bondStep, pickBondPair, type AiGeneral,
} from '../assets/scripts/core/systems/RivalBonding';
import { TestSuite, assert } from './TestRunner';

const ROSTER: AiGeneral[] = [
    { id: 'c1', quality: 'C', recruitedSeason: 1 },
    { id: 'a1', quality: 'A', recruitedSeason: 1 },
    { id: 's-late', quality: 'S', recruitedSeason: 5 },
    { id: 's-early', quality: 'S', recruitedSeason: 3 },
];

export function createRivalBondingSuite(): TestSuite {
    const suite = new TestSuite('RivalBonding (他國武將結緣配對 E-7 PROG-2-1507)');

    suite.test('配對依品質高者先，同品質取先招募者', () => {
        const pair = pickBondPair(ROSTER);
        assert.isTrue(pair !== null);
        assert.equals('s-early', pair?.[0].id ?? '');
        assert.equals('s-late', pair?.[1].id ?? '');
    });

    suite.test('待命人數不足兩人時無法配對', () => {
        assert.isTrue(pickBondPair([]) === null);
        assert.isTrue(pickBondPair([ROSTER[0]]) === null);
    });

    suite.test('糧不超過門檻（2000）不結緣，原樣回傳', () => {
        const result = bondStep(ROSTER, [], BOND_FOOD_GATE, 8);
        assert.isTrue(result.roster === ROSTER);
        assert.equals(0, result.bonds.length);
    });

    suite.test('糧超過門檻時兩人離開待命池並記入 bonds，不改輸入', () => {
        const result = bondStep(ROSTER, [], BOND_FOOD_GATE + 1, 8);
        assert.equals(2, result.roster.length);
        assert.isTrue(result.roster.every((g) => g.id !== 's-early' && g.id !== 's-late'));
        assert.equals('s-early', result.bonds[0].first);
        assert.equals('s-late', result.bonds[0].second);
        assert.equals(8, result.bonds[0].season);
        assert.equals(4, ROSTER.length);
    });

    suite.test('人數不足兩人時即使糧足也不結緣', () => {
        const result = bondStep([ROSTER[0]], [], 9999, 8);
        assert.equals(1, result.roster.length);
        assert.equals(0, result.bonds.length);
    });

    return suite;
}
