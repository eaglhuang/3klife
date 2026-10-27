/**
 * BloodlineTreeScreenLayout.test.ts — 14 人版血統樹綁定名稱與版型交叉比對（BUI-01 宿主，PROG-2-1215）
 *
 * 不開 Cocos：BloodlineTreeScreen.renderCards 依 bindTreeCards 產生的節點名找節點，
 * 這裡確認每個名稱都存在於 bloodline-tree-main.json 的對應容器下，數量與 §2 一致（8／4／2）。
 *
 * Unity 對照：EditMode Test 掃描 Prefab 的子物件名稱，確認腳本引用的名字都存在，不必進場景。
 */
import { assert, TestSuite } from './TestRunner';
import { bindTreeCards, treeCardNodeName } from '../assets/scripts/core/systems/BloodlineTreeBinding';
import type { NodeCardView } from '../assets/scripts/core/systems/BloodlineNodeCards';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const LAYOUT_PATH = 'assets/resources/ui-spec/layouts/bloodline-tree-main.json';

/** 每排的卡數（§2：第 1 排 8、第 2 排 4、第 3 排 2）。 */
const COUNT_BY_ROW: Readonly<Record<1 | 2 | 3, number>> = { 1: 8, 2: 4, 3: 2 };

/** 排數對應的容器名稱（與 BloodlineTreeScreen 的 CONTAINER_BY_ROW 一致）。 */
const CONTAINER_BY_ROW: Readonly<Record<1 | 2 | 3, string>> = {
    1: 'Gen1Container',
    2: 'Gen2Container',
    3: 'Gen3Container',
};

interface LayoutNode {
    name?: string;
    children?: LayoutNode[];
}

function readLayoutRoot(): LayoutNode {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, LAYOUT_PATH), 'utf8')) as { root?: LayoutNode } & LayoutNode;
    return json.root ?? json;
}

/** 找出指定名稱的節點（深度優先）。 */
function findNode(node: LayoutNode, name: string): LayoutNode | null {
    if (node.name === name) return node;
    for (const child of node.children ?? []) {
        const found = findNode(child, name);
        if (found) return found;
    }
    return null;
}

/** 容器下直接子節點的名稱集合。 */
function childNames(node: LayoutNode): Set<string> {
    return new Set((node.children ?? []).map((c) => c.name ?? ''));
}

export function createBloodlineTreeScreenLayoutSuite(): TestSuite {
    const suite = new TestSuite('BloodlineTreeScreenLayout (14 人版綁定名稱與版型交叉比對 BUI-01)');

    suite.test('每排容器下的 NodeCard 數量與 §2 一致（8／4／2）', () => {
        const root = readLayoutRoot();
        for (const row of [1, 2, 3] as const) {
            const container = findNode(root, CONTAINER_BY_ROW[row]);
            assert.isTrue(container !== null, CONTAINER_BY_ROW[row]);
            const cards = [...childNames(container as LayoutNode)].filter((n) => n.startsWith('NodeCard_G'));
            assert.equals(COUNT_BY_ROW[row], cards.length, CONTAINER_BY_ROW[row]);
        }
    });

    suite.test('bindTreeCards 產生的每個節點名，都存在於對應容器下', () => {
        const root = readLayoutRoot();
        const cards: NodeCardView[] = [];
        for (const row of [1, 2, 3] as const) {
            for (let i = 0; i < COUNT_BY_ROW[row]; i++) {
                cards.push({ row, empty: true } as unknown as NodeCardView);
            }
        }
        for (const target of bindTreeCards(cards)) {
            const container = findNode(root, CONTAINER_BY_ROW[target.card.row]);
            assert.isTrue(container !== null);
            assert.isTrue(childNames(container as LayoutNode).has(target.nodeName), target.nodeName);
        }
    });

    suite.test('treeCardNodeName 的序號從 0 開始，與版型命名一致', () => {
        assert.equals('NodeCard_G1_0', treeCardNodeName(1, 0));
        assert.equals('NodeCard_G3_1', treeCardNodeName(3, 1));
        const root = readLayoutRoot();
        const container = findNode(root, 'Gen3Container') as LayoutNode;
        assert.isTrue(childNames(container).has(treeCardNodeName(3, 0)));
        assert.isTrue(childNames(container).has(treeCardNodeName(3, 1)));
    });

    return suite;
}
