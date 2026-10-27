/**
 * SpiritSlotLifecycleE2E.test.ts — 命槽英靈卡與武將退役／老死／存讀檔（PROG-2-0690）
 *
 * Unity 對照：角色被刪除時，掛在他命槽的卡要回倉庫，不能變成找不到主人的孤兒。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { SPIRIT_SLOT_ID, spiritSlotViewOf } from '../assets/scripts/core/systems/SpiritSlotState';
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

function spirit(id: string, owner: string | null, primary = false): InventoryRecord {
    return {
        Inventory_ID: id, Item_Type: 'SPIRIT_CARD', Slot_Type: 'SPIRIT', Bound_General_UID: null, Quantity: 1, Quality: 'R',
        Source_Type: 'TEST', Display_Bucket: 'SPIRIT', Is_Displayed: true, Attributes: {},
        equippedBy: owner, slotId: owner ? SPIRIT_SLOT_ID : null, isPrimary: owner ? primary : null,
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

export function createSpiritSlotLifecycleE2ESuite(): TestSuite {
    const suite = new TestSuite('SpiritSlotLifecycleE2E (PROG-2-0690 命槽與武將生命週期)');

    suite.test('卸下、設主卡經季結與存讀檔後保持', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [gen('zhao', 28)]);
        a.startNewGame(3);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [spirit('S1', 'zhao')];
        assert.isTrue(a.setPrimarySpiritCard('zhao', false).ok);
        await a.advanceSeason();
        await a.save();
        const b = build(adapter, []);
        assert.isTrue(await b.load());
        assert.isTrue(spiritSlotViewOf(b.inventoryRecords, 'zhao', false).state.isMain);
        assert.isTrue(b.unequipSpiritCard('zhao', false).ok);
        assert.isFalse(spiritSlotViewOf(b.inventoryRecords, 'zhao', false).state.occupied);
    });

    suite.test('退役武將的命槽英靈卡回到倉庫，其他武將的不受影響', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const a = build(new MemoryStorageAdapter(), [gen('cao', 66), gen('zhao', 28)]);
        a.startNewGame(3);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [spirit('S1', 'cao', true), spirit('S2', 'zhao')];
        await a.retireGeneral('cao');
        const s1 = a.inventoryRecords.find((r) => r.Inventory_ID === 'S1')!;
        assert.isTrue(!s1.equippedBy, `退役後英靈卡不應仍屬於 ${s1.equippedBy}`);
        assert.isTrue(!s1.isPrimary, '主卡標記應清除');
        assert.equals('zhao', a.inventoryRecords.find((r) => r.Inventory_ID === 'S2')!.equippedBy ?? '');
    });

    suite.test('老死武將的命槽英靈卡回到倉庫', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const a = build(new MemoryStorageAdapter(), [gen('liu', 69.75), gen('zhao', 28)]);
        a.startNewGame(3);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [spirit('S1', 'liu')];
        for (let i = 0; i < 4; i++) await a.advanceSeason();
        assert.isTrue(!a.inventoryRecords.find((r) => r.Inventory_ID === 'S1')!.equippedBy, '老死者的英靈卡回倉庫');
    });

    return suite;
}
