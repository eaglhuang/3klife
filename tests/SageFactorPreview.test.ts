/**
 * 名士提前預覽（FUL-07，PROG-2-0446）
 *
 * 鎖住：只列出仍鎖住且等級還看不到的因子色系；已解鎖與已看得到的不列；
 * 方向去重、依基因順序；不回傳因子 ID。
 */
import { assert, TestSuite } from './TestRunner';
import { previewLockedFactorDirections } from '../assets/scripts/core/systems/SageFactorPreview';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const general = (genes: Array<{ id: string; type: string; isLocked?: boolean; discoveryLevel?: number }>): GeneralConfig =>
    ({ id: 'g1', name: '測試', genes }) as unknown as GeneralConfig;

export function createSageFactorPreviewSuite(): TestSuite {
    const suite = new TestSuite('SageFactorPreview (名士提前預覽方向 FUL-07)');

    suite.test('只列出鎖住且等級還看不到的色系：Lv1 時綠、紅、紫都列出，藍粉不列', () => {
        const g = general([
            { id: 'a', type: 'blue', isLocked: true },
            { id: 'b', type: 'green', isLocked: true },
            { id: 'c', type: 'red', isLocked: true },
            { id: 'd', type: 'pink', isLocked: true },
            { id: 'e', type: 'purple', isLocked: true },
        ]);
        assert.equals('green,purple,red', previewLockedFactorDirections(g, 1).slice().sort().join(','));
    });

    suite.test('已解鎖的因子不列出', () => {
        const g = general([{ id: 'b', type: 'green', isLocked: false }]);
        assert.equals(0, previewLockedFactorDirections(g, 1).length);
    });

    suite.test('等級已達門檻時，該色系不再列為提前預覽', () => {
        const g = general([{ id: 'b', type: 'green', isLocked: true }]);
        assert.equals(0, previewLockedFactorDirections(g, 20).length);
        assert.equals(1, previewLockedFactorDirections(g, 19).length);
    });

    suite.test('基因自身的 discoveryLevel 優先於色系預設', () => {
        const g = general([{ id: 'x', type: 'blue', isLocked: true, discoveryLevel: 10 }]);
        assert.equals('blue', previewLockedFactorDirections(g, 5).join(','));
        assert.equals(0, previewLockedFactorDirections(g, 10).length);
    });

    suite.test('方向去重、依基因順序；沒有武將回傳空陣列', () => {
        const g = general([
            { id: 'a', type: 'red', isLocked: true },
            { id: 'b', type: 'green', isLocked: true },
            { id: 'c', type: 'red', isLocked: true },
        ]);
        assert.equals('red,green', previewLockedFactorDirections(g, 1).join(','));
        assert.equals(0, previewLockedFactorDirections(undefined, 1).length);
    });

    return suite;
}
