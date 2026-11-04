// @spec-source → 大廳系統.md (doc_spec_0002) §E-7 許願祭壇；UI-2-0154（UI-2-0123 子項：幕府大廳祭壇面板）
/**
 * LobbyHallAltarView — 許願池狀態 → 幕府大廳祭壇面板顯示（純邏輯，不依賴 cc）。
 *
 * 面板只放得下 LOBBY_HALL_ALTAR_SLOTS 格；格子依進行中許願的順序排列，不足補空位。
 * 巡次與時間以 WishPool 為權威，剩餘時間沿用許願祭壇彈窗的 remainingText 格式。
 *
 * Unity 對照：像 ViewModel，把 Model 狀態轉成 UI Text 要顯示的字串。
 */
import { LOGIN_DAY_OFFSET_MINUTES } from '../../core/systems/LoginStreak';
import { isWishReady, wishItemName, wishRoundOf, WISH_POOL_CONFIG, type WishPoolState } from '../../core/systems/WishPool';
import { remainingText } from './WishAltarController';

/** 設計稿祭壇面板的插槽數 */
export const LOBBY_HALL_ALTAR_SLOTS = 3;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export interface LobbyHallAltarSlotView {
    readonly title: string;
    readonly status: string;
    readonly ready: boolean;
}

export interface LobbyHallAltarView {
    readonly headText: string;
    readonly nextRoundText: string;
    readonly slots: readonly LobbyHallAltarSlotView[];
}

/** 距下一巡開始的毫秒數；巡次邊界與 wishRoundOf 相同（含登入日偏移） */
export function msUntilNextWishRound(nowMs: number): number {
    const [first, ...rest] = WISH_POOL_CONFIG.roundStartHours;
    const shifted = nowMs + LOGIN_DAY_OFFSET_MINUTES * 60_000 - first * HOUR_MS;
    const intoDay = ((shifted % DAY_MS) + DAY_MS) % DAY_MS;
    const bounds = [...rest.map((h) => (h - first) * HOUR_MS), DAY_MS];
    return (bounds.find((b) => b > intoDay) ?? DAY_MS) - intoDay;
}

export function buildLobbyHallAltarView(pool: WishPoolState, nowMs: number): LobbyHallAltarView {
    const slots: LobbyHallAltarSlotView[] = [];
    for (let i = 0; i < LOBBY_HALL_ALTAR_SLOTS; i++) {
        const wish = pool.activeWishes[i];
        if (!wish) {
            slots.push({ title: '空位', status: '點擊許願', ready: false });
            continue;
        }
        const ready = isWishReady(wish, nowMs);
        slots.push({
            title: `${wishItemName(wish.itemId)} ×${wish.amount}`,
            status: ready ? '可收取' : `剩 ${remainingText(wish.endMs - nowMs)}`,
            ready,
        });
    }
    return {
        headText: `許願祭壇 · 第 ${wishRoundOf(nowMs).round} 巡`,
        nextRoundText: `下一巡 ${remainingText(msUntilNextWishRound(nowMs))}`,
        slots,
    };
}
