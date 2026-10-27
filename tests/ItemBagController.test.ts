/**
 * ItemBagController.test.ts — 道具背包畫面流程（ITM-10）
 *
 * 鎖住：只列持有道具且最多 BAG_ROW_SLOTS 列；使用要先確認，確定才呼叫 useItem；
 * 各種使用結果轉成提示；用完的道具取消選取；未確認時不會誤用。
 */
import { assert, TestSuite } from './TestRunner';
import { BAG_ROW_SLOTS, ItemBagController } from '../assets/scripts/ui/core/ItemBagController';
import { ITEM_DISPLAY_NAMES, ITEM_REFRESH, ITEM_FERTILITY, ITEM_WISH_SPEED_CARD, PlayerInventory } from '../assets/scripts/core/systems/PlayerInventory';
import type { ItemUseResult } from '../assets/scripts/core/systems/ItemUseFlow';

function harness(initial: PlayerInventory, result: ItemUseResult = { ok: true, inventory: {} }) {
    const inventory: PlayerInventory = { ...initial };
    const calls: { itemId: string; nowMs: number }[] = [];
    const controller = new ItemBagController({
        inventory: () => inventory,
        useItem: (itemId, nowMs) => {
            calls.push({ itemId, nowMs });
            return result;
        },
        now: () => 42,
    });
    return { controller, calls };
}

