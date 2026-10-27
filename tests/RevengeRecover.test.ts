/**
 * RevengeRecover.test.ts — 復仇取回（RET-05）：缺糧紀錄帶缺口數量，多季推進與存讀檔後仍可取回一次
 *
 * Unity 對照：像一張帶數值的事件紀錄，玩家按下「取回」時扣掉紀錄、把比例換算的資源加回背包，
 * 重開遊戲後紀錄還在，所以不能重複領。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { normalizePlayerLogs, revengeRecoverAmount } from '../assets/scripts/core/systems/DailyNewsEngine';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';

function roundTrip(snapshot: PlayerSaveSnapshot): PlayerSaveSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as PlayerSaveSnapshot;
}

function setFood(session: GameSession, food: number): void {
    (session as unknown as { _military: { food: number } })._military.food = food;
}

export function createRevengeRecoverSuite(): TestSuite {
    const suite = new TestSuite('RevengeRecover (RET-05 復仇取回)');

    suite.test('換算：損失 × 百分比，百分比夾在 5%~20%，向下取整', () => {
        assert.equals(3, revengeRecoverAmount(30, 10));
        assert.equals(1, revengeRecoverAmount(30, 1), '低於 5% 以 5% 計：floor(30×5%)=1');
        assert.equals(6, revengeRecoverAmount(30, 50), '高於 20% 以 20% 計：floor(30×20%)=6');
        assert.equals(0, revengeRecoverAmount(0, 10));
        assert.equals(0, revengeRecoverAmount(-5, 10));
        assert.equals(1, revengeRecoverAmount(30, Number.NaN), '非有限百分比以下限 5% 計：floor(30×5%)=1');
    });

    suite.test('讀檔：缺口數量保留；非法或缺欄位的數量丟掉，紀錄本身保留', () => {
        const logs = normalizePlayerLogs([
            { type: 'RESOURCE_LOW', at: 1, resource: '糧草', amount: 30 },
            { type: 'RESOURCE_LOW', at: 2, resource: '糧草', amount: -4 },
            { type: 'RESOURCE_LOW', at: 3, resource: '糧草', amount: 2.5 },
        ]);
        assert.equals(3, logs.length);
        assert.equals(30, logs[0].amount!);
        assert.isTrue(logs[1].amount === undefined);
        assert.isTrue(logs[2].amount === undefined);
    });

    suite.test('多季：缺糧紀錄帶缺口，跨季與存讀檔後取回一次，之後不可重領', async () => {
        const session = new GameSession(1);
        setFood(session, 20);
        await session.advanceSeason();
        await session.advanceSeason();
        await session.advanceSeason();

        const shortage = session.playerLogs.filter((log) => log.type === 'RESOURCE_LOW');
        assert.isTrue(shortage.length > 0, '缺糧季應寫入 RESOURCE_LOW');
        const lost = shortage[shortage.length - 1].amount!;
        assert.isTrue(lost > 0, '缺口數量應大於 0');

        const restored = new GameSession(1);
        restored.restoreLifespanState(roundTrip(session.createSnapshot(new Date(0))));
        assert.equals(lost, restored.playerLogs.filter((log) => log.type === 'RESOURCE_LOW').pop()!.amount!);

        const foodBefore = restored.military.food;
        const recovered = restored.claimRevengeRecovery(10);
        assert.equals(revengeRecoverAmount(lost, 10), recovered);
        assert.equals(foodBefore + recovered, restored.military.food);

        assert.equals(0, restored.claimRevengeRecovery(10), '同一筆紀錄不可重領');
        assert.equals(foodBefore + recovered, restored.military.food);
    });

    suite.test('沒有缺糧紀錄時取回為 0，糧草不變', async () => {
        const session = new GameSession(1);
        await session.advanceSeason();
        const foodBefore = session.military.food;
        assert.equals(0, session.claimRevengeRecovery(20));
        assert.equals(foodBefore, session.military.food);
    });

    return suite;
}
