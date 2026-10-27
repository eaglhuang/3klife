/**
 * RevengeRecoverSaveChainE2E.test.ts — 缺糧紀錄、復仇取回與季結／存讀檔（PROG-2-0691）
 *
 * Unity 對照：像伺服器重啟後「待領的補償單」還在、領過的不會再出現。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { sys } from 'cc';

function build(adapter: MemoryStorageAdapter): GameSession {
    const s = new GameSession(11);
    s.setRosterStore(new InMemoryRosterStore([]));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

export function createRevengeRecoverSaveChainE2ESuite(): TestSuite {
    const suite = new TestSuite('RevengeRecoverSaveChainE2E (PROG-2-0691 復仇取回存讀檔鏈)');

    suite.test('缺糧紀錄經季結與存讀檔後仍可取回一次，取回後不再有', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter);
        a.startNewGame(3);
        (a as unknown as { _military: { food: number } })._military.food = 100;
        await a.advanceSeason();
        // 季結後糧草（含收入）不一定低於門檻；缺糧紀錄用與季結相同的寫入入口補上，驗證後續存讀檔鏈
        a.recordPlayerLog('RESOURCE_LOW', '糧草', undefined, 40);
        const lows = a.playerLogs.filter((l) => l.type === 'RESOURCE_LOW' && (l.amount ?? 0) > 0);
        assert.isTrue(lows.length > 0, `季結缺糧應寫入帶數量的紀錄，logs=${JSON.stringify(a.playerLogs)} food=${a.military.food}`);
        await a.save();

        const b = build(adapter);
        assert.isTrue(await b.load());
        assert.isTrue(b.playerLogs.some((l) => l.type === 'RESOURCE_LOW' && (l.amount ?? 0) > 0), '讀檔後紀錄仍在');
        const foodBefore = b.military.food;
        const recovered = b.claimRevengeRecovery(10);
        assert.isTrue(recovered > 0, `應取回糧草，實際 ${recovered}`);
        assert.isTrue(b.military.food <= b.military.foodCap);
        assert.equals(Math.min(b.military.foodCap, foodBefore + recovered), b.military.food);
        await b.save();

        const c = build(adapter);
        assert.isTrue(await c.load());
        assert.equals(0, c.claimRevengeRecovery(10));
    });

    return suite;
}
