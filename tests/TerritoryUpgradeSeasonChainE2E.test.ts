/**
 * TerritoryUpgradeSeasonChainE2E.test.ts — 太守府升級的多季真實流程（PROG-2-0673）
 * 下單 → 存檔讀回 → 季結生效 → 自動治理補滿新格數 → 連升到 Lv5 → 重開新局歸零。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function roster(n: number): GeneralConfig[] {
    return Array.from({ length: n }, (_, i) => ({ id: `T${i}`, name: `T${i}`, faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 120 } as unknown as GeneralConfig));
}
function food(session: GameSession, v: number): void {
    (session as unknown as { _military: { food: number } })._military.food = v;
}
function roundTrip<T>(v: T): T { return JSON.parse(JSON.stringify(v)) as T; }

export function createTerritoryUpgradeSeasonChainE2ESuite(): TestSuite {
    const suite = new TestSuite('TerritoryUpgradeSeasonChainE2E (PROG-2-0673 太守府升級多季流程)');

    suite.test('下單→存檔讀回→季結生效，讀回的新 session 一樣升級', async () => {
        const a = new GameSession(7);
        a.setRosterStore(new InMemoryRosterStore(roster(8)));
        food(a, 100000);
        assert.isTrue(a.orderTerritoryUpgrade(() => true).ok);
        const snap = roundTrip(a.createSnapshot(new Date(0)));

        const b = new GameSession(7);
        b.setRosterStore(new InMemoryRosterStore(roster(8)));
        b.restoreLifespanState(snap);
        await a.advanceSeason();
        await b.advanceSeason();
        assert.equals(2, a.territoryLevel);
        assert.equals(a.territoryLevel, b.territoryLevel);
        assert.equals(a.maxTaskSlots, b.maxTaskSlots);
    });

    suite.test('自動治理在升級後補滿新格數（Lv1→2 格，Lv2→3 格）', async () => {
        const s = new GameSession(7);
        s.setRosterStore(new InMemoryRosterStore(roster(8)));
        food(s, 100000);
        s.setAutoGovernance(true);
        await s.advanceSeason();
        assert.equals(2, s.governanceAssignments.length);
        s.orderTerritoryUpgrade(() => true);
        await s.advanceSeason();
        await s.advanceSeason();
        assert.equals(3, s.governanceAssignments.length);
    });

    suite.test('連升到 Lv5 後格數 6，再下單被拒絕；重開新局全部歸零', async () => {
        const s = new GameSession(7);
        s.setRosterStore(new InMemoryRosterStore(roster(8)));
        for (let lv = 2; lv <= 5; lv++) {
            food(s, 100000);
            assert.isTrue(s.orderTerritoryUpgrade(() => true).ok);
            await s.advanceSeason();
            assert.equals(lv, s.territoryLevel);
        }
        assert.equals(6, s.maxTaskSlots);
        const over = s.orderTerritoryUpgrade(() => true);
        assert.isFalse(over.ok);
        assert.equals('max-level', over.reason!);

        s.startNewGame(1);
        assert.equals(1, s.territoryLevel);
        assert.equals(2, s.maxTaskSlots);
        assert.isTrue(s.pendingTerritoryLevel === null);
    });

    return suite;
}
