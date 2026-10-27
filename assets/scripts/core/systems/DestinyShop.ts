// @spec-source → 轉蛋系統.md (doc_spec_0042) §E #7 天命商店、§F 保底計算（pull_count >= 200 → unlock 天命商店 exchange；各池獨立計數）
/**
 * DestinyShop — 天命商店：大保底兌換（純邏輯，不依賴 cc）
 *
 * 規則：
 *   - 每池累計每滿 200 抽得 1 次兌換資格；資格 = floor(累計抽數 / 200) − 已兌換次數。
 *   - 兌換只能選該池的 SSR；兌換不動累計抽數，所以小保底週期不受影響。
 *   - 各池獨立：名將池的資格不能拿去換支援卡池的 SSR。
 *
 * 暫定（規格沒寫清楚）：兌換不累加為抽數；資格可累積不過期。
 *
 * Unity 對照：像一個只看計數器的兌換商店（ScriptableObject 存價格），不碰場景。
 */
import { GACHA_LARGE_PITY_COUNT, normalizeGachaPity, type GachaPityState } from './GachaDraw';

export const DESTINY_SHOP_PULLS_PER_EXCHANGE = GACHA_LARGE_PITY_COUNT;

export type DestinyShopBlockReason = 'no-credit' | 'not-in-pool' | 'not-ssr';

/** 兌換結果：成功時 nextPity 有值、reason 為 null；被擋時相反 */
export interface DestinyShopExchangeResult {
    nextPity: GachaPityState | null;
    reason: DestinyShopBlockReason | null;
}

/** 可兌換次數（不會是負數） */
export function destinyShopCredits(pity: unknown): number {
    const state = normalizeGachaPity(pity);
    const earned = Math.floor(state.pullCount / DESTINY_SHOP_PULLS_PER_EXCHANGE);
    return Math.max(0, earned - (state.destinyExchanges ?? 0));
}

/** 距離下一次兌換資格還差幾抽 */
export function pullsToNextDestinyCredit(pity: unknown): number {
    const state = normalizeGachaPity(pity);
    return DESTINY_SHOP_PULLS_PER_EXCHANGE - (state.pullCount % DESTINY_SHOP_PULLS_PER_EXCHANGE);
}

/**
 * 兌換一位 SSR：targetId 必須在 ssrIds 內（呼叫端給的是該池的 SSR 名單）。
 * 成功回傳新的保底狀態（已兌換次數 +1，累計抽數不變）。
 */
export function exchangeDestinyShop(
    pity: unknown,
    targetId: string,
    poolIds: readonly string[],
    ssrIds: readonly string[],
): DestinyShopExchangeResult {
    if (destinyShopCredits(pity) <= 0) return { nextPity: null, reason: 'no-credit' };
    if (!poolIds.includes(targetId)) return { nextPity: null, reason: 'not-in-pool' };
    if (!ssrIds.includes(targetId)) return { nextPity: null, reason: 'not-ssr' };
    const state = normalizeGachaPity(pity);
    return { nextPity: { ...state, destinyExchanges: (state.destinyExchanges ?? 0) + 1 }, reason: null };
}
