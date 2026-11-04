/**
 * LobbyHallAltarView.test.ts — 許願池狀態轉幕府大廳祭壇面板顯示（UI-2-0154）
 */
import { assert, TestSuite } from './TestRunner';
import { createWishPoolState, startWish, wishRoundOf, WISH_ITEMS } from '../assets/scripts/core/systems/WishPool';
import { buildLobbyHallAltarView, msUntilNextWishRound, LOBBY_HALL_ALTAR_SLOTS } from '../assets/scripts/ui/core/LobbyHallAltarView';

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 4, 2, 0, 0); // 台北 10:00，第 1 巡

export function createLobbyHallAltarViewSuite(): TestSuite {
    const suite = new TestSuite('LobbyHallAltarView');

    suite.test('下一巡倒數落在巡次邊界：邊界前一分鐘剩 1 分、跨過後巡次改變', () => {
        const left = msUntilNextWishRound(NOW);
        assert.isTrue(left > 0 && left <= 12 * HOUR);
        const before = NOW + left - 60_000;
        assert.equals(msUntilNextWishRound(before), 60_000);
        assert.isTrue(wishRoundOf(before).round !== wishRoundOf(NOW + left).round || wishRoundOf(before).day !== wishRoundOf(NOW + left).day);
    });

    suite.test('沒有許願時 3 格皆為空位，標題帶目前巡次', () => {
        const view = buildLobbyHallAltarView(createWishPoolState(), NOW);
        assert.equals(view.slots.length, LOBBY_HALL_ALTAR_SLOTS);
        assert.equals(view.slots[0].title, '空位');
        assert.equals(view.slots[0].status, '點擊許願');
        assert.equals(view.headText, `許願祭壇 · 第 ${wishRoundOf(NOW).round} 巡`);
        assert.isTrue(view.nextRoundText.startsWith('下一巡 '));
    });

    suite.test('進行中顯示剩餘時間，到期顯示可收取', () => {
        const def = WISH_ITEMS[0];
        const r = startWish(createWishPoolState(), def.itemId, NOW);
        assert.isTrue(r.ok);
        if (!r.ok) return;
        const running = buildLobbyHallAltarView(r.state, NOW);
        assert.equals(running.slots[0].status, `剩 ${def.redemptionHours}h00m`);
        assert.isTrue(!running.slots[0].ready);
        assert.equals(running.slots[1].title, '空位');
        const done = buildLobbyHallAltarView(r.state, NOW + def.redemptionHours * HOUR);
        assert.equals(done.slots[0].status, '可收取');
        assert.isTrue(done.slots[0].ready);
    });

    return suite;
}
