/**
 * DailySubsidyWiring.test.ts — 每日補貼接上 GameSession 與大廳提示（PROG-2-1340，ECO-06 接線）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { normalizeDailySubsidyRecord, type PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { dailySubsidyText } from '../assets/scripts/ui/core/DailySubsidyNotice';

/** UTC+8 2026-03-28 指定時刻 */
const at = (hour: number, day = 28): number => Date.UTC(2026, 2, day, hour - 8);

function lowSession(food: number, cityTroops: number): GameSession {
    const session = new GameSession(1);
    const military = (session as unknown as { _military: { food: number; cityTroops: number } })._military;
    military.food = food;
    military.cityTroops = cityTroops;
    return session;
}

export function createDailySubsidyWiringSuite(): TestSuite {
    const suite = new TestSuite('DailySubsidyWiring (PROG-2-1340 每日補貼接線)');

    suite.test('低於門檻才補：糧草與兵源進軍備，黃金交給錢包', () => {
        const session = lowSession(100, 50);
        const wallet = { gold: 0 };
        const grants = session.claimDailySubsidy(at(9), 100, (g) => { wallet.gold += g; });
        assert.equals(400, grants.food);
        assert.equals(150, grants.gold);
        assert.equals(200, grants.troops);
        assert.equals(500, session.military.food);
        assert.equals(250, session.military.cityTroops);
        assert.equals(150, wallet.gold);
        assert.equals('2026-03-28', session.dailySubsidy!.lastClaimDay);
    });

    suite.test('同日只領一次；凌晨跨 UTC+8 切日後可再領', () => {
        const session = lowSession(100, 50);
        session.claimDailySubsidy(at(9), 9999);
        assert.equals(0, Object.keys(session.claimDailySubsidy(at(23), 9999)).length);
        const next = session.claimDailySubsidy(at(1, 29), 9999);
        assert.equals(400, next.food);
        assert.equals(undefined, next.gold);
    });

    suite.test('資源都不低時不算領取，不寫紀錄', () => {
        const session = lowSession(5000, 5000);
        assert.equals(0, Object.keys(session.claimDailySubsidy(at(9), 9999)).length);
        assert.equals(null, session.dailySubsidy);
    });

    suite.test('補量依軍備上限夾制', () => {
        const session = lowSession(100, 5000);
        (session as unknown as { _military: { foodCap: number } })._military.foodCap = 300;
        const grants = session.claimDailySubsidy(at(9), 9999);
        assert.equals(200, grants.food);
        assert.equals(300, session.military.food);
    });

    suite.test('存讀檔保留上次領取日；壞資料視為從未領取', () => {
        const session = lowSession(100, 5000);
        session.claimDailySubsidy(at(9), 9999);
        const restored = new GameSession(1);
        restored.restoreLifespanState(JSON.parse(JSON.stringify(session.createSnapshot(new Date(0)))) as PlayerSaveSnapshot);
        assert.equals('2026-03-28', restored.dailySubsidy!.lastClaimDay);
        assert.equals(400, restored.dailySubsidy!.foodGranted);
        assert.equals(null, normalizeDailySubsidyRecord({ lastClaimDay: 'x' }));
        assert.equals(0, normalizeDailySubsidyRecord({ lastClaimDay: '2026-03-28', foodGranted: -3 })!.foodGranted);
    });

    suite.test('提示文字依糧草、黃金、城市兵源排序；沒補為空', () => {
        assert.equals('每日補貼：糧草 +400、城市兵源 +200', dailySubsidyText({ troops: 200, food: 400 }));
        assert.equals('', dailySubsidyText({}));
    });

    return suite;
}
