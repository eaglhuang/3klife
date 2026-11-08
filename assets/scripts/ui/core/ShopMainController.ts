// @spec-source → 經濟系統 §道具定價（ECO-04）；PROG-2-2120
/**
 * ShopMainController — 百寶閣的精元購買流程（純邏輯，不依賴 cc）。
 *
 * 價格只讀 ITEM_SHOP_OFFERS，不在畫面寫死。精元會直接扣，所以同一列要按兩次才成交。
 * 暫定：金幣、印記、積分三個分頁規格沒有商品，先隱藏。
 * Unity 對照：像 ShopPresenter，只組 ViewModel 與處理點擊，扣款與發貨交給注入的服務。
 */
import { canAffordOffer, ITEM_SHOP_OFFERS, purchaseShopOffer, type ShopOffer } from '../../core/systems/ItemShopPricing';
import {
    ITEM_ADMISSION_TOKEN, ITEM_JOB_CHANGE_ORDER, ITEM_LONGEVITY_PILL, ITEM_ORACLE_TOKEN,
    ITEM_PREMIUM_VITALITY_PILL, ITEM_VITALITY_PILL,
} from '../../core/systems/ItemDef';
import { ITEM_DISPLAY_NAMES } from '../../core/systems/PlayerInventory';

export interface ShopMainView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface ShopMainDeps {
    gems(): number;
    owned(itemId: string): number;
    /** 餘額不足回 false 且不扣 */
    spendGems(amount: number): boolean;
    grant(itemId: string, quantity: number): Promise<unknown> | unknown;
    offers?: readonly Readonly<ShopOffer>[];
}

/** 經濟系統 §道具定價的「功能」欄 */
const OFFER_EFFECT_TEXT: Readonly<Record<string, string>> = Object.freeze({
    [ITEM_VITALITY_PILL]: '精力 +50',
    [ITEM_PREMIUM_VITALITY_PILL]: '精力 +100',
    [ITEM_ORACLE_TOKEN]: '名士占卜 ×1',
    [ITEM_ADMISSION_TOKEN]: '培育名額 ×1',
    [ITEM_JOB_CHANGE_ORDER]: '20 歲轉職 ×1',
    [ITEM_LONGEVITY_PILL]: '壽命 +3 歲',
});

const HIDDEN_TABS = ['tabGold', 'tabStamp', 'tabScore'];

export class ShopMainController {
    private readonly _offers: readonly Readonly<ShopOffer>[];
    private _pendingIndex: number | null = null;
    private _busy = false;
    private _notice = '';

    public constructor(private readonly _deps: ShopMainDeps) {
        this._offers = _deps.offers ?? ITEM_SHOP_OFFERS;
    }

    public get rowCount(): number {
        return this._offers.length;
    }

    /** 每次打開都清掉上次的確認狀態，避免隔一陣子再按一下就成交 */
    public open(): void {
        this._pendingIndex = null;
        this._notice = '';
    }

    /** 點某一列；真的成交才回 true */
    public async tapOffer(index: number): Promise<boolean> {
        const offer = this._offers[index];
        if (!offer || this._busy) return false;
        const name = this._nameOf(offer);
        const gems = this._deps.gems();
        if (!canAffordOffer(offer, gems)) {
            this._pendingIndex = null;
            this._notice = `精元不足：${name}要 ${offer.price}，目前有 ${gems}`;
            return false;
        }
        if (this._pendingIndex !== index) {
            this._pendingIndex = index;
            this._notice = `再按一次，以精元 ${offer.price} 購買${name}`;
            return false;
        }
        this._pendingIndex = null;
        this._busy = true;
        try {
            const wallet = { spend: (amount: number) => this._deps.spendGems(amount) };
            const bought = await purchaseShopOffer(offer, 1, wallet, async (itemId, quantity) => {
                await this._deps.grant(itemId, quantity);
            });
            this._notice = bought
                ? `購得${name}，現有 ${this._deps.owned(offer.itemId)}`
                : `精元不足：${name}要 ${offer.price}，目前有 ${this._deps.gems()}`;
            return bought;
        } catch {
            this._notice = `購買${name}時發生錯誤，請檢查背包與精元`;
            return false;
        } finally {
            this._busy = false;
        }
    }

    public getView(): ShopMainView {
        const texts: Record<string, string> = {
            shopGemCount: `精元 ${this._deps.gems()}`,
            shopNotice: this._notice,
        };
        const enabled: Record<string, boolean> = {};
        this._offers.forEach((offer, i) => {
            const effect = OFFER_EFFECT_TEXT[offer.itemId];
            const head = effect ? `${this._nameOf(offer)}（${effect}）` : this._nameOf(offer);
            texts[`shopRow${i}Name`] = `${head}　持有 ${this._deps.owned(offer.itemId)}`;
            texts[`shopRow${i}Price`] = this._pendingIndex === i ? '確認購買' : `精元 ${offer.price}`;
            enabled[`shopRow${i}`] = !this._busy;
        });
        const actives: Record<string, boolean> = {};
        for (const tab of HIDDEN_TABS) actives[tab] = false;
        return { texts, actives, enabled };
    }

    private _nameOf(offer: Readonly<ShopOffer>): string {
        return ITEM_DISPLAY_NAMES[offer.itemId] ?? offer.itemId;
    }
}