export function createItemBagControllerSuite(): TestSuite {
    const suite = new TestSuite('ItemBagController (道具背包畫面流程 ITM-10)');

    suite.test('只列持有道具，列文字含數量；未持有的列節點停用', () => {
        const { controller } = harness({ [ITEM_REFRESH]: 2, [ITEM_FERTILITY]: 0 });
        const view = controller.getFlowView();
        assert.equals('刷新券 ×2', view.texts.bagRowLabel0);
        assert.isTrue(view.actives.btnBagRow0);
        assert.isFalse(view.actives.btnBagRow1);
        assert.equals('', view.texts.bagRowLabel1);
    });

    suite.test('持有全部已定義道具時跨頁可看到每一種，不截掉任何一種（PROG-2-1200）', () => {
        const all: Record<string, number> = {};
        for (const itemId of Object.keys(ITEM_DISPLAY_NAMES)) all[itemId] = 1;
        const { controller } = harness(all);
        const total = Object.keys(ITEM_DISPLAY_NAMES).length;
        assert.equals(Math.ceil(total / BAG_ROW_SLOTS), controller.pageCount());
        const seen: string[] = [];
        for (let p = 0; p < controller.pageCount(); p++) {
            assert.equals(p, controller.page);
            seen.push(...controller.rows().map((r) => r.itemId));
            controller.turnPage(1);
        }
        assert.equals(total, new Set(seen).size);
        assert.isTrue(seen.includes(ITEM_WISH_SPEED_CARD));
    });

    suite.test('分頁：只有一頁時隱藏分頁鈕；翻頁邊界不動；選取依頁碼對應（PROG-2-1200）', () => {
        const single = harness({ [ITEM_REFRESH]: 1 }).controller.getFlowView();
        assert.isFalse(single.actives.btnBagPrevPage);
        assert.isFalse(single.actives.btnBagNextPage);
        assert.isFalse(single.actives.bagPageLabel);
        const all: Record<string, number> = {};
        for (const itemId of Object.keys(ITEM_DISPLAY_NAMES)) all[itemId] = 2;
        const { controller } = harness(all);
        controller.turnPage(-1);
        assert.equals(0, controller.page);
        let view = controller.getFlowView();
        assert.equals(`第 1/${controller.pageCount()} 頁`, view.texts.bagPageLabel);
        assert.isFalse(view.actives.btnBagPrevPage);
        assert.isTrue(view.actives.btnBagNextPage);
        controller.turnPage(1);
        controller.turnPage(1);
        assert.equals(controller.pageCount() - 1, controller.page);
        view = controller.getFlowView();
        assert.isTrue(view.actives.btnBagPrevPage);
        assert.isFalse(view.actives.btnBagNextPage);
        const first = controller.rows()[0];
        controller.select(0);
        assert.equals(first.name, controller.getFlowView().texts.bagDetailName);
    });

    suite.test('道具減少使總頁數變少時，頁碼夾回最後一頁（PROG-2-1200）', () => {
        const all: Record<string, number> = {};
        for (const itemId of Object.keys(ITEM_DISPLAY_NAMES)) all[itemId] = 1;
        const controller = new ItemBagController({ inventory: () => all, useItem: () => ({ ok: true, inventory: {} }), now: () => 0 });
        controller.turnPage(1);
        assert.equals(1, controller.page);
        for (const row of controller.rows()) delete all[row.itemId];
        assert.equals(0, controller.page);
        assert.isTrue(controller.rows().length > 0);
    });

    suite.test('未選道具時詳情顯示未選擇，按使用會提示先選道具', () => {
        const { controller } = harness({ [ITEM_REFRESH]: 1 });
        assert.equals('未選擇道具', controller.getFlowView().texts.bagDetailName);
        controller.requestUse();
        assert.equals('請先選擇道具', controller.getFlowView().texts.bagMessage);
        assert.isFalse(controller.getFlowView().actives.btnBagConfirm);
    });

    suite.test('選取後使用先進入確認，按取消可復原且不呼叫 useItem', () => {
        const { controller, calls } = harness({ [ITEM_REFRESH]: 1 });
        controller.select(0);
        controller.requestUse();
        let view = controller.getFlowView();
        assert.equals('使用 刷新券 ×1？', view.texts.bagMessage);
        assert.isTrue(view.actives.btnBagConfirm);
        assert.isFalse(view.actives.btnBagUse);
        controller.cancelUse();
        view = controller.getFlowView();
        assert.isFalse(view.actives.btnBagConfirm);
        assert.equals(0, calls.length);
    });

    suite.test('確定使用才呼叫 useItem，並帶入現在時間', () => {
        const { controller, calls } = harness({ [ITEM_REFRESH]: 1 }, { ok: true, inventory: {} });
        controller.select(0);
        controller.requestUse();
        const result = controller.confirmUse();
        assert.isTrue(result?.ok === true);
        assert.equals(1, calls.length);
        assert.equals(ITEM_REFRESH, calls[0].itemId);
        assert.equals(42, calls[0].nowMs);
        assert.equals('已使用 刷新券', controller.getFlowView().texts.bagMessage);
    });

    suite.test('未進入確認狀態時確定不會誤用', () => {
        const { controller, calls } = harness({ [ITEM_REFRESH]: 1 });
        controller.select(0);
        assert.isTrue(controller.confirmUse() === null);
        assert.equals(0, calls.length);
    });

    suite.test('數量不足的結果把商城提示寫入畫面', () => {
        const prompt = { key: 'UI_ITEM_LACK' as const, itemName: '安胎藥', text: '安胎藥 不足，是否前往商城？' };
        const { controller } = harness({ [ITEM_FERTILITY]: 1 }, { ok: false, reason: 'LACK', prompt });
        controller.select(0);
        controller.requestUse();
        controller.confirmUse();
        assert.equals('安胎藥 不足，是否前往商城？', controller.getFlowView().texts.bagMessage);
    });

    suite.test('安胎藥已生效時提示已生效中', () => {
        const { controller } = harness({ [ITEM_FERTILITY]: 2 }, { ok: false, reason: 'ALREADY_ARMED' });
        controller.select(0);
        controller.requestUse();
        controller.confirmUse();
        assert.isTrue(controller.getFlowView().texts.bagMessage.includes('已生效中'));
    });

    suite.test('用完最後一個道具後取消選取，詳情回到未選擇', () => {
        let inventory: PlayerInventory = { [ITEM_REFRESH]: 1 };
        const controller = new ItemBagController({
            inventory: () => inventory,
            useItem: () => {
                inventory = {};
                return { ok: true, inventory };
            },
            now: () => 0,
        });
        controller.select(0);
        controller.requestUse();
        controller.confirmUse();
        assert.equals('未選擇道具', controller.getFlowView().texts.bagDetailName);
        assert.equals(0, controller.rows().length);
    });

    return suite;
}
