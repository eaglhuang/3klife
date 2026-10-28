// @spec-source → 經濟系統.md (doc_spec_0032)；PROG-2-1429 依建檔紀錄補標出處
/**
 * WishPool — 許願池免費許願軌（doc_spec_0032 §E-6，PROG-2-1198）
 *
 * - 每日早／中／晚 3 巡（UTC+8 06:00／12:00／18:00）；00:00–06:00 仍算前一日晚巡。
 * - 每巡可許願 3 項、同時最多 5 個進行中；許願後經償還期（8～24h）才可領取。
 * - 加速卡每張縮短 2h，剩餘時間不低於 0。
 * - 課金即買軌、加速卡來源不在本模組。
 *
 * Unity 對照：像一個只有靜態方法的 WishPoolRules，狀態為不可變 struct，存檔交給 GameSession。
 */

import { LOGIN_DAY_OFFSET_MINUTES } from './LoginStreak';
import { ACCELERATE_CARD_HOURS, accelerateRemaining } from './AccelerateCard';
import {
    ITEM_DISPLAY_NAMES, ITEM_ADMISSION_TOKEN, ITEM_JOB_CHANGE_ORDER, ITEM_LONGEVITY_PILL, ITEM_ORACLE_TOKEN, ITEM_TALLY_ESSENCE, ITEM_VITALITY_PILL,
} from './PlayerInventory';

const HOUR_MS = 3_600_000;

export const WISH_POOL_CONFIG = {
    /** 每巡開始時刻（UTC+8 時） */
    roundStartHours: [6, 12, 18] as readonly number[],
    wishesPerRound: 3,
    maxConcurrentWishes: 5,
} as const;

/** 加速卡：每張縮短 2h；精元 5 購買 1 張（購買不在本卡） */
export const SPEED_CARD_HOURS = ACCELERATE_CARD_HOURS;
export const SPEED_CARD_PRICE = 5;

export interface WishItemDef {
    /** 背包道具 id */
    itemId: string;
    /** 課金即買數量（PM 暫定：讓每件許願得 1 個） */
    fullAmount: number;
    /** 許願產量比率 */
    yieldRate: number;
    /** 償還時數 */
    redemptionHours: number;
}

/** 許願商品表（WISH_YIELD_TABLE；規格 id → 背包 id） */
export const WISH_ITEMS: readonly WishItemDef[] = [
    { itemId: ITEM_VITALITY_PILL, fullAmount: 5, yieldRate: 0.20, redemptionHours: 8 },
    { itemId: ITEM_ORACLE_TOKEN, fullAmount: 7, yieldRate: 0.15, redemptionHours: 12 },
    { itemId: ITEM_ADMISSION_TOKEN, fullAmount: 10, yieldRate: 0.10, redemptionHours: 16 },
    { itemId: ITEM_TALLY_ESSENCE, fullAmount: 10, yieldRate: 0.10, redemptionHours: 24 },
    { itemId: ITEM_JOB_CHANGE_ORDER, fullAmount: 20, yieldRate: 0.05, redemptionHours: 24 },
    { itemId: ITEM_LONGEVITY_PILL, fullAmount: 20, yieldRate: 0.05, redemptionHours: 24 },
];

/** 許願商品顯示名（背包名稱表，PROG-2-1200 起含許願池新道具） */
export function wishItemName(itemId: string): string {
    return ITEM_DISPLAY_NAMES[itemId] ?? itemId;
}

export interface ActiveWish {
    wishId: string;
    itemId: string;
    amount: number;
    startMs: number;
    endMs: number;
    speedCardsUsed: number;
}

export interface WishPoolState {
    activeWishes: ActiveWish[];
    /** 巡次所屬日（YYYY-MM-DD，UTC+8，06:00 切巡日）；從未許願為 null */
    day: string | null;
    /** 該日每巡已許願數（索引 0～2 對應早／中／晚） */
    roundWishes: number[];
    /** 下一個許願流水號 */
    nextSerial: number;
}

export type WishStartReason = 'unknown-item' | 'round-full' | 'concurrent-full';

export interface WishRound {
    day: string;
    /** 1～3：早／中／晚 */
    round: number;
}

export function createWishPoolState(): WishPoolState {
    return { activeWishes: [], day: null, roundWishes: [0, 0, 0], nextSerial: 1 };
}

export function wishItemDef(itemId: string): WishItemDef | undefined {
    return WISH_ITEMS.find((d) => d.itemId === itemId);
}

/** 許願數量 = max(1, floor(課金即買數量 × 產量比率)) */
export function wishAmountOf(def: WishItemDef): number {
    return Math.max(1, Math.floor(def.fullAmount * def.yieldRate));
}

/** 目前巡次：00:00–06:00 屬前一日晚巡 */
export function wishRoundOf(nowMs: number): WishRound {
    const [first, second, third] = WISH_POOL_CONFIG.roundStartHours;
    const shifted = new Date(nowMs + LOGIN_DAY_OFFSET_MINUTES * 60_000 - first * HOUR_MS);
    const day = shifted.toISOString().slice(0, 10);
    const hour = shifted.getUTCHours() + first;
    const round = hour >= third ? 3 : hour >= second ? 2 : 1;
    return { day, round };
}

