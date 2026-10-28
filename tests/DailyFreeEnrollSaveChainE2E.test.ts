/**
 * DailyFreeEnrollSaveChainE2E.test.ts — 每日免費入學令跨日、存讀檔後同日不重發（PROG-2-0694）
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

    suite.test('登入發令、存檔、讀檔後同日重登不重發，隔日再發；回撥時鐘不重發', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter);
        a.startNewGame(3);
        const base = a.itemCount(ITEM_ADMISSION_TOKEN);
        a.recordLoginAt(at(9, 10));
        const gain = a.itemCount(ITEM_ADMISSION_TOKEN) - base;
        assert.isTrue(gain >= 1, '當日首登發令');
        await a.save();

        const b = build(adapter);
        assert.isTrue(await b.load());
        const afterLoad = b.itemCount(ITEM_ADMISSION_TOKEN);
        assert.equals(base + gain, afterLoad, '讀檔後數量一致');
        b.recordLoginAt(at(20, 10));
        assert.equals(afterLoad, b.itemCount(ITEM_ADMISSION_TOKEN), '讀檔後同日不重發');
        b.recordLoginAt(at(9, 11));
        assert.equals(afterLoad + gain, b.itemCount(ITEM_ADMISSION_TOKEN), '隔日再發');
        const afterDay2 = b.itemCount(ITEM_ADMISSION_TOKEN);
        // 回撥到前一天再回到當天：每次切日都會被視為新的一天
        b.recordLoginAt(at(9, 10));
        b.recordLoginAt(at(9, 11));
        assert.equals(afterDay2, b.itemCount(ITEM_ADMISSION_TOKEN), '時鐘回撥再回來不應重複領');
    });

    return suite;
}
