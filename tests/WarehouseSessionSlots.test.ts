/**
 * WarehouseSessionSlots.test.ts — 主城倉庫的已用格數與擴容次數（PROG-2-1103）
 *
 * Unity 對照：EditMode 測試，驗 GameSession 對倉庫容量的讀寫與存檔往返。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore, WAREHOUSE_EXPANSION_ITEM } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { warehouseCapacity } from '../assets/scripts/core/systems/WarehouseCapacity';

async function freshSession(storage = new MemoryStorageAdapter()): Promise<GameSession> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(storage));
    await session.load();
    return session;
}

export function createWarehouseSessionSlotsSuite(): TestSuite {
    const suite = new TestSuite('WarehouseSessionSlots (主城倉庫容量 PROG-2-1103)');

    suite.test('新帳號沒有擴容：容量 50', async () => {
        const session = await freshSession();
        assert.equals(0, session.warehouseExpansions);
        assert.equals(50, warehouseCapacity(session.warehouseExpansions));
    });

    suite.test('已用格數 = 持有道具種類數，不含擴容標記', async () => {
        const session = await freshSession();
        const before = session.warehouseUsedSlots;
        await session.addItem('test.item.a', 3);
        await session.addItem(WAREHOUSE_EXPANSION_ITEM, 1);
        assert.equals(before + 1, session.warehouseUsedSlots);
        assert.equals(1, session.warehouseExpansions);
    });

    suite.test('擴容次數寫入存檔，重新載入後仍在', async () => {
        const storage = new MemoryStorageAdapter();
        const session = await freshSession(storage);
        await session.addItem(WAREHOUSE_EXPANSION_ITEM, 2);
        await session.save();
        const reloaded = await freshSession(storage);
        assert.equals(2, reloaded.warehouseExpansions);
        assert.equals(90, warehouseCapacity(reloaded.warehouseExpansions));
    });

    return suite;
}
