/**
 * NurtureEvents.test.ts — 培育受傷與好感事件擲骰（NUR-09，headless）
 *
 * Unity 對照：EditMode Test，只驗證擲骰結果與亂數消耗順序，不開 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import { NURTURE_AFFECTION_CHANCE, NURTURE_INJURY_CHANCE, rollNurtureRoundEvents } from '../assets/scripts/core/systems/NurtureEvents';

export function createNurtureEventsSuite(): TestSuite {
    const suite = new TestSuite('NurtureEvents');

    suite.test('休息回合不擲事件，也不消耗亂數', () => {
        let calls = 0;
        const result = rollNurtureRoundEvents(false, () => { calls++; return 0; });
        assert.isFalse(result.injured);
        assert.isFalse(result.affection);
        assert.equals(0, calls);
    });

    suite.test('受傷優先：擲中受傷就不再擲好感', () => {
        let calls = 0;
        const result = rollNurtureRoundEvents(true, () => { calls++; return 0; });
        assert.isTrue(result.injured);
        assert.isFalse(result.affection);
        assert.equals(1, calls);
    });

    suite.test('未受傷時依序擲好感', () => {
        const values = [NURTURE_INJURY_CHANCE, NURTURE_AFFECTION_CHANCE - 0.001];
        let i = 0;
        const result = rollNurtureRoundEvents(true, () => values[i++]);
        assert.isFalse(result.injured);
        assert.isTrue(result.affection);
        assert.equals(2, i);
    });

    return suite;
}
