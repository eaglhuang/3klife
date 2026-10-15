import { assert, TestSuite } from './TestRunner';
import { FACTOR_DISCOVERY_LEVEL, FactorColor } from '../assets/scripts/core/systems/FactorInheritance';
import { getFactorVisibility, isGeneFactorVisible } from '../assets/scripts/core/systems/FactorVisibility';

export function createFactorVisibilitySuite(): TestSuite {
    const suite = new TestSuite('FactorVisibility (FUL-01 因子可見性)');
    for (const [level, colors] of [
        [1, ['blue', 'pink']], [20, ['blue', 'pink']],
        [21, ['blue', 'pink', 'green', 'white']], [45, ['blue', 'pink', 'green', 'white']],
        [46, ['blue', 'pink', 'green', 'purple', 'white', 'red']],
    ] as const) {
        suite.test(`等級 ${level} 的可見色系與鎖定門檻`, () => {
            const result = getFactorVisibility(level);
            assert.equals(6, Object.keys(result).length);
            for (const color of Object.keys(result) as FactorColor[]) {
                const entry = result[color];
                const expected = (colors as readonly string[]).includes(color);
                assert.equals(expected, entry.visible, color);
                assert.equals(expected ? 'visible' : 'locked', entry.status);
                if (!entry.visible) assert.equals(FACTOR_DISCOVERY_LEVEL[color], entry.requiredLevel);
                assert.equals(expected, isGeneFactorVisible({ type: color }, level));
            }
        });
    }
    suite.test('零、負數與非有限玩家等級視為 1', () => {
        for (const level of [0, -20, NaN, Infinity]) {
            assert.equals(JSON.stringify(getFactorVisibility(1)), JSON.stringify(getFactorVisibility(level)));
            assert.isTrue(isGeneFactorVisible({ type: 'blue' }, level));
            assert.isFalse(isGeneFactorVisible({ type: 'green' }, level));
        }
    });
    suite.test('單因子門檻優先，零門檻不被忽略；null 回到色系', () => {
        assert.isTrue(isGeneFactorVisible({ type: 'red', discoveryLevel: 5 }, 6));
        assert.isFalse(isGeneFactorVisible({ type: 'red', discoveryLevel: 5 }, 5), '> 門檻才可見');
        assert.isFalse(isGeneFactorVisible({ type: 'blue', discoveryLevel: 50 }, 49));
        assert.isFalse(isGeneFactorVisible({ type: 'blue', discoveryLevel: 50 }, 50));
        assert.isTrue(isGeneFactorVisible({ type: 'blue', discoveryLevel: 50 }, 51));
        assert.isTrue(isGeneFactorVisible({ type: 'purple', discoveryLevel: 0 }, 1));
        assert.isFalse(isGeneFactorVisible({ type: 'red', discoveryLevel: null }, 44));
    });
    suite.test('沿用顏色正規化；未知色系視為 Lv1（PROG-2-0513 PM 裁定，與 FactorMask 一致）', () => {
        assert.isTrue(isGeneFactorVisible({ type: ' BLUE ' }, 1));
        assert.isTrue(isGeneFactorVisible({ type: '綠' }, 21));
        assert.isFalse(isGeneFactorVisible({ type: '綠' }, 20));
        for (const type of ['unknown', 'toString', '', null, undefined]) {
            assert.isTrue(isGeneFactorVisible({ type }, 1), `${String(type)} 在 Lv1 可見`);
            assert.isTrue(isGeneFactorVisible({ type, discoveryLevel: 1 }, 1));
            assert.isFalse(isGeneFactorVisible({ type, discoveryLevel: 50 }, 49), '覆寫門檻仍然生效');
        }
    });
    suite.test('不改輸入、回傳不共享，無效單因子門檻鎖定', () => {
        const gene = Object.freeze({ type: 'red', discoveryLevel: 45 });
        assert.isFalse(isGeneFactorVisible(gene, 45));
        assert.isTrue(isGeneFactorVisible(gene, 46));
        assert.equals(45, gene.discoveryLevel);
        const first = getFactorVisibility(1);
        first.red = { status: 'visible', visible: true };
        assert.isFalse(getFactorVisibility(1).red.visible);
        assert.equals(45, FACTOR_DISCOVERY_LEVEL.red);
        for (const discoveryLevel of [NaN, Infinity]) {
            assert.isFalse(isGeneFactorVisible({ type: 'blue', discoveryLevel }, 999));
        }
    });
    return suite;
}
