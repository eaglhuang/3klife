import { TestSuite, assert } from './TestRunner';
import { delegateOnLine, deputySupportLine, FOOD_EMPTY_LINE, foodShortMessage } from '../assets/scripts/core/systems/SortieDeployScripts';

export function createSortieDeployScriptsSuite(): TestSuite {
    const suite = new TestSuite('SortieDeployScripts');

    suite.test('後勤官句帶入姓名與軍糧上限加成', () => {
        assert.equals('後勤官 糜竺 押運補給，軍糧上限 +30！', deputySupportLine('糜竺', 30));
    });

    suite.test('沒有後勤官或加成為 0 時不顯示', () => {
        assert.equals(null, deputySupportLine(null, 30));
        assert.equals(null, deputySupportLine('糜竺', 0));
    });

    suite.test('委任句帶入主將姓名', () => {
        assert.equals('張飛 接管指揮權——委任自動出兵。', delegateOnLine('張飛'));
    });

    suite.test('糧草歸零才算耗盡，還有糧只是不足', () => {
        assert.equals(FOOD_EMPTY_LINE, foodShortMessage(0));
        assert.equals('糧草不足，無法部署', foodShortMessage(5));
    });

    return suite;
}
