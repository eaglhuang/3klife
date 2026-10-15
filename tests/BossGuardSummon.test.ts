import { TestSuite, assert } from './TestRunner';
import { isBossGuardSummonDue } from '../assets/scripts/core/systems/BossGuardSummon';

export function createBossGuardSummonSuite(): TestSuite {
    const suite = new TestSuite('BossGuardSummon (Boss 親衛隊召喚 LVL-11)');

    suite.test('血量降至 50% 時觸發（含等號）', () => {
        assert.isTrue(isBossGuardSummonDue(500, 1000, true, false));
    });

    suite.test('血量高於 50% 不觸發', () => {
        assert.isFalse(isBossGuardSummonDue(501, 1000, true, false));
    });

    suite.test('同一場只觸發一次', () => {
        assert.isFalse(isBossGuardSummonDue(100, 1000, true, true));
    });

    suite.test('非 Boss 不觸發', () => {
        assert.isFalse(isBossGuardSummonDue(100, 1000, false, false));
    });

    suite.test('maxHp 不合理時不觸發', () => {
        assert.isFalse(isBossGuardSummonDue(0, 0, true, false));
    });

    return suite;
}
