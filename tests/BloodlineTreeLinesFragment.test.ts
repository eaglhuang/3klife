/**
 * BloodlineTreeLinesFragment.test.ts — 命頁祖先樹的連線節點與子代節點（BUI-04 cc 接線，PROG-2-1279）headless 測試
 *
 * 鎖住：AncestorTree 底下有 LineGraphics（排第一，畫在卡片下面）與 TargetPortrait（子代位置）。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

interface FragmentNode {
    name?: string;
    children?: FragmentNode[];
}

function findNode(root: FragmentNode, name: string): FragmentNode | null {
    if (root.name === name) return root;
    for (const child of root.children ?? []) {
        const found = findNode(child, name);
        if (found) return found;
    }
    return null;
}

export function createBloodlineTreeLinesFragmentSuite(): TestSuite {
    const suite = new TestSuite('BloodlineTreeLinesFragment (命頁連線與子代節點 BUI-04 PROG-2-1279)');
    const file = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'fragments', 'layouts', 'gd-tab-bloodline.json');
    const root = JSON.parse(fs.readFileSync(file, 'utf8')) as FragmentNode;
    const tree = findNode(root, 'AncestorTree');

    suite.test('AncestorTree 下 LineGraphics 排第一，讓連線畫在卡片下面', () => {
        assert.isTrue(tree !== null);
        assert.equals('LineGraphics', tree?.children?.[0]?.name);
    });

    suite.test('AncestorTree 下有子代節點 TargetPortrait', () => {
        const names = (tree?.children ?? []).map((child) => child.name);
        assert.isTrue(names.includes('TargetPortrait'));
    });

    return suite;
}
