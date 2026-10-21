import { assert, TestSuite } from './TestRunner';
import { BASE_RESOURCE_CAPS, clampResource, resourceShortageWarning } from '../assets/scripts/core/systems/ResourceCap';

export function createResourceCapSuite(): TestSuite {
    const suite = new TestSuite('ResourceCap (ECO-11 資源上限與不足提示)');

    suite.test('初始上限與經濟系統表一致', () => {
        assert.equals(10000, BASE_RESOURCE_CAPS.food);
        assert.equals(5000, BASE_RESOURCE_CAPS.gold);
        assert.equals(3000, BASE_RESOURCE_CAPS.troops);
        assert.equals(2000, BASE_RESOURCE_CAPS.fame);
    });

    suite.test('超出上限夾回上限，負數與非有限數夾回 0，範圍內不變', () => {
        assert.equals(10000, clampResource('food', 12345));
        assert.equals(0, clampResource('gold', -5));
        assert.equals(0, clampResource('troops', Number.NaN));
        assert.equals(1234, clampResource('fame', 1234));
    });

    suite.test('存量不足時回傳 UI_RES_LOW 字串，足夠（含相等）時回傳 null', () => {
        assert.equals('⚠ 黃金 存量不足！', resourceShortageWarning('gold', 99, 100) ?? '');
        assert.equals(null, resourceShortageWarning('gold', 100, 100));
        assert.equals(null, resourceShortageWarning('food', 500, 100));
    });

    return suite;
}
