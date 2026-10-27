/**
 * GameSessionTerritoryUpgrade.test.ts — 太守府升級下單、季結生效與格數上限（PROG-2-0979）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';

function withRoster(session: GameSession, ...ids: string[]): GameSession {
    session.setRosterStore(new InMemoryRosterStore(ids.map((id) => ({ id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 120 } as unknown as GeneralConfig))));
    return session;
}

/** 糧草給足，讓升級下單只受測試目標影響（起始糧草不一定夠 Lv2 費用） */
function withFood(session: GameSession, food: number): GameSession {
    (session as unknown as { _military: { food: number } })._military.food = food;
    return session;
}

function roundTrip(snapshot: PlayerSaveSnapshot): PlayerSaveSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as PlayerSaveSnapshot;
}

export function createGameSessionTerritoryUpgradeSuite(): TestSuite {
    const suite = new TestSuite('GameSessionTerritoryUpgrade (PROG-2-0979 領地升級)');

    suite.test('新遊戲為 Lv1、2 格，沒有待生效升級', () => {
        const session = new GameSession(1);
        assert.equals(1, session.territoryLevel);
        assert.equals(2, session.maxTaskSlots);
        assert.isTrue(session.pendingTerritoryLevel === null);
    });

    suite.test('下單即扣糧草與金錢，季結後才升級並增加格數', async () => {
        const session = withFood(new GameSession(1), 10000);
        const foodBefore = session.military.food;
        let spent = 0;
        const plan = session.orderTerritoryUpgrade((amount) => { spent = amount; return true; });
        assert.isTrue(plan.ok);
        assert.equals(4000, spent);
        assert.equals(foodBefore - 1000, session.military.food);
        assert.equals(2, session.pendingTerritoryLevel!);
        assert.equals(1, session.territoryLevel);

        await session.advanceSeason();
        assert.equals(2, session.territoryLevel);
        assert.isTrue(session.pendingTerritoryLevel === null);
        assert.equals(3, session.maxTaskSlots);
    });

    suite.test('錢包不足時整筆不成立，糧草與待生效狀態不變', () => {
        const session = withFood(new GameSession(1), 10000);
        const foodBefore = session.military.food;
        const plan = session.orderTerritoryUpgrade(() => false);
        assert.isFalse(plan.ok);
        assert.equals('insufficient-gold', plan.reason!);
        assert.equals(foodBefore, session.military.food);
        assert.isTrue(session.pendingTerritoryLevel === null);
    });

    suite.test('待生效期間不能再下單，第二次下單被拒絕且不扣款', () => {
        const session = withFood(new GameSession(1), 10000);
        assert.isTrue(session.orderTerritoryUpgrade(() => true).ok);
        let called = false;
        const second = session.orderTerritoryUpgrade(() => { called = true; return true; });
        assert.isFalse(second.ok);
        assert.equals('upgrade-pending', second.reason!);
        assert.isFalse(called);
    });

    suite.test('跨存讀檔保留等級與待生效升級；預設值不寫入欄位', async () => {
        const session = withFood(withRoster(new GameSession(1), 'G010'), 10000);
        assert.isTrue(session.createSnapshot(new Date(0)).territoryLevel === undefined);

        await session.advanceSeason();
        session.orderTerritoryUpgrade(() => true);
        const snapshot = roundTrip(session.createSnapshot(new Date(0)));
        assert.equals(2, snapshot.territoryUpgradePending!);

        const restored = new GameSession(1);
        restored.restoreLifespanState(snapshot);
        assert.equals(2, restored.pendingTerritoryLevel!);
        assert.equals(1, restored.territoryLevel);
    });

    suite.test('舊檔或壞資料：等級回到 Lv1，無效的待生效目標視為沒有', () => {
        const restored = new GameSession(1);
        restored.restoreLifespanState({ territoryLevel: 9, territoryUpgradePending: 1 } as unknown as PlayerSaveSnapshot);
        assert.equals(1, restored.territoryLevel);
        assert.isTrue(restored.pendingTerritoryLevel === null);
    });

    return suite;
}
