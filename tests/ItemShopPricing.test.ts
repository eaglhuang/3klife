import { assert, TestSuite } from './TestRunner';
import { canAffordOffer, JOB_CHANGE_ORDER_OFFER } from '../assets/scripts/core/systems/ItemShopPricing';
import { ITEM_JOB_CHANGE_ORDER } from '../assets/scripts/core/systems/PlayerInventory';

export function createItemShopPricingSuite(): TestSuite {
    const suite = new TestSuite('ItemShopPricing (FATE-07 轉職令購買定價)');

    suite.test('轉職令報價：精元 50，道具 id 與 PlayerInventory 一致', () => {
        assert.equals(ITEM_JOB_CHANGE_ORDER, JOB_CHANGE_ORDER_OFFER.itemId);
        assert.equals('gem', JOB_CHANGE_ORDER_OFFER.currency);
        assert.equals(50, JOB_CHANGE_ORDER_OFFER.price);
    });

    suite.test('餘額足夠（含剛好等於）可買，不足或非法數字不可買', () => {
        assert.isTrue(canAffordOffer(JOB_CHANGE_ORDER_OFFER, 50));
        assert.isFalse(canAffordOffer(JOB_CHANGE_ORDER_OFFER, 49));
        assert.isFalse(canAffordOffer(JOB_CHANGE_ORDER_OFFER, Number.NaN));
    });

    return suite;
}
