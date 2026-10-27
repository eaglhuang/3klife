/**
 * GearEquipLifecycleE2E.test.ts — 一般裝備穿戴與武將退役／老死／存讀檔的多季複查（PROG-2-0681）
 *
 * Unity 對照：像角色被刪除時，背包總表裡掛在他名下（OwnerID）的裝備要自動回倉庫，不能變成找不到主人的孤兒。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GEAR_DEFINITIONS } from '../assets/scripts/core/systems/GearDefinitions';
import { deriveGeneralBackpack } from '../assets/scripts/core/systems/GeneralBackpackView';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { sys } from 'cc';

function gen(id: string, age: number): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 900, str: 80, int: 60, lea: 70, pol: 50, cha: 50, luk: 40, ep: 70,
        maxLifespan: 70, vitality: 100, maxVitality: 100, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic', templateId: `${id}-1`,
    } as unknown as GeneralConfig;
}

function gear(id: string, slot: string): InventoryRecord {
    const def = GEAR_DEFINITIONS.find((d) => d.slot === slot)!;
    return {
        Inventory_ID: id, Item_Type: 'OTHER', Slot_Type: 'GEAR', Bound_General_UID: null, Quantity: 1, Quality: 'R',
        Source_Type: 'TEST', Display_Bucket: 'GEAR', Is_Displayed: true, Attributes: {}, Gear_ID: def.id,
    } as InventoryRecord;
}

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const s = new GameSession(5);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

export function createGearEquipLifecycleE2ESuite(): TestSuite {
    const suite = new TestSuite('GearEquipLifecycleE2E (PROG-2-0681 裝備與武將生命週期)');

    suite.test('穿戴後經季結與存讀檔，裝備仍在原武將身上', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [gen('zhao', 28)]);
        a.startNewGame(3);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [gear('W1', 'WEAPON'), gear('A1', 'ARMOR')];
        assert.isTrue(a.equipGear('W1', 'zhao', 'WEAPON').ok);
        await a.advanceSeason();
        await a.save();

        const b = build(adapter, []);
        assert.isTrue(await b.load());
        assert.equals('W1', deriveGeneralBackpack(b.inventoryRecords, 'zhao').equipped.WEAPON ?? '');
        assert.isTrue(b.equipGear('A1', 'zhao', 'ARMOR').ok);
    });

    suite.test('退役的武將身上的裝備回到倉庫，不留在已離開的武將名下', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const a = build(new MemoryStorageAdapter(), [gen('cao', 66), gen('zhao', 28)]);
        a.startNewGame(3);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [gear('W1', 'WEAPON')];
        assert.isTrue(a.equipGear('W1', 'cao', 'WEAPON').ok);
        await a.retireGeneral('cao');
        const cao = a.roster.find((g) => g.id === 'cao');
        assert.isTrue(cao === undefined || (cao as { status?: string }).status !== 'active', `曹操已退役，狀態 ${(cao as { status?: string } | undefined)?.status}`);
        const record = a.inventoryRecords.find((r) => r.Inventory_ID === 'W1')!;
        assert.isTrue(!record.equippedBy, `退役後裝備不應仍屬於 ${record.equippedBy}`);
        // 倉庫中的裝備可被其他武將穿戴
        assert.isTrue(a.equipGear('W1', 'zhao', 'WEAPON').ok);
    });

    suite.test('老死的武將身上的裝備回到倉庫，其他武將的裝備不受影響', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const a = build(new MemoryStorageAdapter(), [gen('liu', 69.75), gen('zhao', 28)]);
        a.startNewGame(3);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [gear('W1', 'WEAPON'), gear('A1', 'ARMOR')];
        assert.isTrue(a.equipGear('W1', 'liu', 'WEAPON').ok);
        assert.isTrue(a.equipGear('A1', 'zhao', 'ARMOR').ok);
        for (let i = 0; i < 4; i++) await a.advanceSeason();
        assert.isTrue(a.roster.find((g) => g.id === 'liu')?.status === 'dead' || !a.roster.some((g) => g.id === 'liu'), '劉備已老死');
        assert.isTrue(!a.inventoryRecords.find((r) => r.Inventory_ID === 'W1')!.equippedBy, '老死者的裝備回倉庫');
        assert.equals('zhao', a.inventoryRecords.find((r) => r.Inventory_ID === 'A1')!.equippedBy ?? '');
    });

    return suite;
}
