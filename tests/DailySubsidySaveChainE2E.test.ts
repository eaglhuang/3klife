/**
 * DailySubsidySaveChainE2E.test.ts — 每日補貼跨季、存讀檔後同日不重領（PROG-2-0688）
 *
 * Unity 對照：像 PlayerPrefs 記的「上次領取日」，重開遊戲後同一天不能再領一次，隔天可以。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { sys } from 'cc';

const at = (hour: number, day: number): number => Date.UTC(2026, 2, day, hour - 8);

function build(adapter: MemoryStorageAdapter): GameSession {
    const s = new GameSession(9);
    s.setRosterStore(new InMemoryRosterStore([]));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

export function createDailySubsidySaveChainE2ESuite(): TestSuite {
    const suite = new TestSuite('DailySubsidySaveChainE2E (PROG-2-0688 每日補貼存讀檔鏈)');

    suite.test('領補貼、季結、存檔、讀檔後同日不重領，隔日可再領', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter);
        a.startNewGame(3);
        const mil = (a as unknown as { _military: { food: number; cityTroops: number } })._military;
        mil.food = 100;
        mil.cityTroops = 50;
        assert.equals(400, a.claimDailySubsidy(at(9, 10), 9999).food);
        await a.advanceSeason();
        await a.save();

        const b = build(adapter);
        assert.isTrue(await b.load());
        assert.equals('2026-03-10', b.dailySubsidy!.lastClaimDay);
        const foodAfterLoad = b.military.food;
        // 讀檔後同一天不再領
        assert.equals(0, Object.keys(b.claimDailySubsidy(at(20, 10), 9999)).length);
        assert.equals(foodAfterLoad, b.military.food);
        // 隔天若仍低於門檻可再領
        (b as unknown as { _military: { food: number } })._military.food = 100;
        assert.equals(400, b.claimDailySubsidy(at(9, 11), 9999).food);
        assert.equals('2026-03-11', b.dailySubsidy!.lastClaimDay);
    });

    return suite;
}
