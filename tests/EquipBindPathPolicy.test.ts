/**
 * EquipBindPathPolicy.test.ts — 寶頁三段的節點名稱與版型對齊（TSK-08，PROG-2-1394）
 *
 * 鎖住：六格 EquipSlot_<槽>、道具摘要 EquipItemSummary 都在 character-ds3-equip-content.json 版型內；
 * 傳家寶卡 HeirloomCard 由執行期建立，不在版型內（不強制要求）。
 * Unity 對照：Prefab 的 child 名稱表與 Presenter 的 Find 名稱對齊，改名要同步改兩邊。
 */
import { assert, TestSuite } from './TestRunner';
import { EQUIP_SEGMENT_NODES } from '../assets/scripts/ui/components/character-ds3/EquipBindPathPolicy';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const LAYOUT = path.resolve(__dirname, '..', 'assets/resources/ui-spec/fragments/layouts/character-ds3-equip-content.json');

function nodeNames(): Set<string> {
    const names = new Set<string>();
    const walk = (node: { name?: string; children?: unknown[] }): void => {
        if (node.name) names.add(node.name);
        for (const child of node.children ?? []) walk(child as { name?: string; children?: unknown[] });
    };
    walk(JSON.parse(fs.readFileSync(LAYOUT, 'utf8')));
    return names;
}

export function createEquipBindPathPolicySuite(): TestSuite {
    const suite = new TestSuite('EquipBindPathPolicy (寶頁三段節點對齊 TSK-08)');

    suite.test('六格 gear 節點都在版型內', () => {
        const names = nodeNames();
        assert.equals(6, EQUIP_SEGMENT_NODES.gear.length);
        for (const node of EQUIP_SEGMENT_NODES.gear) assert.isTrue(names.has(node), `缺少 ${node}`);
    });

    suite.test('道具摘要節點在版型內', () => {
        const names = nodeNames();
        for (const node of EQUIP_SEGMENT_NODES.items) assert.isTrue(names.has(node), `缺少 ${node}`);
    });

    return suite;
}
