/**
 * AwakeningTitle.test.ts — 覺醒名號判定（BLT-08，headless）
 *
 * Unity 對照：EditMode Test，只驗證規則表的輸入輸出，不開 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import { evaluateAwakeningTitle, isAwakeningGenius } from '../assets/scripts/core/systems/AwakeningTitle';

export function createAwakeningTitleSuite(): TestSuite {
    const suite = new TestSuite('AwakeningTitle');

    suite.test('天才條件三擇一：S 且五維 ≥ 460、EP ≥ 95、同標籤 ≥ 5', () => {
        const stats = { str: 80, int: 80, lea: 80, pol: 80, cha: 80, luk: 80 };
        assert.isTrue(isAwakeningGenius({ graduationRank: 'S', graduationStats: stats, ep: 50 }));
        assert.isFalse(isAwakeningGenius({ graduationRank: 'A', graduationStats: stats, ep: 50 }));
        assert.isTrue(isAwakeningGenius({ ep: 95 }));
        assert.isFalse(isAwakeningGenius({ ep: 94 }));
        assert.isTrue(isAwakeningGenius({ ep: 10, ancestorTagCounts: { fire: 5 } }));
        assert.isFalse(isAwakeningGenius({ ep: 10, ancestorTagCounts: { fire: 4 } }));
    });

    suite.test('非天才不給名號', () => {
        const result = evaluateAwakeningTitle({ ep: 60, graduationStats: { int: 95 } });
        assert.isFalse(result.isGenius);
        assert.equals(null, result.title);
    });

    suite.test('名號依規格表列順序比對：14 人全騎兵優先成為常山真龍', () => {
        const result = evaluateAwakeningTitle({ ep: 99, ancestorTagCounts: { cavalry: 14 }, graduationStats: { str: 95 } });
        assert.equals('常山真龍', result.title);
        assert.equals('cavalry-aptitude-s', result.effectId);
        assert.equals('麒麟', evaluateAwakeningTitle({ ep: 98, graduationStats: { str: 95 } }).title);
        assert.equals('虎膽龍威', evaluateAwakeningTitle({ ep: 95, graduationStats: { str: 90, int: 85 } }).title);
        assert.equals('鬼才後裔', evaluateAwakeningTitle({ ep: 95, graduationStats: { int: 80 } }).title);
    });

    suite.test('天才但未命中任何名號：只標記天才，名號為 null', () => {
        const result = evaluateAwakeningTitle({ ep: 96, graduationStats: { str: 10, int: 10 } });
        assert.isTrue(result.isGenius);
        assert.equals(null, result.title);
        assert.equals(null, result.effectId);
    });

    return suite;
}
