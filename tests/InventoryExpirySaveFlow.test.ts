/**
 * InventoryExpirySaveFlow.test.ts — 限時道具（物件庫列 expiresAt）存讀檔與登入切日回收（PROG-2-1364）headless 測試
 *
 * 鎖住：舊檔列沒有 expiresAt 讀回後仍是永久；限時列跨存讀檔保留到期時刻；
 * 格式不合的 expiresAt 讀回時丟棄欄位、列本身保留；登入切日回收過期列並寫進 lastExpiredInventory；
 * 回收後再存檔，過期列不會再出現。
 *
 * Unity 對照：像 PlayMode 測試：寫入一個存檔、重新載入場景，再觸發每日事件，確認道具數量與到期狀態都對。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, type PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

const NOW = Date.UTC(2026, 9, 27, 4, 0);
const DAY = 24 * 60 * 60 * 1000;

function row(id: string, expiresAt?: unknown): InventoryRecord {
    const base = {
        Inventory_ID: id,
        Item_Type: 'OTHER',
        Slot_Type: 'CONSUMABLE',
        Bound_General_UID: null,
        Quantity: 1,
        Quality: 'N',
        Source_Type: 'TEST',
        Display_Bucket: 'GENERAL',
        Is_Displayed: true,
        Attributes: {},
    };
    return (expiresAt === undefined ? base : { ...base, expiresAt }) as InventoryRecord;
}

function sessionWith(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

/** 先建一個新局的快照，塞入指定的物件庫列後直接寫進存檔，模擬「上次存下來的檔」。 */
async function seedSave(adapter: MemoryStorageAdapter, records: InventoryRecord[]): Promise<void> {
    const snapshot: PlayerSaveSnapshot = new GameSession(3).createSnapshot(new Date(0));
    snapshot.inventoryRecords = records;
    await new PlayerSaveService(adapter).save(snapshot);
}

export function createInventoryExpirySaveFlowSuite(): TestSuite {
    const suite = new TestSuite('InventoryExpirySaveFlow (限時道具存讀檔與登入回收 PROG-2-1364)');

    suite.test('舊檔列沒有 expiresAt：讀回後仍是永久，登入切日也不回收', async () => {
        const adapter = new MemoryStorageAdapter();
        await seedSave(adapter, [row('legacy')]);
        const restored = sessionWith(adapter);
        assert.isTrue(await restored.load());
        assert.equals(1, restored.inventoryRecords.length);
        assert.isTrue(restored.inventoryRecords[0].expiresAt === undefined);
        restored.recordLoginAt(NOW + 3650 * DAY);
        assert.equals(1, restored.inventoryRecords.length);
        assert.equals(0, restored.lastExpiredInventory.length);
    });

    suite.test('限時列跨存讀檔保留到期時刻', async () => {
        const adapter = new MemoryStorageAdapter();
        await seedSave(adapter, [row('timed', NOW + DAY)]);
        const restored = sessionWith(adapter);
        assert.isTrue(await restored.load());
        assert.equals(NOW + DAY, restored.inventoryRecords[0].expiresAt);

        await restored.save();
        const again = sessionWith(adapter);
        assert.isTrue(await again.load());
        assert.equals(NOW + DAY, again.inventoryRecords[0].expiresAt);
    });

    suite.test('格式不合的 expiresAt 讀回時丟棄欄位、列保留，視為永久', async () => {
        const adapter = new MemoryStorageAdapter();
        await seedSave(adapter, [row('bad', 'soon'), row('nan', Number.NaN)]);
        const restored = sessionWith(adapter);
        assert.isTrue(await restored.load());
        assert.equals(2, restored.inventoryRecords.length);
        assert.isTrue(restored.inventoryRecords.every((r) => r.expiresAt === undefined));
        restored.recordLoginAt(NOW + 3650 * DAY);
        assert.equals(2, restored.inventoryRecords.length);
    });

    suite.test('登入切日回收過期列，寫進 lastExpiredInventory；未到期與永久列保留', async () => {
        const adapter = new MemoryStorageAdapter();
        await seedSave(adapter, [row('forever'), row('expired', NOW - 1), row('later', NOW + DAY)]);
        const restored = sessionWith(adapter);
        assert.isTrue(await restored.load());

        restored.recordLoginAt(NOW);
        assert.equals('expired', restored.lastExpiredInventory[0].Inventory_ID);
        assert.equals(1, restored.lastExpiredInventory.length);
        assert.equals('forever,later', restored.inventoryRecords.map((r) => r.Inventory_ID).join(','));
    });

    suite.test('回收後存檔，過期列不會在下次讀檔時回來；同日再次登入不影響結果', async () => {
        const adapter = new MemoryStorageAdapter();
        await seedSave(adapter, [row('forever'), row('expired', NOW - 1)]);
        const restored = sessionWith(adapter);
        assert.isTrue(await restored.load());
        restored.recordLoginAt(NOW);
        await restored.save();

        const again = sessionWith(adapter);
        assert.isTrue(await again.load());
        assert.equals('forever', again.inventoryRecords.map((r) => r.Inventory_ID).join(','));
        again.recordLoginAt(NOW + 1000);
        assert.equals(0, again.lastExpiredInventory.length, '同日沒有新過期列');
    });

    return suite;
}
