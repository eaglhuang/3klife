/**
 * ItemShopCatalog — 經濟系統 §道具定價全表與購買流程（ECO-04；PROG-2-1917）
 */
import { assert, TestSuite } from './TestRunner';
import { ITEM_SHOP_OFFERS, JOB_CHANGE_ORDER_OFFER, findShopOffer, purchaseShopOffer } from '../assets/scripts/core/systems/ItemShopPricing';
import {
    ITEM_ADMISSION_TOKEN, ITEM_JOB_CHANGE_ORDER, ITEM_LONGEVITY_PILL, ITEM_ORACLE_TOKEN,
    ITEM_PREMIUM_VITALITY_PILL, ITEM_VITALITY_PILL,
} from '../assets/scripts/core/systems/ItemDef';

function wallet(balance: number) {
    const w = { balance, spend: (n: number) => { if (w.balance < n) return false; w.balance -= n; return true; } };
    return w;
}

export function createItemShopCatalogSuite(): TestSuite {
    const suite = new TestSuite('ItemShopCatalog (道具定價表 ECO-04 PROG-2-1917)');

    suite.test('六項道具價格照規格；轉職令沿用舊報價', () => {
        const price = (id: string) => findShopOffer(id)?.price;
        assert.equals(10, price(ITEM_VITALITY_PILL));
        assert.equals(25, price(ITEM_PREMIUM_VITALITY_PILL));
        assert.equals(15, price(ITEM_ORACLE_TOKEN));
        assert.equals(20, price(ITEM_ADMISSION_TOKEN));
        assert.equals(50, price(ITEM_JOB_CHANGE_ORDER));
        assert.equals(100, price(ITEM_LONGEVITY_PILL));
        assert.equals(6, ITEM_SHOP_OFFERS.length);
        assert.equals(JOB_CHANGE_ORDER_OFFER, findShopOffer(ITEM_JOB_CHANGE_ORDER));
        assert.equals(null, findShopOffer('ITEM_STONE'));
    });

    suite.test('購買：先扣款才發貨；餘額不足或數量不合法不扣不發', async () => {
        const granted: Array<[string, number]> = [];
        const grant = async (id: string, qty: number) => { granted.push([id, qty]); };
        const w = wallet(35);
        assert.isTrue(await purchaseShopOffer(findShopOffer(ITEM_VITALITY_PILL)!, 3, w, grant));
        assert.equals(5, w.balance);
        assert.equals(JSON.stringify([[ITEM_VITALITY_PILL, 3]]), JSON.stringify(granted));
        assert.isFalse(await purchaseShopOffer(findShopOffer(ITEM_VITALITY_PILL)!, 1, w, grant));
        assert.isFalse(await purchaseShopOffer(findShopOffer(ITEM_VITALITY_PILL)!, 0, wallet(100), grant));
        assert.isFalse(await purchaseShopOffer(findShopOffer(ITEM_VITALITY_PILL)!, 1.5, wallet(100), grant));
        assert.equals(1, granted.length);
    });

    return suite;
}
