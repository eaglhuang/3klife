/**
 * PowExtendedBranches — 俘虜四選一延伸分支（POW-09；PROG-2-1937）
 */
import { assert, TestSuite } from './TestRunner';
import {
    persuadeRateWithBondingCard, rollHeirloomDrop, rollReleaseEnlightenment, shouldBecomeInstructor,
} from '../assets/scripts/core/systems/PowExtendedBranches';

const T = { bondingCardBonus: 30, heirloomDropChance: 0.2, enlightenmentChance: 0.5 };

function seq(...values: number[]): () => number {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
}

export function createPowExtendedBranchesSuite(): TestSuite {
    const suite = new TestSuite('PowExtendedBranches (俘虜延伸分支 POW-09 PROG-2-1937)');

    suite.test('金蘭卡加成封頂 100；高齡成功勸降／招募轉教官', () => {
        assert.equals(50, persuadeRateWithBondingCard(20, true, T));
        assert.equals(20, persuadeRateWithBondingCard(20, false, T));
        assert.equals(100, persuadeRateWithBondingCard(90, true, T));
        assert.isTrue(shouldBecomeInstructor('persuade', true, 60, T));
        assert.isFalse(shouldBecomeInstructor('persuade', true, 59, T));
        assert.isFalse(shouldBecomeInstructor('recruit', false, 70, T));
        assert.isFalse(shouldBecomeInstructor('release', true, 70, T));
        assert.isTrue(shouldBecomeInstructor('recruit', true, 55, { ...T, instructorAge: 50 }));
    });

    suite.test('傳家寶依機率掉落；放走頓悟挑我方一人', () => {
        assert.isTrue(rollHeirloomDrop(() => 0.1, T));
        assert.isFalse(rollHeirloomDrop(() => 0.2, T));
        assert.isFalse(rollHeirloomDrop(() => Number.NaN, T));
        const hit = rollReleaseEnlightenment(['a', 'b'], 'tech-x', seq(0.1, 0.99), T);
        assert.equals('b', hit?.learnerId);
        assert.equals('tech-x', hit?.techniqueId);
        assert.equals(null, rollReleaseEnlightenment(['a'], 'tech-x', () => 0.6, T));
        assert.equals(null, rollReleaseEnlightenment([], 'tech-x', () => 0, T));
        assert.equals(null, rollReleaseEnlightenment(['a'], null, () => 0, T));
    });

    return suite;
}
