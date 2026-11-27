// @spec-source → 傳世名酒宴飲結義與割袍斷義狀態機規格書 doc_spec_0743 §2（三大名酒、宴飲好感 +15～+35）；六日傭兵結義規格 doc_spec_0583 §4.1（SSR 杜康佳釀×2、UR 九醞春酒×3）；Q42 路線待裁決；PROG-2-10207
/**
 * WineBanquet — 名酒宴飲與結義名酒支付（純邏輯，不依賴 cc）。
 *
 * - holdBanquet：判定能否宴飲（持有量、配對未割袍）並算好感增量（取自 oath-config.json）；名酒的實際扣除由 GameSession 走共通物品 API（item.consume）。
 * - planBondPayment：傭兵結義用點數還是名酒付。Q42 未裁決，路線由 oath-config.json 的 wine.mode 決定：
 *     dual（預設）：優先扣點數，點數不足且名酒足夠時改用名酒；
 *     wine-required：高稀有度（SSR／UR）只能用名酒，其餘稀有度仍走點數。
 *
 * 只回傳判定與好感增量，不改庫存、不寫存檔、不碰好感表；呼叫端（GameSession）負責套用。
 * Unity 對照：像商店結帳單，先算出要扣什麼，再由購物車真正扣。
 */
import { itemCount, type PlayerInventory } from './PlayerInventory';
import type { OathConfig, WineId } from './OathConfig';

export type BanquetRejectReason = 'unknown-wine' | 'same-general' | 'no-wine' | 'severed-pair';

export type BanquetResult =
    | { ok: true; wineId: WineId; itemId: string; affinityGain: number; affinityAfter: number }
    | { ok: false; reason: BanquetRejectReason };

/** 宴飲判定：需持有 1 瓶指定名酒，回傳好感增量（上限夾在 100）；不扣酒。 */
export function holdBanquet(
    inventory: PlayerInventory,
    wineId: string,
    hostId: string,
    guestId: string,
    currentAffinity: number,
    severed: boolean,
    config: OathConfig,
): BanquetResult {
    const def = (config.wine.wines as Record<string, { itemId: string; affinityGain: number } | undefined>)[wineId];
    if (!def) return { ok: false, reason: 'unknown-wine' };
    if (!hostId || !guestId || hostId === guestId) return { ok: false, reason: 'same-general' };
    if (severed) return { ok: false, reason: 'severed-pair' };
    if (itemCount(inventory, def.itemId) < 1) return { ok: false, reason: 'no-wine' };
    const affinityAfter = Math.min(100, currentAffinity + def.affinityGain);
    return { ok: true, wineId: wineId as WineId, itemId: def.itemId, affinityGain: affinityAfter - currentAffinity, affinityAfter };
}

export type BondPayRejectReason = 'insufficient-points' | 'insufficient-wine';

export type BondPayPlan =
    | { ok: true; path: 'points'; pointsCost: number }
    | { ok: true; path: 'wine'; wineId: WineId; itemId: string; qty: number }
    | { ok: false; reason: BondPayRejectReason };

/** 結義付款方案：依 wine.mode 決定點數或名酒；不改任何狀態。 */
export function planBondPayment(
    rarity: string,
    pointsCost: number,
    bondPoints: number,
    inventory: PlayerInventory,
    config: OathConfig,
): BondPayPlan {
    const wineCost = config.wine.highRarities.includes(rarity) ? config.wine.bondWine[rarity] : undefined;
    const wineItem = wineCost ? config.wine.wines[wineCost.wineId].itemId : '';
    const hasWine = wineCost !== undefined && itemCount(inventory, wineItem) >= wineCost.qty;
    const winePlan = (): BondPayPlan => ({ ok: true, path: 'wine', wineId: wineCost!.wineId, itemId: wineItem, qty: wineCost!.qty });
    if (config.wine.mode === 'wine-required' && wineCost) {
        return hasWine ? winePlan() : { ok: false, reason: 'insufficient-wine' };
    }
    if (bondPoints >= pointsCost) return { ok: true, path: 'points', pointsCost };
    if (hasWine) return winePlan();
    return { ok: false, reason: 'insufficient-points' };
}
