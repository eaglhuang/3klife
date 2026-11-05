import { TestSuite, assert } from './TestRunner';
import { matchRumorLine, rumorTopTrait, rumorTotalTitle } from '../assets/scripts/core/systems/MatchRumor';

const even = (each: number) => ({ str: each, int: each, lea: each, pol: each, cha: each });

export function createMatchRumorSuite(): TestSuite {
    const suite = new TestSuite('MatchRumor');

    suite.test('五維總和評語的區間邊界照規格', () => {
        for (const [each, title] of [[49, '凡俗之姿'], [50, '良家子弟'], [65, '良家子弟'], [66, '一時俊彥'], [77, '一時俊彥'], [78, '國士之風'], [87, '國士之風'], [88, '天縱奇才']] as const) {
            assert.equals(title, rumorTotalTitle(even(each)));
        }
        assert.equals('凡俗之姿', rumorTotalTitle({ str: 100, int: 100 }));
        assert.equals('良家子弟', rumorTotalTitle({ str: 100, int: 100, lea: 50 }));
    });

    suite.test('最高單項的區間邊界照規格', () => {
        for (const [value, word] of [[49, '平庸'], [50, '幹練'], [69, '幹練'], [70, '出眾'], [84, '出眾'], [85, '絕倫'], [94, '絕倫'], [95, '曠世無雙']] as const) {
            assert.equals(`才思${word}`, rumorTopTrait({ str: 1, int: value, lea: 1, pol: 1, cha: 1 }));
        }
    });

    suite.test('取最高單項；同分取前面的，運勢不算', () => {
        assert.equals('風儀幹練', rumorTopTrait({ str: 40, int: 40, lea: 40, pol: 40, cha: 60 }));
        assert.equals('武骨出眾', rumorTopTrait({ str: 80, int: 80 }));
        assert.equals('武骨幹練', rumorTopTrait({ str: 60, luk: 99 } as never));
    });

    suite.test('缺能力值不會壞；整句格式照 §H、不露數字', () => {
        assert.equals('鄉評風聞：凡俗之姿｜顯著家風：武骨平庸', matchRumorLine({}));
        const line = matchRumorLine({ str: 60, int: 92, lea: 70, pol: 80, cha: 75 });
        assert.equals('鄉評風聞：一時俊彥｜顯著家風：才思絕倫', line);
        assert.isFalse(/[0-9]/.test(line));
    });

    return suite;
}
