// @spec-source → 轉蛋系統.md §貨幣系統、§單抗 / 10 連 UI 流程、§I 名詞（靈玉 / 銅錢符 / 求籤令）；PROG-2-0336（WBS GCH-04）
/**
 * GachaCurrency — 轉蛋貨幣分流與扣款規則（純邏輯，不依賴 cc）
 *
 * 規則：
 *   - 靈玉（付費）：三國名將池、支援卡池、限定池皆可用（限定池為暫定，見 PROG-2-0336）。
 *   - 銅錢符（免費）：僅常設池可用，限定池不支援。
 *   - 求籤令：定向道具，不作為抽卡幣；指定一位 SSR，最多 100 抽內必出該角色。
 *   - 單抽 150、十連 1500；餘額不足直接拒絕（不自動補款）。
 *
 * 本檔只定義規則，不碰錢包；現行錢包仍是 gems/gold/tickets，接線另開卡。
 *
 * Unity 對照：像 ScriptableObject 的 Shop 規則表——先查「這個幣能不能買這個櫃」，
 * 再查「錢夠不夠」，兩關都過才扣款。
 */

export type GachaCurrencyType = 'SPIRIT_JADE' | 'BRONZE_CHARM';
export type GachaPoolKind = 'HERO' | 'SUPPORT' | 'LIMITED';

export const GACHA_SINGLE_PULL_COST = 150;
export const GACHA_TEN_PULL_COST = 1500;
/** 求籤令定向保底：最多 100 抽內必出目標 SSR */
export const DIRECTED_PITY_CAP = 100;

const POOL_ACCEPTS: Readonly<Record<GachaCurrencyType, Readonly<Record<GachaPoolKind, boolean>>>> = Object.freeze({
    SPIRIT_JADE: { HERO: true, SUPPORT: true, LIMITED: true },
    BRONZE_CHARM: { HERO: true, SUPPORT: true, LIMITED: false },
});

export function isPoolAcceptingCurrency(currency: GachaCurrencyType, pool: GachaPoolKind): boolean {
    return POOL_ACCEPTS[currency][pool];
}

/** 單抽 ×1 = 150；十連 = 1500（與 10 次單抽同價）；其他次數依單抽價計 */
export function quoteGachaCost(drawCount: number): number {
    const count = Math.max(0, Math.floor(Number.isFinite(drawCount) ? drawCount : 0));
    if (count === 10) return GACHA_TEN_PULL_COST;
    return count * GACHA_SINGLE_PULL_COST;
}

export type GachaSpendRejectReason = 'POOL_NOT_ALLOWED' | 'INSUFFICIENT';

export interface GachaSpendCheck {
    ok: boolean;
    reason?: GachaSpendRejectReason;
    /** 不足時的差額 */
    shortfall: number;
}

export function checkGachaSpend(
    currency: GachaCurrencyType,
    pool: GachaPoolKind,
    drawCount: number,
    balance: number,
): GachaSpendCheck {
    if (!isPoolAcceptingCurrency(currency, pool)) {
        return { ok: false, reason: 'POOL_NOT_ALLOWED', shortfall: 0 };
    }
    const cost = quoteGachaCost(drawCount);
    const have = Number.isFinite(balance) ? Math.max(0, balance) : 0;
    if (have < cost) {
        return { ok: false, reason: 'INSUFFICIENT', shortfall: cost - have };
    }
    return { ok: true, shortfall: 0 };
}

/** 求籤令定向保底狀態：目前鎖定的目標 SSR 與其之後已抽次數 */
export interface DirectedPityState {
    targetId: string | null;
    pullsSinceTarget: number;
}

export function createDirectedPity(): DirectedPityState {
    return { targetId: null, pullsSinceTarget: 0 };
}

/** 使用一張求籤令鎖定目標；已有目標時改鎖新目標並重新計數 */
export function activateDirectedPity(targetId: string): DirectedPityState {
    if (!targetId) throw new Error('[GachaCurrency] 求籤令目標不可為空');
    return { targetId, pullsSinceTarget: 0 };
}

/** 下一抽是否必須出目標（已抽滿 100 抽仍未出，則下一抽保底） */
export function isDirectedPityDue(state: DirectedPityState): boolean {
    return state.targetId !== null && state.pullsSinceTarget + 1 >= DIRECTED_PITY_CAP;
}

/** 一抽結束後推進定向保底計數；抽到目標即清空（回到無目標） */
export function advanceDirectedPity(state: DirectedPityState, pulledId: string): DirectedPityState {
    if (state.targetId === null) return state;
    if (pulledId === state.targetId) return createDirectedPity();
    return { targetId: state.targetId, pullsSinceTarget: state.pullsSinceTarget + 1 };
}
