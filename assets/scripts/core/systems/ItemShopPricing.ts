// @spec-source → 經濟系統 §道具定價（轉職令 精元 50，20 歲轉職 ×1）（PROG-2-0458，暫定）
/**
 * ItemShopPricing — 道具購買的定價與餘額判斷，純 TS，不依賴 cc。
 *
 * 目前只有轉職令接上購買入口（FATE-07）；其餘道具的定價等之後的商店卡一併加入。
 * 扣款與發道具由呼叫端處理：先扣精元成功，才加道具，避免扣了錢沒拿到東西。
 * Unity 對照：像 ScriptableObject 的價格表，購買按鈕只讀表，不把數字寫死在 UI。
 */
import { ITEM_JOB_CHANGE_ORDER } from './PlayerInventory';

export interface ShopOffer {
    itemId: string;
    currency: 'gem';
    price: number;
}

export const JOB_CHANGE_ORDER_OFFER: Readonly<ShopOffer> = Object.freeze({
    itemId: ITEM_JOB_CHANGE_ORDER,
    currency: 'gem',
    price: 50,
});

/** 餘額是否足夠買下這個報價；非有限數字一律視為不足。 */
export function canAffordOffer(offer: Readonly<ShopOffer>, balance: number): boolean {
    return Number.isFinite(balance) && balance >= offer.price;
}
