// @spec-source → 經濟系統 §道具定價（補元散 10／高級補元散 25／求籤令 15／入學令 20／轉職令 50／延壽丹 100 精元）（PROG-2-0458、PROG-2-1917）
/**
 * ItemShopPricing — 道具購買的定價與餘額判斷，純 TS，不依賴 cc。
 *
 * 定價全表照經濟系統 §道具定價（ECO-04，PROG-2-1917）；轉職令最早接上購買入口（FATE-07）。
 * 扣款與發道具由呼叫端處理：先扣精元成功，才加道具，避免扣了錢沒拿到東西。
 * Unity 對照：像 ScriptableObject 的價格表，購買按鈕只讀表，不把數字寫死在 UI。
 */
import {
    ITEM_ADMISSION_TOKEN, ITEM_JOB_CHANGE_ORDER, ITEM_LONGEVITY_PILL, ITEM_ORACLE_TOKEN,
    ITEM_PREMIUM_VITALITY_PILL, ITEM_VITALITY_PILL,
} from './ItemDef';

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

const gemOffer = (itemId: string, price: number): Readonly<ShopOffer> => Object.freeze({ itemId, currency: 'gem', price });

/** 百寶閣精元定價全表（經濟系統 §道具定價） */
export const ITEM_SHOP_OFFERS: readonly Readonly<ShopOffer>[] = Object.freeze([
    gemOffer(ITEM_VITALITY_PILL, 10),
    gemOffer(ITEM_PREMIUM_VITALITY_PILL, 25),
    gemOffer(ITEM_ORACLE_TOKEN, 15),
    gemOffer(ITEM_ADMISSION_TOKEN, 20),
    JOB_CHANGE_ORDER_OFFER,
    gemOffer(ITEM_LONGEVITY_PILL, 100),
]);

/** 依道具 id 查報價；不在商店販售的道具回 null。 */
export function findShopOffer(itemId: string): Readonly<ShopOffer> | null {
    return ITEM_SHOP_OFFERS.find((o) => o.itemId === itemId) ?? null;
}

/** 扣款介面：餘額不足回 false 且不扣（正式環境接 LocalGachaService.spendCurrency('gems', n)）。 */
export interface ShopWallet {
    spend(amount: number): boolean;
}

/**
 * 買 quantity 個：數量須為正整數；先扣精元成功才發道具，扣款失敗不發貨。
 * 回傳是否購買成功。
 */
export async function purchaseShopOffer(
    offer: Readonly<ShopOffer>, quantity: number, wallet: ShopWallet,
    grant: (itemId: string, quantity: number) => Promise<void> | void,
): Promise<boolean> {
    if (!Number.isInteger(quantity) || quantity <= 0) return false;
    if (!wallet.spend(offer.price * quantity)) return false;
    await grant(offer.itemId, quantity);
    return true;
}
