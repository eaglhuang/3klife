/**
 * LastSpurt — 破釜沉舟殘局判定與 STR 軟上限（FORM-06；PROG-2-1925）
 */
import { assert, TestSuite } from './TestRunner';
import { isLastSpurtMode, lastSpurtDamage, lastSpurtStrFactor } from '../assets/scripts/core/systems/LastSpurt';

function near(expected: number, actual: number): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, `expected ${expected}, got ${actual}`);
}

export function createLastSpurtSuite(): TestSuite {
    const suite = new TestSuite('LastSpurt (破釜沉舟 FORM-06 PROG-2-1925)');

    suite.test('第 5 回合或存活不足一半進入殘局', () => {
        assert.isFalse(isLastSpurtMode(4, 0.5));
        assert.isTrue(isLastSpurtMode(5, 1));
        assert.isTrue(isLastSpurtMode(2, 0.49));
    });

    suite.test('STR 平方根係數：1200 以內照算，超過部分增量折半', () => {
        near(1, lastSpurtStrFactor(500));
        near(Math.sqrt(2.4), lastSpurtStrFactor(1200));
        const capped = Math.sqrt(2.4);
        near(capped + (Math.sqrt(4) - capped) * 0.5, lastSpurtStrFactor(2000));
        assert.isTrue(lastSpurtStrFactor(2000) < Math.sqrt(4));
        assert.equals(0, lastSpurtStrFactor(-5));
        near(100 * 1 * 1.2, lastSpurtDamage(100, 500, 1.2));
    });

    return suite;
}
