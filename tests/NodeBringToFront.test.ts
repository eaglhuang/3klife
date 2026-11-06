/**
 * NodeBringToFront.test.ts — 結算窗顯示時移到最上層（PROG-2-1878）
 *
 * Unity 對照：Transform.SetAsLastSibling。
 */
import { bringNodeToFront, SiblingOrderNode } from '../assets/scripts/ui/core/NodeBringToFront';
import { TestSuite, assert } from './TestRunner';

function makeNode(index: number, count: number): SiblingOrderNode & { index: number } {
    const node = {
        index,
        parent: { children: { length: count } },
        getSiblingIndex: () => node.index,
        setSiblingIndex: (i: number) => { node.index = i; },
    };
    return node;
}

export function createNodeBringToFrontSuite(): TestSuite {
    const suite = new TestSuite('NodeBringToFront (結算窗置頂 PROG-2-1878)');

    suite.test('被後加圖層壓住時移到最後一位', () => {
        const node = makeNode(5, 19);
        assert.equals(true, bringNodeToFront(node));
        assert.equals(18, node.index);
    });

    suite.test('已在最上層時不動', () => {
        const node = makeNode(18, 19);
        assert.equals(false, bringNodeToFront(node));
        assert.equals(18, node.index);
    });

    suite.test('沒有父節點時不動', () => {
        const node = makeNode(0, 1);
        node.parent = null;
        assert.equals(false, bringNodeToFront(node));
    });

    return suite;
}
