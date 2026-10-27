/**
 * WishPool.test.ts — 許願池免費許願軌：巡次、上限、加速卡、領取、存讀檔（PROG-2-1198）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { ITEM_ORACLE_TOKEN, ITEM_VITALITY_PILL, ITEM_WISH_SPEED_CARD } from '../assets/scripts/core/systems/PlayerInventory';
import {
    applySpeedCards, claimReadyWishes, createWishPoolState, normalizeWishPoolState, speedCardsNeeded, startWish, wishAmountOf,
    wishesLeftThisRound, wishItemName, wishRoundOf, WISH_ITEMS, WISH_POOL_CONFIG, type WishPoolState,
} from '../assets/scripts/core/systems/WishPool';

const H = 3_600_000;
/** UTC+8 2026-03-28 指定時刻 */
const at = (hour: number, day = 28): number => Date.UTC(2026, 2, day, hour - 8);

function wished(state: WishPoolState, itemId: string, nowMs: number): WishPoolState {
    const result = startWish(state, itemId, nowMs);
    if ('reason' in result) throw new Error(`expected wish ok, got ${result.reason}`);
    return result.state;
}

export function createWishPoolSuite(): TestSuite {
    const suite = new TestSuite('WishPool (PROG-2-1198 許願池免費許願軌)');

    suite.test('巡次：06 早、12 中、18 晚；凌晨算前一日晚巡', () => {
        assert.equals('2026-03-28/1', `${wishRoundOf(at(6)).day}/${wishRoundOf(at(6)).round}`);
        assert.equals(2, wishRoundOf(at(13)).round);
        assert.equals(3, wishRoundOf(at(23)).round);
        const dawn = wishRoundOf(at(3, 29));
        assert.equals('2026-03-28/3', `${dawn.day}/${dawn.round}`);
    });

    suite.test('商品表 6 項，許願數量至少 1；未知商品拒絕', () => {
        assert.equals(6, WISH_ITEMS.length);
        assert.equals('補元散,求籤令,入學令,虎符精華,轉職令,延壽丹', WISH_ITEMS.map((d) => wishItemName(d.itemId)).join(','));
        assert.isTrue(WISH_ITEMS.every((d) => wishAmountOf(d) >= 1));
        const bad = startWish(createWishPoolState(), 'NOPE', at(7));
        assert.isTrue('reason' in bad && bad.reason === 'unknown-item');
    });

    suite.test('許願：補元散 8h 後實現，編號遞增', () => {
        const result = startWish(createWishPoolState(), ITEM_VITALITY_PILL, at(7));
        assert.isTrue(result.ok);
        if ('reason' in result) return;
        assert.equals('W001', result.wish.wishId);
        assert.equals(at(15), result.wish.endMs);
        assert.equals(1, result.wish.amount);
        assert.equals(2, result.state.nextSerial);
    });

    suite.test('每巡 3 項；下一巡可再許；換日清空計數', () => {
        let s = createWishPoolState();
        for (let i = 0; i < 3; i++) s = wished(s, ITEM_VITALITY_PILL, at(7));
        const full = startWish(s, ITEM_VITALITY_PILL, at(8));
        assert.isTrue('reason' in full && full.reason === 'round-full');
        assert.equals(3, wishesLeftThisRound(s, at(12)));
        s = claimReadyWishes(s, at(20)).state;
        assert.equals(0, s.activeWishes.length);
        assert.equals(3, wishesLeftThisRound(s, at(7, 29)));
    });

    suite.test('同時進行最多 5 個', () => {
        let s = createWishPoolState();
        for (let i = 0; i < 3; i++) s = wished(s, ITEM_ORACLE_TOKEN, at(7));
        for (let i = 0; i < 2; i++) s = wished(s, ITEM_ORACLE_TOKEN, at(13));
        assert.equals(WISH_POOL_CONFIG.maxConcurrentWishes, s.activeWishes.length);
        const full = startWish(s, ITEM_ORACLE_TOKEN, at(13));
        assert.isTrue('reason' in full && full.reason === 'concurrent-full');
    });

    suite.test('加速卡每張 -2h，不早於開始；只算需要的張數', () => {
        const s = wished(createWishPoolState(), ITEM_VITALITY_PILL, at(7));
        assert.equals(2, speedCardsNeeded(s, 'W001', 2, at(7)));
        assert.equals(4, speedCardsNeeded(s, 'W001', 9, at(7)));
        assert.equals(0, speedCardsNeeded(s, 'W999', 3, at(7)));
        const faster = applySpeedCards(s, 'W001', 2);
        assert.equals(at(11), faster.activeWishes[0].endMs);
        assert.equals(2, faster.activeWishes[0].speedCardsUsed);
        assert.equals(at(7), applySpeedCards(s, 'W001', 10).activeWishes[0].endMs);
    });

    suite.test('未到期不能領；到期領取後移除', () => {
        const s = wished(createWishPoolState(), ITEM_VITALITY_PILL, at(7));
        assert.equals(0, claimReadyWishes(s, at(14)).claimed.length);
        const done = claimReadyWishes(s, at(15));
        assert.equals(1, done.claimed.length);
        assert.equals(0, done.state.activeWishes.length);
    });

    suite.test('正規化：非物件為 null，丟棄壞資料與未知商品', () => {
        assert.equals(null, normalizeWishPoolState(undefined));
        const n = normalizeWishPoolState({
            activeWishes: [{ wishId: 'W001', itemId: ITEM_VITALITY_PILL, amount: 1, startMs: 10, endMs: 5 }, { wishId: 'W002', itemId: 'NOPE', amount: 1, startMs: 0, endMs: 1 }, 'x'],
            day: 'bad', roundWishes: [9, -1], nextSerial: 3,
        })!;
        assert.equals(1, n.activeWishes.length);
        assert.equals(10, n.activeWishes[0].endMs);
        assert.equals(null, n.day);
        assert.equals('3,0,0', n.roundWishes.join(','));
        assert.equals(3, n.nextSerial);
    });

    suite.test('GameSession：許願、加速扣卡、領取入背包、存讀檔保留', () => {
        const session = new GameSession(1);
        void session.addItem(ITEM_WISH_SPEED_CARD, 3);
        assert.isTrue(session.startWish(ITEM_VITALITY_PILL, at(7)).ok);
        assert.equals(3, session.speedUpWish('W001', 3, at(7)));
        assert.equals(0, session.itemCount(ITEM_WISH_SPEED_CARD));
        assert.equals(0, session.speedUpWish('W001', 1, at(7)));
        assert.equals(at(9), session.wishPool.activeWishes[0].endMs);

        const restored = new GameSession(1);
        restored.restoreLifespanState(JSON.parse(JSON.stringify(session.createSnapshot(new Date(0)))) as PlayerSaveSnapshot);
        assert.equals(1, restored.wishPool.activeWishes.length);
        const before = restored.itemCount(ITEM_VITALITY_PILL);
        assert.equals(0, restored.claimWishes(at(8)).length);
        assert.equals(1, restored.claimWishes(at(9)).length);
        assert.equals(before + 1, restored.itemCount(ITEM_VITALITY_PILL));
    });

    return suite;
}
