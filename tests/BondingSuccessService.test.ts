/**
 * BondingSuccessService — PROG-2-10026 結緣透明加法、誠意累積與紅娘叩門保底測試
 */
import { TestSuite, assert } from './TestRunner';
import {
    MATCHMAKER_FALLBACK_RATE,
    calculateBondingProbability,
    shouldTriggerMatchmakerFallback,
} from '../assets/scripts/core/systems/BondingSuccessService';

export function createBondingSuccessServiceSuite(): TestSuite {
    const suite = new TestSuite('BondingSuccessService (結緣誠意累積與紅娘保底 PROG-2-10026)');

    suite.test('透明加法公式與誠意累積：K=1.0, F=0 起步，連拒兩次後第3次達 46%', () => {
        const try1 = calculateBondingProbability({ compatibilityK: 1.0, friendship: 0, rejectCount: 0 });
        assert.equals(try1.base, 0.25);
        assert.equals(try1.compatibilityBonus, 0.09);
        assert.equals(try1.friendshipBonus, 0);
        assert.equals(try1.sincerityBonus, 0);
        assert.equals(try1.total, 0.34);

        const try2 = calculateBondingProbability({ compatibilityK: 1.0, friendship: -12, rejectCount: 1 });
        assert.equals(try2.sincerityBonus, 0.12);
        assert.equals(try2.total, 0.4);

        const try3 = calculateBondingProbability({ compatibilityK: 1.0, friendship: -24, rejectCount: 2 });
        assert.equals(try3.sincerityBonus, 0.24);
        assert.equals(try3.total, 0.46);

        // 誠意累積上限 +36%
        const try5 = calculateBondingProbability({ compatibilityK: 1.0, friendship: -24, rejectCount: 5 });
        assert.equals(try5.sincerityBonus, 0.36);
    });

    suite.test('紅娘叩門保底：第1年第3季無配偶觸發，固定 80%，每個存檔僅觸發一次', () => {
        assert.equals(MATCHMAKER_FALLBACK_RATE, 0.8);
        assert.isTrue(!shouldTriggerMatchmakerFallback({ totalSeasonsElapsed: 1, hasSpouse: false, alreadyTriggered: false }));
        assert.isTrue(shouldTriggerMatchmakerFallback({ totalSeasonsElapsed: 2, hasSpouse: false, alreadyTriggered: false }));
        assert.isTrue(!shouldTriggerMatchmakerFallback({ totalSeasonsElapsed: 2, hasSpouse: true, alreadyTriggered: false }));
        assert.isTrue(!shouldTriggerMatchmakerFallback({ totalSeasonsElapsed: 2, hasSpouse: false, alreadyTriggered: true }));
    });

    return suite;
}
