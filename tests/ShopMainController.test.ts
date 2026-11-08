/**
 * ShopMainController.test.ts — 百寶閣精元購買流程（經濟系統 §道具定價，PROG-2-2120）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { ITEM_SHOP_OFFERS } from '../assets/scripts/core/systems/ItemShopPricing';
import { ITEM_DISPLAY_NAMES } from '../assets/scripts/core/systems/PlayerInventory';
import { ShopMainController } from '../assets/scripts/ui/core/ShopMainController';

const UI_SPEC = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec');

interface SpecNode { id?: string; skinSlot?: string; styleSlot?: string; children?: SpecNode[] }

function collect(node: SpecNode, out: SpecNode[] = []): SpecNode[] {
    out.push(node);
    for (const child of node.children ?? []) collect(child, out);
    return out;
}

function rig(startGems: number, grantError?: Error) {
    const state = { gems: startGems, spent: 0, items: {} as Record<string, number>, grants: 0 };
    const controller = new ShopMainController({
        gems: () => state.gems,
        owned: (itemId) => state.items[itemId] ?? 0,
        spendGems: (amount) => {
            if (state.gems < amount) return false;
            state.gems -= amount;
            state.spent += amount;
            return true;
        },
        grant: async (itemId, quantity) => {
            state.grants += 1;
            if (grantError) throw grantError;
            state.items[itemId] = (state.items[itemId] ?? 0) + quantity;
        },
    });
    return { state, controller };
}

export function createShopMainControllerSuite(): TestSuite {
    const suite = new TestSuite('ShopMainController (百寶閣精元購買 PROG-2-2120)');
    const first = ITEM_SHOP_OFFERS[0];

    suite.test('每個報價都有一列，顯示名稱、持有數與規格價格', () => {
        const { controller } = rig(999);
        const view = controller.getView();
        assert.equals('精元 999', view.texts.shopGemCount);
        ITEM_SHOP_OFFERS.forEach((offer, i) => {
            assert.isTrue(view.texts[`shopRow${i}Name`].includes(ITEM_DISPLAY_NAMES[offer.itemId]));
            assert.isTrue(view.texts[`shopRow${i}Name`].includes('持有 0'));
            assert.isTrue(view.texts[`shopRow${i}Name`].includes('（'), '缺功能說明');
            assert.equals(`精元 ${offer.price}`, view.texts[`shopRow${i}Price`]);
        });
    });

    suite.test('第一次按只進確認，不扣精元也不發貨', async () => {
        const { state, controller } = rig(999);
        assert.isFalse(await controller.tapOffer(0));
        assert.equals(0, state.spent);
        assert.equals(0, state.grants);
        assert.equals('確認購買', controller.getView().texts.shopRow0Price);
    });

    suite.test('同一列按第二次才成交：扣規格價格、發一份、顯示持有數', async () => {
        const { state, controller } = rig(999);
        await controller.tapOffer(0);
        assert.isTrue(await controller.tapOffer(0));
        assert.equals(first.price, state.spent);
        assert.equals(1, state.items[first.itemId]);
        const view = controller.getView();
        assert.isTrue(view.texts.shopRow0Name.includes('持有 1'));
        assert.equals(`精元 ${first.price}`, view.texts.shopRow0Price);
        assert.isTrue(view.texts.shopNotice.includes('購得'));
    });

    suite.test('中途改按別列要重新確認，不會買到先按的那列', async () => {
        const { state, controller } = rig(999);
        await controller.tapOffer(0);
        assert.isFalse(await controller.tapOffer(1));
        assert.equals(0, state.spent);
        assert.equals(`精元 ${first.price}`, controller.getView().texts.shopRow0Price);
        assert.equals('確認購買', controller.getView().texts.shopRow1Price);
    });

    suite.test('重新打開商店會清掉確認狀態', async () => {
        const { state, controller } = rig(999);
        await controller.tapOffer(0);
        controller.open();
        assert.isFalse(await controller.tapOffer(0));
        assert.equals(0, state.spent);
        assert.equals('', rig(1).controller.getView().texts.shopNotice);
    });

    suite.test('精元不足：提示差額資訊，不進確認也不扣', async () => {
        const { state, controller } = rig(first.price - 1);
        assert.isFalse(await controller.tapOffer(0));
        assert.isFalse(await controller.tapOffer(0));
        assert.equals(0, state.spent);
        assert.equals(0, state.grants);
        assert.isTrue(controller.getView().texts.shopNotice.includes('精元不足'));
        assert.equals(`精元 ${first.price}`, controller.getView().texts.shopRow0Price);
    });

    suite.test('連點只成交一次', async () => {
        const { state, controller } = rig(999);
        await controller.tapOffer(0);
        const results = await Promise.all([controller.tapOffer(0), controller.tapOffer(0)]);
        assert.equals(1, results.filter(Boolean).length);
        assert.equals(first.price, state.spent);
        assert.equals(1, state.grants);
    });

    suite.test('發貨失敗：回 false、提示錯誤，之後還能再按', async () => {
        const { controller } = rig(999, new Error('disk full'));
        await controller.tapOffer(0);
        assert.isFalse(await controller.tapOffer(0));
        assert.isTrue(controller.getView().texts.shopNotice.includes('錯誤'));
        assert.isTrue(controller.getView().enabled.shopRow0);
    });

    suite.test('超出範圍的列不做事', async () => {
        const { state, controller } = rig(999);
        assert.isFalse(await controller.tapOffer(99));
        assert.equals(0, state.spent);
    });

    suite.test('view 的 key 都對得到版面節點，用到的皮膚槽位都存在', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(UI_SPEC, 'layouts/shop-main-main.json'), 'utf8')) as { root: SpecNode };
        const nodes = collect(layout.root);
        const ids = new Set(nodes.map((n) => n.id));
        const view = rig(1).controller.getView();
        const missing = [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)].filter((k) => !ids.has(k));
        assert.equals('', missing.join(','));
        const skin = JSON.parse(fs.readFileSync(path.join(UI_SPEC, 'skins/shop-main-default.json'), 'utf8')) as { slots: Record<string, unknown> };
        for (const node of nodes) {
            if (node.id?.startsWith('shopRow') && node.styleSlot) assert.isTrue(Boolean(skin.slots[node.styleSlot]), node.styleSlot);
            if (node.id?.startsWith('shopRow') && node.skinSlot) assert.isTrue(Boolean(skin.slots[node.skinSlot]), node.skinSlot);
        }
    });

    return suite;
}
