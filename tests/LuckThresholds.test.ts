import { assert, TestSuite } from './TestRunner';
import {
    LUK_BLOODLINE_MUTATION_MIN,
    LUK_FORCE_TACTIC_COPY_MIN,
    LUK_MAX,
    luckThresholdEffects,
} from '../assets/scripts/core/systems/LuckThresholds';

export function createLuckThresholdsSuite(): TestSuite {
    const suite = new TestSuite('LuckThresholds (LUK-06 運氣特殊門檻)');

    suite.test('門檻常數與規格一致：80 / 95 / 100', () => {
        assert.equals(80, LUK_FORCE_TACTIC_COPY_MIN);
        assert.equals(95, LUK_BLOODLINE_MUTATION_MIN);
        assert.equals(100, LUK_MAX);
    });

    suite.test('低於 80 不觸發任何門檻', () => {
        for (const luk of [0, 1, 40, 79, 79.9]) {
            const e = luckThresholdEffects(luk);
            assert.isFalse(e.forceTacticCopy, `LUK ${luk}`);
            assert.isFalse(e.bloodlineMutation, `LUK ${luk}`);
            assert.isFalse(e.fateInheritance, `LUK ${luk}`);
        }
    });

    suite.test('80 ～ 94：只觸發戰法強制複製', () => {
        for (const luk of [80, 90, 94.9]) {
            const e = luckThresholdEffects(luk);
            assert.isTrue(e.forceTacticCopy, `LUK ${luk}`);
            assert.isFalse(e.bloodlineMutation, `LUK ${luk}`);
            assert.isFalse(e.fateInheritance, `LUK ${luk}`);
        }
    });

    suite.test('95 ～ 99：戰法複製與血統變異同時觸發，天命傳承不觸發', () => {
        for (const luk of [95, 99, 99.9]) {
            const e = luckThresholdEffects(luk);
            assert.isTrue(e.forceTacticCopy, `LUK ${luk}`);
            assert.isTrue(e.bloodlineMutation, `LUK ${luk}`);
            assert.isFalse(e.fateInheritance, `LUK ${luk}`);
        }
    });

    suite.test('= 100：三個門檻全部觸發；超過上限以 100 計', () => {
        const e = luckThresholdEffects(100);
        assert.isTrue(e.forceTacticCopy && e.bloodlineMutation && e.fateInheritance);
        assert.equals(JSON.stringify(e), JSON.stringify(luckThresholdEffects(150)));
    });

    suite.test('缺省、負數、非有限值視為 0，三個旗標皆 false', () => {
        for (const luk of [-50, NaN, Infinity, -Infinity]) {
            const e = luckThresholdEffects(luk);
            assert.isFalse(e.forceTacticCopy, `LUK ${luk}`);
            assert.isFalse(e.bloodlineMutation, `LUK ${luk}`);
            assert.isFalse(e.fateInheritance, `LUK ${luk}`);
        }
    });

    return suite;
}
