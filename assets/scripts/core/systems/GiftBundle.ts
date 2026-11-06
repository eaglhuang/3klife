// @spec-source → 道具系統（付費免費道具）§禮包組合（P2：組合多種道具為禮包商品）（ITM-09，PROG-2-1921）
/**
 * GiftBundle — 禮包組合：一個商品含多種道具，一次扣精元、全部發放，可設限購。純 TS，不依賴 cc。
 *
 * 規格未列出具體禮包內容與價格，這裡只提供資料格式與購買流程；實際禮包由營運資料表提供。
 * Unity 對照：像 ScriptableObject 定義的 Bundle，購買服務只讀定義、不寫死內容。
 */
import { ITEM_DEFS } from './ItemDef';
import type { ShopWallet } from './ItemShopPricing';

export interface GiftBundleItem {
    itemId: string;
    quantity: number;
}

export interface GiftBundleDef {
    id: string;
    name: string;
    currency: 'gem';
    price: number;
    items: GiftBundleItem[];
    /** 每位玩家可買次數；省略為不限 */
    purchaseLimit?: number;
}

export type GiftBundlePurchaseReason = 'invalid-bundle' | 'limit-reached' | 'insufficient-funds';

export interface GiftBundlePurchaseResult {
    ok: boolean;
    reason?: GiftBundlePurchaseReason;
}

/** 檢查禮包定義：價格非負整數、至少一項道具、道具存在且數量為正整數、限購為正整數。回傳問題清單，空陣列表示合格。 */
export function validateGiftBundle(def: Readonly<GiftBundleDef>): string[] {
    const issues: string[] = [];
    if (!def.id) issues.push('缺少 id');
    if (!Number.isInteger(def.price) || def.price < 0) issues.push(`${def.id}: 價格須為非負整數`);
    if (!Array.isArray(def.items) || def.items.length === 0) issues.push(`${def.id}: 至少要有一項道具`);
    for (const item of def.items ?? []) {
        if (!ITEM_DEFS.some((d) => d.id === item.itemId)) issues.push(`${def.id}: 未知道具 ${item.itemId}`);
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) issues.push(`${def.id}: ${item.itemId} 數量須為正整數`);
    }
    if (def.purchaseLimit !== undefined && (!Number.isInteger(def.purchaseLimit) || def.purchaseLimit <= 0)) {
        issues.push(`${def.id}: 限購須為正整數`);
    }
    return issues;
}

/**
 * 購買禮包：定義不合格、已達限購、餘額不足都拒絕且不扣款；扣款成功後依序發放每項道具。
 * purchasedCount 是玩家已買次數，由呼叫端記錄與存檔。
 */
export async function purchaseGiftBundle(
    def: Readonly<GiftBundleDef>, purchasedCount: number, wallet: ShopWallet,
    grant: (itemId: string, quantity: number) => Promise<void> | void,
): Promise<GiftBundlePurchaseResult> {
    if (validateGiftBundle(def).length > 0) return { ok: false, reason: 'invalid-bundle' };
    if (def.purchaseLimit !== undefined && purchasedCount >= def.purchaseLimit) return { ok: false, reason: 'limit-reached' };
    if (!wallet.spend(def.price)) return { ok: false, reason: 'insufficient-funds' };
    for (const item of def.items) await grant(item.itemId, item.quantity);
    return { ok: true };
}
