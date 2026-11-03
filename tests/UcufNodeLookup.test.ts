/**
 * UcufNodeLookup.test.ts — UCUF 節點依語意 id 查找（UI-2-0146，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { collectUcufNodes, findUcufNode, ucufIdOf } from '../assets/scripts/ui/core/UcufNodeLookup';

interface FakeNode {
    name: string;
    children: FakeNode[];
    _ucufId?: string;
}

function n(name: string, children: FakeNode[] = [], ucufId?: string): FakeNode {
    const node: FakeNode = { name, children };
    if (ucufId) node._ucufId = ucufId;
    return node;
}

function tree(): FakeNode {
    return n('Root', [
        n('div_3', [n('div_4', [], 'hall.title')], 'hall.topbar'),
        n('div_9', [n('div_10', [], 'hall.sandbox'), n('div_11', [], 'hall.title')], 'hall.sandbox-group'),
        n('div_12'),
    ]);
}

export function createUcufNodeLookupSuite(): TestSuite {
    const suite = new TestSuite('UcufNodeLookup');

    suite.test('依 id 找到深層節點，找不到回傳 null', () => {
        const root = tree();
        assert.equals(findUcufNode(root, 'hall.sandbox')?.name, 'div_10', '深層節點');
        assert.equals(findUcufNode(root, 'hall.missing'), null, '找不到');
    });

    suite.test('root 自己帶 id 時回傳 root', () => {
        const root = n('Root', [], 'hall.root');
        assert.equals(findUcufNode(root, 'hall.root'), root, 'root 本身');
    });

    suite.test('重複 id 取深度優先的第一個', () => {
        const root = tree();
        assert.equals(findUcufNode(root, 'hall.title')?.name, 'div_4', 'find 取第一個');
        assert.equals(collectUcufNodes(root).get('hall.title')?.name, 'div_4', 'collect 取第一個');
    });

    suite.test('collect 只收帶 id 的節點；空字串不算 id', () => {
        const root = tree();
        root.children[2]._ucufId = '';
        const map = collectUcufNodes(root);
        assert.equals([...map.keys()].sort().join(','), 'hall.sandbox,hall.sandbox-group,hall.title,hall.topbar', '收集結果');
        assert.equals(ucufIdOf(root.children[2]), null, '空字串');
    });

    return suite;
}
