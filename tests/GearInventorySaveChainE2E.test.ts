/**
 * GearInventorySaveChainE2E.test.ts — 統一物件庫裝備與寶頁格位的存讀檔多季複查（PROG-2-0675）
 *
 * Unity 對照：像背包總表存進 PlayerPrefs，重開後角色的裝備欄（依 OwnerID 篩出的 View）仍然亮著對的格子。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { deriveGeneralBackpack } from '../assets/scripts/core/systems/GeneralBackpackView';
import { buildGearPageSlots } from '../assets/scripts/core/systems/GearPageSlots';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function gear(id: string, slotId: string | null, equippedBy: string | null): InventoryRecord {
    return {
        Inventory_ID: id, Item_Type: 'OTHER', Slot_Type: 'GEAR', Bound_General_UID: null, Quantity: 1, Quality: 'R',
        Source_Type: 'TEST', Display_Bucket: 'GEAR', Is_Displayed: true, Attributes: {}, equippedBy, slotId,
    } as InventoryRecord;
}

function build(adapter: MemoryStorageAdapter): GameSession {
    const s = new GameSession(4);
    s.setRosterStore(new InMemoryRosterStore([{ id: 'G1', name: 'G1', faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 120 } as unknown as GeneralConfig]));
    s.setSaveService(new PlayerSaveService(adapter));
    return s;
}

export function createGearInventorySaveChainE2ESuite(): TestSuite {
    const suite = new TestSuite('GearInventorySaveChainE2E (PROG-2-0675 裝備物件庫存讀檔)');

    suite.test('裝備列經季結與存讀檔後，寶頁格位仍亮在對的槽；未裝備列不影響', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [
            gear('W1', 'WEAPON', 'G1'), gear('A1', 'ARMOR', 'G2'), gear('S1', null, null),
        ];
        await a.advanceSeason();
        await a.advanceSeason();
        await a.save();

        const b = build(adapter);
        assert.isTrue(await b.load());
        const slots = buildGearPageSlots(deriveGeneralBackpack(b.inventoryRecords, 'G1'));
        const weapon = slots.find((s) => s.slot === 'WEAPON')!;
        const armor = slots.find((s) => s.slot === 'ARMOR')!;
        assert.equals('EQUIPPED', weapon.state);
        assert.equals('W1', weapon.equippedUid!);
        assert.isFalse(armor.state === 'EQUIPPED');
        assert.equals(3, b.inventoryRecords.length);
    });

    return suite;
}
