/**
 * WarehouseUsedSlots.test.ts — 倉庫已用格數計入統一物件庫的一般列（BAG-10 / PROG-2-1360）headless 測試
 *
 * 鎖住：一般裝備列（未裝備）占 1 格；已裝在武將身上的列不占倉庫格；虎符列不占一般倉庫格；
 * 存讀檔後格數不變。以基準存檔的格數為起點比較差值，不依賴起始扁平道具的數量。
 *
 * Unity 對照：像 Inventory 的 PlayMode 測試：存檔、重新載入後，背包 UI 讀到的已用格數要和存檔前一致。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, type PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

function gear(id: string, equippedBy: string | null = null): InventoryRecord {
    return {
        Inventory_ID: id,
        Item_Type: 'OTHER',
        Slot_Type: 'GEAR',
        Bound_General_UID: null,
        Quantity: 1,
        Quality: 'N',
        Source_Type: 'TEST',
        Display_Bucket: 'GENERAL',
        Is_Displayed: true,
        Attributes: {},
        Gear_ID: 'GEAR_TEST',
        equippedBy,
        slotId: equippedBy ? 'WEAPON' : null,
    };
}

function tally(id: string): InventoryRecord {
    return {
        Inventory_ID: id,
        Item_Type: 'TALLY',
        Slot_Type: 'TALLY',
        Bound_General_UID: null,
        Quantity: 1,
        Quality: 'N',
        Source_Type: 'TEST',
        Display_Bucket: 'TALLY',
        Is_Displayed: true,
        Attributes: {},
    };
}

function sessionWith(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

/** 把指定的物件庫列寫進存檔（模擬上次存下來的檔），回傳讀回後的倉庫格數。 */
async function loadedUsedSlots(records: InventoryRecord[]): Promise<number> {
    const adapter = new MemoryStorageAdapter();
    const snapshot: PlayerSaveSnapshot = new GameSession(3).createSnapshot(new Date(0));
    snapshot.inventoryRecords = records;
    await new PlayerSaveService(adapter).save(snapshot);
    const restored = sessionWith(adapter);
    assert.isTrue(await restored.load());
    return restored.warehouseUsedSlots;
}

export function createWarehouseUsedSlotsSuite(): TestSuite {
    const suite = new TestSuite('WarehouseUsedSlots (倉庫格數計物件庫一般列 BAG-10)');

    suite.test('未裝備的一般裝備列各占 1 格', async () => {
        const base = await loadedUsedSlots([]);
        assert.equals(base + 2, await loadedUsedSlots([gear('g1'), gear('g2')]));
    });

    suite.test('已裝在武將身上的裝備列不占倉庫格', async () => {
        const base = await loadedUsedSlots([]);
        assert.equals(base, await loadedUsedSlots([gear('g1', 'G001')]));
    });

    suite.test('虎符列不占一般倉庫格', async () => {
        const base = await loadedUsedSlots([]);
        assert.equals(base, await loadedUsedSlots([tally('t1')]));
    });

    suite.test('存讀檔後格數不變：存檔前後一致', async () => {
        const adapter = new MemoryStorageAdapter();
        const snapshot: PlayerSaveSnapshot = new GameSession(3).createSnapshot(new Date(0));
        snapshot.inventoryRecords = [gear('g1'), gear('g2', 'G001'), tally('t1')];
        await new PlayerSaveService(adapter).save(snapshot);

        const first = sessionWith(adapter);
        assert.isTrue(await first.load());
        const before = first.warehouseUsedSlots;
        await first.save();

        const again = sessionWith(adapter);
        assert.isTrue(await again.load());
        assert.equals(before, again.warehouseUsedSlots);
        assert.equals(await loadedUsedSlots([]) + 1, before, '只有 g1 占格');
    });

    return suite;
}
