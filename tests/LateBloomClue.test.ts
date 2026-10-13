/**
 * LateBloomClue.test.ts — 大器晚成線索 headless 測試（PROG-2-0316 / WBS VIT-07）
 *
 * Unity 對照：EditMode Test 驗證觸發條件，不建立 UI。
 */
import { assert, TestSuite } from './TestRunner';
import { LATE_BLOOM_CLUE_TEXT, lateBloomClueText } from '../assets/scripts/core/systems/LateBloomClue';

export function createLateBloomClueSuite(): TestSuite {
    const suite = new TestSuite('LateBloomClue (大器晚成線索 VIT-07)');

    suite.test('精力低於上限 20% 時出現線索文案', () => {
        assert.equals(LATE_BLOOM_CLUE_TEXT, lateBloomClueText(19, 100));
        assert.equals(LATE_BLOOM_CLUE_TEXT, lateBloomClueText(0, 100));
    });

    suite.test('精力恰好 20% 或以上不出現線索', () => {
        assert.isTrue(lateBloomClueText(20, 100) === null);
        assert.isTrue(lateBloomClueText(80, 100) === null);
    });

    suite.test('上限不合法（0、負數、NaN）時不給線索', () => {
        assert.isTrue(lateBloomClueText(0, 0) === null);
        assert.isTrue(lateBloomClueText(5, -1) === null);
        assert.isTrue(lateBloomClueText(Number.NaN, 100) === null);
    });

    return suite;
}
