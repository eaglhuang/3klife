/**
 * DailyFreeEnrollSaveChainE2E.test.ts — 登入不再發入學令，存讀檔與跨日數量不變（PROG-2-0694；PROG-2-9206 改寫）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { ITEM_ADMISSION_TOKEN } from '../assets/scripts/core/systems/PlayerInventory';
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

export function createDailyFreeEnrollSaveChainE2ESuite(): TestSuite {
    const suite = new TestSuite('DailyFreeEnrollSaveChainE2E (PROG-2-0694)');

    suite.test('登入不發令；存檔、讀檔後數量不變，隔日登入與回撥時鐘都不增加（PROG-2-9206 退場）', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter);
        a.startNewGame(3);
        const base = a.itemCount(ITEM_ADMISSION_TOKEN);
        a.recordLoginAt(at(9, 10));
        assert.equals(base, a.itemCount(ITEM_ADMISSION_TOKEN), '當日首登不發令');
        await a.save();

        const b = build(adapter);
        assert.isTrue(await b.load());
        assert.equals(base, b.itemCount(ITEM_ADMISSION_TOKEN), '讀檔後數量一致');
        b.recordLoginAt(at(20, 10));
        b.recordLoginAt(at(9, 11));
        b.recordLoginAt(at(9, 10));
        b.recordLoginAt(at(9, 11));
        assert.equals(base, b.itemCount(ITEM_ADMISSION_TOKEN), '隔日與回撥再回來都不發');
    });

    return suite;
}
