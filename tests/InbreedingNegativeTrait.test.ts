/**
 * InbreedingNegativeTrait.test.ts — 近親子嗣負面特質出現率 +50%（PROG-2-0507，BLT-05）headless 測試
 */
import { TestSuite, assert } from './TestRunner';
import { createNurtureSession, negativeFactorChance, NEGATIVE_FACTOR_CHANCE, executeRound } from '../assets/scripts/core/systems/NurtureSystem';
import { INBREEDING_NEGATIVE_TRAIT_BONUS } from '../assets/scripts/core/systems/BreedingSystem';
import { chooseFate, unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';

function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function child(bonus?: number): UnveilingGeneral {
    const general = chooseFate(unveilGeneral({
        id: 'alpha', name: '阿斗', faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [],
    } as unknown as UnveilingGeneral).general, 'accept');
    return bonus === undefined ? general : ({ ...general, negativeTraitRateBonus: bonus } as unknown as UnveilingGeneral);
}

export function createInbreedingNegativeTraitSuite(): TestSuite {
    const suite = new TestSuite('InbreedingNegativeTrait (近親負面特質 BLT-05)');

    suite.test('出現率：無加成維持 0.5，近親 +0.5 為 1.0，超過上限封頂 1', () => {
        assert.equals(NEGATIVE_FACTOR_CHANCE, negativeFactorChance(0));
        assert.equals(1, negativeFactorChance(INBREEDING_NEGATIVE_TRAIT_BONUS));
        assert.equals(1, negativeFactorChance(3));
        assert.equals(NEGATIVE_FACTOR_CHANCE, negativeFactorChance(-1), '負數視為 0');
    });

    suite.test('開場時把近親加成帶進會話；非近親為 0', () => {
        const inbred = createNurtureSession({ sessionId: 's1', child: child(INBREEDING_NEGATIVE_TRAIT_BONUS), mentors: [], startSeason: 1, random: seeded(1) });
        const normal = createNurtureSession({ sessionId: 's2', child: child(), mentors: [], startSeason: 1, random: seeded(1) });
        assert.equals(INBREEDING_NEGATIVE_TRAIT_BONUS, inbred.negativeTraitRateBonus!);
        assert.equals(0, normal.negativeTraitRateBonus!);
    });

    suite.test('近親會話的失敗回合更容易出現負面特質（同一亂數序列下，近親出現次數 ≥ 非近親）', () => {
        const runs = (bonus: number): number => {
            let session = createNurtureSession({ sessionId: 's', child: child(bonus), mentors: [], startSeason: 1, random: seeded(42) });
            const rng = seeded(7);
            let count = 0;
            for (let round = 0; round < 36; round++) {
                const before = session.negativeFactors.length;
                session = executeRound(session, 'str', rng).session;
                if (session.negativeFactors.length > before) count += 1;
                if (session.status !== 'active') break;
            }
            return count;
        };
        assert.isTrue(runs(INBREEDING_NEGATIVE_TRAIT_BONUS) >= runs(0));
    });

    suite.test('存讀後保留近親加成', () => {
        const session = createNurtureSession({ sessionId: 's', child: child(INBREEDING_NEGATIVE_TRAIT_BONUS), mentors: [], startSeason: 1, random: seeded(1) });
        const restored = JSON.parse(JSON.stringify(session));
        assert.equals(INBREEDING_NEGATIVE_TRAIT_BONUS, restored.negativeTraitRateBonus);
    });

    return suite;
}
