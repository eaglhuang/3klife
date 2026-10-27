/**
 * BloodlineTreeFragmentNaming.test.ts — 命頁 14 人樹的節點命名與底座 BloodlineTreeBinding 一致（PROG-2-1273）headless 測試
 *
 * 不開 Cocos：讀 gd-tab-bloodline.json，確認三排容器各自的先祖卡節點名稱等於 treeCardNodeName，
 * 且與 bindTreeCards 配出的節點名稱逐一相同（8＋4＋2 = 14）。
 */
import { assert, TestSuite } from './TestRunner';
import { treeCardNodeName, bindTreeCards } from '../assets/scripts/core/systems/BloodlineTreeBinding';
import type { NodeCardView } from '../assets/scripts/core/systems/BloodlineNodeCards';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

interface LayoutNode { name?: string; children?: LayoutNode[] }

function findNode(node: LayoutNode, name: string): LayoutNode | null {
    if (node.name === name) return node;
    for (const child of node.children ?? []) {
        const found = findNode(child, name);
        if (found) return found;
    }
    return null;
}

function cardNames(container: LayoutNode | null): string[] {
    return (container?.children ?? [])
        .map((child) => child.name ?? '')
        .filter((name) => name.startsWith('NodeCard_G'));
}

export function createBloodlineTreeFragmentNamingSuite(): TestSuite {
    const suite = new TestSuite('BloodlineTreeFragmentNaming (命頁 14 人樹命名 PROG-2-1273)');
    const fragmentPath = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'fragments', 'layouts', 'gd-tab-bloodline.json');
    const root = JSON.parse(fs.readFileSync(fragmentPath, 'utf8')) as LayoutNode;

    suite.test('三排容器各有 8／4／2 個先祖卡節點，名稱等於 treeCardNodeName', () => {
        const expected: Array<[string, 1 | 2 | 3, number]> = [['Gen1Container', 1, 8], ['Gen2Container', 2, 4], ['Gen3Container', 3, 2]];
        for (const [containerName, row, count] of expected) {
            const names = cardNames(findNode(root, containerName));
            assert.equals(count, names.length);
            for (let i = 0; i < count; i++) {
                assert.isTrue(names.includes(treeCardNodeName(row, i)));
            }
        }
    });

    suite.test('命頁節點名稱與 bindTreeCards 配出的節點名稱逐一相同', () => {
        const cards: NodeCardView[] = [];
        for (const row of [1, 2, 3] as const) {
            const count = row === 1 ? 8 : row === 2 ? 4 : 2;
            for (let i = 0; i < count; i++) cards.push({ row, empty: true, name: '', location: '' } as unknown as NodeCardView);
        }
        const bound = bindTreeCards(cards).map((target) => target.nodeName).sort();
        const fromFragment = [
            ...cardNames(findNode(root, 'Gen1Container')),
            ...cardNames(findNode(root, 'Gen2Container')),
            ...cardNames(findNode(root, 'Gen3Container')),
        ].sort();
        assert.equals(bound.join(','), fromFragment.join(','));
    });

    return suite;
}
