/**
 * ChildUltimateAwaken.test.ts — 子嗣奧義覺醒機率與繼承紀錄（ULT-15）headless 測試
 *
 * 鎖住：機率為綠色因子等級 × 0.05 並夾在 [0, 1]；沒有對應綠色因子一律不覺醒；
 * roll 採嚴格小於；覺醒的奧義只記一次，且記為 level 1、繼承、來源父方。
 */
import { assert, TestSuite } from './TestRunner';
import {
    childUltimateAwakenChance,
    rollChildUltimateAwaken,
    unlockInheritedUltimate,
    type InheritedUltimate,
} from '../assets/scripts/core/systems/ChildUltimateAwaken';

export function createChildUltimateAwakenSuite(): TestSuite {
    const suite = new TestSuite('ChildUltimateAwaken (子嗣奧義覺醒 ULT-15)');

    suite.test('機率為綠色因子等級 × 0.05', () => {
        assert.equals(0.15, Math.round(childUltimateAwakenChance(3) * 100) / 100);
        assert.equals(0, childUltimateAwakenChance(0));
    });

    suite.test('機率夾在 [0, 1]，非法等級視為 0', () => {
        assert.equals(1, childUltimateAwakenChance(100));
        assert.equals(0, childUltimateAwakenChance(-2));
        assert.equals(0, childUltimateAwakenChance(Number.NaN));
    });

    suite.test('沒有對應綠色因子時一律不覺醒', () => {
        assert.isFalse(rollChildUltimateAwaken(5, false, 0));
    });

    suite.test('roll 採嚴格小於：等於機率值不覺醒', () => {
        const chance = childUltimateAwakenChance(4);
        assert.isTrue(rollChildUltimateAwaken(4, true, chance - 0.0001));
        assert.isFalse(rollChildUltimateAwaken(4, true, chance));
    });

    suite.test('同一奧義只記一次，且記為 level 1、繼承、來源父方', () => {
        const first = unlockInheritedUltimate([], 'zhao-yun-7', 'father-uid');
        assert.isTrue(first.added);
        assert.equals(1, first.list.length);
        const entry: InheritedUltimate = first.list[0];
        assert.equals(1, entry.level);
        assert.isTrue(entry.isInherited);
        assert.equals('father-uid', entry.sourceParentUid);

        const again = unlockInheritedUltimate(first.list, 'zhao-yun-7', 'other-uid');
        assert.isFalse(again.added);
        assert.equals(1, again.list.length);
    });

    suite.test('unlockInheritedUltimate 不修改輸入清單', () => {
        const owned: InheritedUltimate[] = [];
        unlockInheritedUltimate(owned, 'x', 'p');
        assert.equals(0, owned.length);
    });

    return suite;
}
