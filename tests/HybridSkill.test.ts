/**
 * HybridSkill.test.ts — 混種戰法觸發判定（BLT-09，headless）
 *
 * Unity 對照：EditMode Test，只驗證觸發器的機率與亂數消耗，不開 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import { hybridTriggerChance, isHybridWindowRound, rollHybridTrigger } from '../assets/scripts/core/systems/HybridSkill';

export function createHybridSkillSuite(): TestSuite {
    const suite = new TestSuite('HybridSkill');
    const fire = { domain: '火' };
    const water = { domain: '水' };

    suite.test('視窗為第 15~25 回合（含端點）', () => {
        assert.isFalse(isHybridWindowRound(14));
        assert.isTrue(isHybridWindowRound(15));
        assert.isTrue(isHybridWindowRound(25));
        assert.isFalse(isHybridWindowRound(26));
    });

    suite.test('雙方都有不同領域的戰法來源才有 5% 機率', () => {
        assert.equals(0.05, hybridTriggerChance(20, fire, water));
        assert.equals(0, hybridTriggerChance(20, fire, fire), '同領域不混種');
        assert.equals(0, hybridTriggerChance(20, fire, undefined), '一方沒有來源');
        assert.equals(0, hybridTriggerChance(14, fire, water), '視窗外');
    });

    suite.test('擲骰：機率為 0 時不消耗亂數；有機率時依門檻判定', () => {
        let calls = 0;
        const counting = () => { calls++; return 0; };
        assert.isFalse(rollHybridTrigger(5, fire, water, counting));
        assert.equals(0, calls);
        assert.isTrue(rollHybridTrigger(20, fire, water, () => 0.04));
        assert.isFalse(rollHybridTrigger(20, fire, water, () => 0.05));
    });

    return suite;
}