/** 換日後清空每巡計數 */
function rolled(state: WishPoolState, nowMs: number): WishPoolState {
    const { day } = wishRoundOf(nowMs);
    return state.day === day ? state : { ...state, day, roundWishes: [0, 0, 0] };
}

/** 本巡剩餘可許願數（同時進行上限另計） */
export function wishesLeftThisRound(state: WishPoolState, nowMs: number): number {
    const { round } = wishRoundOf(nowMs);
    return Math.max(0, WISH_POOL_CONFIG.wishesPerRound - (rolled(state, nowMs).roundWishes[round - 1] ?? 0));
}

export function startWish(state: WishPoolState, itemId: string, nowMs: number): { ok: true; state: WishPoolState; wish: ActiveWish } | { ok: false; reason: WishStartReason } {
    const def = wishItemDef(itemId);
    if (!def) return { ok: false, reason: 'unknown-item' };
    if (state.activeWishes.length >= WISH_POOL_CONFIG.maxConcurrentWishes) return { ok: false, reason: 'concurrent-full' };
    if (wishesLeftThisRound(state, nowMs) <= 0) return { ok: false, reason: 'round-full' };
    const base = rolled(state, nowMs);
    const { round } = wishRoundOf(nowMs);
    const wish: ActiveWish = {
        wishId: `W${String(base.nextSerial).padStart(3, '0')}`,
        itemId,
        amount: wishAmountOf(def),
        startMs: nowMs,
        endMs: nowMs + def.redemptionHours * HOUR_MS,
        speedCardsUsed: 0,
    };
    const roundWishes = base.roundWishes.slice();
    roundWishes[round - 1] += 1;
    return { ok: true, wish, state: { ...base, activeWishes: [...base.activeWishes, wish], roundWishes, nextSerial: base.nextSerial + 1 } };
}

/** 實際需要的加速卡張數（剩餘時間不足時少用，不浪費）；找不到或已完成回 0 */
export function speedCardsNeeded(state: WishPoolState, wishId: string, cards: number, nowMs: number): number {
    const wish = state.activeWishes.find((w) => w.wishId === wishId);
    if (!wish || cards <= 0) return 0;
    return accelerateRemaining(wish.endMs - nowMs, cards).cardsUsed;
}

/** 使用加速卡：每張 -2h，結束時間不早於許願開始 */
export function applySpeedCards(state: WishPoolState, wishId: string, cards: number): WishPoolState {
    if (cards <= 0) return state;
    return {
        ...state,
        activeWishes: state.activeWishes.map((w) => (w.wishId !== wishId ? w : {
            ...w,
            endMs: Math.max(w.startMs, w.endMs - cards * SPEED_CARD_HOURS * HOUR_MS),
            speedCardsUsed: w.speedCardsUsed + cards,
        })),
    };
}

export function isWishReady(wish: ActiveWish, nowMs: number): boolean {
    return nowMs >= wish.endMs;
}

/** 領取所有已實現的許願 */
export function claimReadyWishes(state: WishPoolState, nowMs: number): { state: WishPoolState; claimed: ActiveWish[] } {
    const claimed = state.activeWishes.filter((w) => isWishReady(w, nowMs));
    if (claimed.length === 0) return { state, claimed };
    return { claimed, state: { ...state, activeWishes: state.activeWishes.filter((w) => !isWishReady(w, nowMs)) } };
}

function finiteInt(raw: unknown, min: number): number | null {
    return typeof raw === 'number' && Number.isFinite(raw) && raw >= min ? Math.floor(raw) : null;
}

function normalizeWish(raw: unknown): ActiveWish | null {
    if (!raw || typeof raw !== 'object') return null;
    const w = raw as Record<string, unknown>;
    const amount = finiteInt(w.amount, 1);
    const startMs = finiteInt(w.startMs, 0);
    const endMs = finiteInt(w.endMs, 0);
    if (typeof w.wishId !== 'string' || typeof w.itemId !== 'string' || !wishItemDef(w.itemId) || amount === null || startMs === null || endMs === null) return null;
    return { wishId: w.wishId, itemId: w.itemId, amount, startMs, endMs: Math.max(startMs, endMs), speedCardsUsed: finiteInt(w.speedCardsUsed, 0) ?? 0 };
}

/** 不是物件或沒有內容時回 null（存檔不寫入） */
export function normalizeWishPoolState(raw: unknown): WishPoolState | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    const activeWishes = (Array.isArray(r.activeWishes) ? r.activeWishes : [])
        .map(normalizeWish).filter((w): w is ActiveWish => w !== null)
        .slice(0, WISH_POOL_CONFIG.maxConcurrentWishes);
    const day = typeof r.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.day) ? r.day : null;
    const rounds = Array.isArray(r.roundWishes) ? r.roundWishes : [];
    const roundWishes = [0, 1, 2].map((i) => Math.min(WISH_POOL_CONFIG.wishesPerRound, finiteInt(rounds[i], 0) ?? 0));
    return { activeWishes, day, roundWishes, nextSerial: finiteInt(r.nextSerial, 1) ?? activeWishes.length + 1 };
}
