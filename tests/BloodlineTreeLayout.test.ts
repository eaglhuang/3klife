/**
 * BloodlineTreeLayout.test.ts — 血統樹 14 人版型節點結構（BUI-01，PROG-2-1048）
 *
 * 不開 Cocos：只讀 bloodline-tree-main.json，確認節點名稱與《血統樹14人UI規格書》§2 一致、
 * 14 位先祖（8＋4＋2）與 1 位子代的容器數量正確，且節點名稱不重複。
 *
 * Unity 對照：EditMode Test 檢查 Prefab 的層級與命名，不實例化場景。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const LAYOUT_PATH = 'assets/resources/ui-spec/layouts/bloodline-tree-main.json';

interface LayoutNode {
    type: string;
    name?: string;
    children?: LayoutNode[];
}

function readLayoutRoot(): LayoutNode {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, LAYOUT_PATH), 'utf8')) as { root: LayoutNode };
    return json.root;
}

function namedNodes(node: LayoutNode, out: Map<string, LayoutNode>): Map<string, LayoutNode> {
    if (node.name) out.set(node.name, node);
    for (const child of node.children ?? []) namedNodes(child, out);
    return out;
}

/** 規格 §2 的必備節點名稱（根節點、樹區、底部區、容器、連線、主角區與詳細區）。 */
const REQUIRED_NAMES = [
    'BloodlineTreeRoot', 'HeaderTitle', 'TreeArea', 'BottomInfoArea',
    'Gen1Container', 'Gen2Container', 'Gen3Container', 'LineGraphics',
    'MainTargetPanel', 'TargetPortrait', 'TargetRarity', 'SkillDetails', 'LegendPanel',
];

/** 以名稱前綴統計卡片數：NodeCard_G1_* 為第一代，依此類推。 */
function cardCount(node: LayoutNode, prefix: string): number {
    return Array.from(namedNodes(node, new Map()).keys()).filter((name) => name.startsWith(prefix)).length;
}

export function createBloodlineTreeLayoutSuite(): TestSuite {
    const suite = new TestSuite('BloodlineTreeLayout (血統樹 14 人版型 BUI-01)');

    suite.test('根節點名稱為 BloodlineTreeRoot，且規格 §2 必備節點都存在', () => {
        const root = readLayoutRoot();
        assert.equals('BloodlineTreeRoot', root.name);
        const names = namedNodes(root, new Map());
        for (const required of REQUIRED_NAMES) {
            assert.isTrue(names.has(required), `缺少節點 ${required}`);
        }
    });

    suite.test('先祖卡片 8＋4＋2 共 14 張，加上主角共 15 個槽位', () => {
        const root = readLayoutRoot();
        assert.equals(8, cardCount(root, 'NodeCard_G1_'));
        assert.equals(4, cardCount(root, 'NodeCard_G2_'));
        assert.equals(2, cardCount(root, 'NodeCard_G3_'));
        assert.equals(15, cardCount(root, 'NodeCard_G1_') + cardCount(root, 'NodeCard_G2_') + cardCount(root, 'NodeCard_G3_') + 1);
    });

    suite.test('世代容器各自包含對應數量的卡片，且位於 TreeArea 之下', () => {
        const names = namedNodes(readLayoutRoot(), new Map());
        const gen1 = names.get('Gen1Container');
        const gen2 = names.get('Gen2Container');
        const gen3 = names.get('Gen3Container');
        assert.equals(8, gen1?.children?.length ?? -1);
        assert.equals(4, gen2?.children?.length ?? -1);
        assert.equals(2, gen3?.children?.length ?? -1);
        const treeArea = names.get('TreeArea');
        const treeNames = namedNodes(treeArea ?? { type: 'panel' }, new Map());
        assert.isTrue(treeNames.has('Gen1Container') && treeNames.has('Gen2Container') && treeNames.has('Gen3Container'));
    });

    suite.test('節點名稱不重複，避免 binder 綁到錯的節點', () => {
        const root = readLayoutRoot();
        const all: string[] = [];
        const collect = (node: LayoutNode): void => {
            if (node.name) all.push(node.name);
            for (const child of node.children ?? []) collect(child);
        };
        collect(root);
        assert.equals(all.length, new Set(all).size);
    });

    return suite;
}
