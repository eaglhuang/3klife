/**
 * JobChangeOrderPurchase.test.ts — 轉職令購買入口 headless 測試（PROG-2-0458）
 *
 * 只測 JobChangeController 的 buyOrder / canBuyOrder 與 flow view 的購買鈕，
 * 扣款與發道具由注入的 buyOrder 負責（正式環境接 LocalGachaService + GameSession）。
 *
 * Unity 對照：EditMode Test 用假的 Service 注入 Presenter，驗證按鈕背後的邏輯。
 */
import { assert, TestSuite } from './TestRunner';
import { JobChangeController } from '../assets/scripts/ui/core/JobChangeController';
import { JOB_CHANGE_ORDER_OFFER } from '../assets/scripts/core/systems/ItemShopPricing';

function makeController(gems: number, buy?: () => Promise<boolean>): JobChangeController {
    return new JobChangeController({
        roster: { getAll: () => [] },
        ordersOwned: () => 0,
        changeJob: async () => null,
        gems: () => gems,
        buyOrder: buy,
    });
}

export function createJobChangeOrderPurchaseSuite(): TestSuite {
    const suite = new TestSuite('JobChangeOrderPurchase (FATE-07 轉職令購買入口)');

    suite.test('精元足夠時可買，不足時不可買（剛好等於報價也可買）', () => {
        const noop = async () => true;
        assert.isTrue(makeController(JOB_CHANGE_ORDER_OFFER.price, noop).canBuyOrder());
        assert.isFalse(makeController(JOB_CHANGE_ORDER_OFFER.price - 1, noop).canBuyOrder());
    });

    suite.test('沒有購買入口（未注入 buyOrder / gems）時不可買', () => {
        const bare = new JobChangeController({
            roster: { getAll: () => [] },
            ordersOwned: () => 0,
            changeJob: async () => null,
        });
        assert.isFalse(bare.canBuyOrder());
    });

    suite.test('精元不足：buyOrder 不被呼叫，回傳 false 並寫入提示', async () => {
        let called = 0;
        const controller = makeController(10, async () => {
            called++;
            return true;
        });
        const ok = await controller.buyOrder();
        assert.isFalse(ok);
        assert.equals(0, called);
        assert.equals('精元不足，無法購買轉職令', controller.getView().notice);
    });

    suite.test('精元足夠且扣款成功：呼叫一次 buyOrder，提示顯示已購入', async () => {
        let called = 0;
        const controller = makeController(100, async () => {
            called++;
            return true;
        });
        const ok = await controller.buyOrder();
        assert.isTrue(ok);
        assert.equals(1, called);
        assert.equals('已購入轉職令 ×1', controller.getView().notice);
    });

    suite.test('扣款失敗：回傳 false，提示改為請稍後再試', async () => {
        const controller = makeController(100, async () => false);
        const ok = await controller.buyOrder();
        assert.isFalse(ok);
        assert.equals('購買失敗，請稍後再試', controller.getView().notice);
    });

    suite.test('flow view：購買鈕依精元決定 enabled，按鈕文字標出精元報價', () => {
        const rich = makeController(200, async () => true).getFlowView();
        const poor = makeController(0, async () => true).getFlowView();
        assert.isTrue(rich.enabled.btnBuyOrder);
        assert.isFalse(poor.enabled.btnBuyOrder);
        assert.equals(`購買轉職令（精元 ${JOB_CHANGE_ORDER_OFFER.price}）`, rich.texts.btnBuyOrderLabel);
    });

    return suite;
}
