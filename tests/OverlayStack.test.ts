/**
 * OverlayStack.test.ts — ESC 關最上層彈窗的判定（PROG-2-9164）
 */
import { assert, TestSuite } from './TestRunner';
import { pickTopOverlay } from '../assets/scripts/ui/core/OverlayStack';

export function createOverlayStackSuite(): TestSuite {
    const suite = new TestSuite('OverlayStack (PROG-2-9164 ESC 最上層)');

    suite.test('沒有開著的彈窗回傳 null', () => {
        assert.isTrue(pickTopOverlay([]) === null);
        assert.isTrue(pickTopOverlay([{ id: 'a', active: false, order: [3] }]) === null);
    });

    suite.test('同一父節點：siblingIndex 大者在最上層，關掉後換下一層', () => {
        const list = [
            { id: 'a', active: true, order: [2] },
            { id: 'b', active: true, order: [5] },
            { id: 'c', active: false, order: [9] },
        ];
        assert.equals('b', pickTopOverlay(list)!.id);
        list[1].active = false;
        assert.equals('a', pickTopOverlay(list)!.id);
        list[0].active = false;
        assert.isTrue(pickTopOverlay(list) === null);
    });

    suite.test('不同父節點：父層 index 大者整組在上面', () => {
        const top = pickTopOverlay([
            { id: 'deepInLow', active: true, order: [1, 9] },
            { id: 'shallowHigh', active: true, order: [2] },
        ]);
        assert.equals('shallowHigh', top!.id);
    });

    return suite;
}
