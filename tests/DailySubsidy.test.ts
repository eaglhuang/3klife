/**
 * DailySubsidy.test.ts — 每日補貼判定與入帳 headless 測試（ECO-06 / PROG-2-1309）
 *
 * 鎖住：只補低於門檻的資源、補固定量；同一天只領一次；沒有資源低於門檻時不算領取；
 * 隔日可再領。
 *
 * Unity 對照：每日登入獎勵先比對上次領取日，符合條件才 Add 固定量，再記下今天。
 */
import { assert, TestSuite } from './TestRunner';
import { dailySubsidyOf, SubsidyResources } from '../assets/scripts/core/systems/DailySubsidy';

const RICH: SubsidyResources = { food: 5000, gold: 3000, troops: 2000 };

export function createDailySubsidySuite(): TestSuite {
    const suite = new TestSuite('DailySubsidy (每日補貼 ECO-06 / PROG-2-1309)');

    suite.test('只補低於門檻的資源，補固定量，並記下今日', () => {
        const result = dailySubsidyOf({ food: 1000, gold: 600, troops: 500 }, null, 10);
        assert.isTrue(result.claimed);
        assert.equals(1400, result.resources.food);
        assert.equals(600, result.resources.gold);
        assert.equals(700, result.resources.troops);
        assert.equals(400, result.grants.food!);
        assert.isTrue(result.grants.gold === undefined);
        assert.equals(10, result.lastClaimDay!);
    });

    suite.test('同一天只領一次，即使仍低於門檻', () => {
        const result = dailySubsidyOf({ food: 100, gold: 100, troops: 100 }, 10, 10);
        assert.isFalse(result.claimed);
        assert.equals(100, result.resources.food);
        assert.equals(10, result.lastClaimDay!);
    });

    suite.test('沒有資源低於門檻時不算領取，上次領取日維持原值', () => {
        const result = dailySubsidyOf(RICH, 7, 8);
        assert.isFalse(result.claimed);
        assert.equals(7, result.lastClaimDay!);
        assert.equals(5000, result.resources.food);
    });

    suite.test('隔日若仍低於門檻可再領', () => {
        const first = dailySubsidyOf({ food: 1000, gold: 3000, troops: 2000 }, 10, 11);
        assert.isTrue(first.claimed);
        assert.equals(1400, first.resources.food);
        assert.equals(11, first.lastClaimDay!);
    });

    return suite;
}
