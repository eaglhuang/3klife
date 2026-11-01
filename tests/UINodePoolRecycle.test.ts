/**
 * UINodePoolRecycle.test.ts — 槽位回收只收片段根，執行期節點銷毀（PROG-2-1692）
 */
import { assert, TestSuite } from './TestRunner';
import { splitRecyclableChildren } from '../assets/scripts/ui/core/UINodePool';

export function createUINodePoolRecycleSuite(): TestSuite {
    const suite = new TestSuite('UINodePoolRecycle (槽位回收分流)');

    suite.test('片段根進池，子面板執行期節點銷毀', () => {
        const { recycle, destroy } = splitRecyclableChildren(['TabEquip', 'HeirloomCard', 'GearPick'], 'TabEquip');
        assert.equals('TabEquip', recycle.join(','));
        assert.equals('HeirloomCard,GearPick', destroy.join(','));
    });

    suite.test('片段根不明或已不在槽上時全部回收（舊行為）', () => {
        assert.equals(2, splitRecyclableChildren(['A', 'B'], null).recycle.length);
        assert.equals(0, splitRecyclableChildren(['A', 'B'], 'C').destroy.length);
    });

    return suite;
}
