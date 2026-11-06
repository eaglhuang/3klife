/**
 * SpiritMcqRules — Q51 幼兒低效內政、Q52 單場覺醒上限 1（SPI-13；PROG-2-1930）
 */
import { assert, TestSuite } from './TestRunner';
import {
    assignDomesticTask, createBattleAwakeningBudget, tryConsumeBattleAwakening,
} from '../assets/scripts/core/systems/SpiritMcqRules';

export function createSpiritMcqRulesSuite(): TestSuite {
    const suite = new TestSuite('SpiritMcqRules (SPI-13 Q51/Q52 PROG-2-1930)');

    suite.test('Q51：成年照常；未滿 15 歲只能做低效內政並套折扣', () => {
        assert.equals(JSON.stringify({ ok: true, efficiency: 1 }), JSON.stringify(assignDomesticTask(15, false, 0.3)));
        assert.equals(JSON.stringify({ ok: false, reason: 'CHILD_ONLY_LOW_EFFICIENCY' }), JSON.stringify(assignDomesticTask(14, false, 0.3)));
        assert.equals(JSON.stringify({ ok: true, efficiency: 0.3 }), JSON.stringify(assignDomesticTask(8, true, 0.3)));
        assert.equals(JSON.stringify({ ok: true, efficiency: 1 }), JSON.stringify(assignDomesticTask(8, true, 5)));
    });

    suite.test('Q52：每場最多覺醒 1 個，新一場重置', () => {
        const budget = createBattleAwakeningBudget();
        assert.isTrue(tryConsumeBattleAwakening(budget));
        assert.isFalse(tryConsumeBattleAwakening(budget));
        assert.isTrue(tryConsumeBattleAwakening(createBattleAwakeningBudget()));
    });

    return suite;
}
