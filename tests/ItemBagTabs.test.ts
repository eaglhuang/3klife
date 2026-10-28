/**
 * ItemBagTabs.test.ts — 道具背包分類頁籤掛載（PROG-2-1381，ITM-02 畫面）
 *
 * 鎖住：item-bag-main 版面有 6 個分類頁籤節點（全部＋五大分類）；FlowView 的每個 key 都能在版面找到；
 * 點頁籤會切換分類、回到第一頁，目前分類的標籤前面有記號；頁籤用的樣式槽都在 skin 裡。
 *
 * Unity 對照：像 TabGroup：六個 Toggle 綁同一個 Filter，點哪個就把哪個設為 isOn，其他的關掉。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { BAG_CATEGORY_TABS, ItemBagController } from '../assets/scripts/ui/core/ItemBagController';
import { ITEM_BATTLE_NOTE, ITEM_ORACLE_TOKEN, PlayerInventory } from '../assets/scripts/core/systems/PlayerInventory';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

function collect(node: any, key: 'id' | 'skinSlot' | 'styleSlot', out: Set<string>): void {
    if (node && typeof node === 'object') {
        if (typeof node[key] === 'string') out.add(node[key]);
        for (const child of node.children ?? []) collect(child, key, out);
    }
}

function controllerWith(inventory: PlayerInventory): ItemBagController {
    return new ItemBagController({
        inventory: () => inventory,
        useItem: () => ({ ok: true, inventory: {} }),
        now: () => 0,
    });
}

export function createItemBagTabsSuite(): TestSuite {
    const suite = new TestSuite('ItemBagTabs (道具背包分類頁籤 PROG-2-1381)');

    suite.test('版面有 6 個分類頁籤節點，與 BAG_CATEGORY_TABS 數量一致', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/item-bag-main.json');
        const ids = new Set<string>();
        collect(layout.root, 'id', ids);
        assert.equals(BAG_CATEGORY_TABS.length, 6);
        for (let i = 0; i < BAG_CATEGORY_TABS.length; i++) {
            assert.isTrue(ids.has(`btnBagTab${i}`), `缺少 btnBagTab${i}`);
            assert.isTrue(ids.has(`bagTabLabel${i}`), `缺少 bagTabLabel${i}`);
        }
    });

    suite.test('FlowView 的每個 key 都在版面上有對應節點', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/item-bag-main.json');
        const ids = new Set<string>();
        collect(layout.root, 'id', ids);
        const view = controllerWith({ [ITEM_ORACLE_TOKEN]: 1 }).getFlowView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives)]) {
            assert.isTrue(ids.has(key), `版面缺少節點 ${key}`);
        }
    });

    suite.test('頁籤使用的樣式槽都在 skin 裡', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/item-bag-main.json');
        const skin = readJson('assets/resources/ui-spec/skins/item-bag-screen.skin.json');
        const slots = new Set<string>();
        collect(layout.root, 'skinSlot', slots);
        collect(layout.root, 'styleSlot', slots);
        for (const slot of slots) assert.isDefined(skin.slots[slot], `skin 缺少 ${slot}`);
    });

    suite.test('點頁籤切換分類：只列該分類，目前分類的標籤有記號，回到第一頁', () => {
        const controller = controllerWith({ [ITEM_ORACLE_TOKEN]: 2, [ITEM_BATTLE_NOTE]: 1 });
        controller.selectCategoryTab(2);
        assert.equals('材料', controller.category!);
        assert.equals(ITEM_BATTLE_NOTE, controller.rows().map((row) => row.itemId).join(','));
        const view = controller.getFlowView();
        assert.equals('● 材料', view.texts.bagTabLabel2);
        assert.equals('全部', view.texts.bagTabLabel0);
        assert.equals(0, controller.page);
    });

    suite.test('第 0 個頁籤為全部；超出範圍的頁籤索引不動', () => {
        const controller = controllerWith({ [ITEM_ORACLE_TOKEN]: 2 });
        controller.selectCategoryTab(1);
        controller.selectCategoryTab(0);
        assert.isTrue(controller.category === null);
        controller.selectCategoryTab(99);
        assert.isTrue(controller.category === null);
    });

    return suite;
}
