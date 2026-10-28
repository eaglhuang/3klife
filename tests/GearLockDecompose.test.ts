/**
 * GearLockDecompose.test.ts — 物品鎖定與一般裝備分解回收（BAG-07，PROG-2-1390）
 *
 * 鎖住：鎖定只改旗標不影響穿戴；分解只收一般裝備、未鎖定、未裝備者，成功則移除列並給竹簡；
 * 鎖定旗標存讀檔後保留。
 * Unity 對照：像 Inventory 的 Lock 旗標搭配 Salvage 命令：上鎖的物件會被擋下，分解成功後從表移除並發放材料。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GEAR_DEFINITIONS } from '../assets/scripts/core/systems/GearDefinitions';
import { decomposeGearRecord, setRecordLocked, DECOMPOSE_MATERIAL_AMOUNT } from '../assets/scripts/core/systems/GearLockDecompose';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import { ITEM_BAMBOO_SLIP, itemCount, STARTER_INVENTORY } from '../assets/scripts/core/systems/PlayerInventory';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { sys } from 'cc';

const GENERAL = 'zhao';

function gear(id: string, slot: string, equippedBy: string | null = null, slotId: string | null = null): InventoryRecord {
    const def = GEAR_DEFINITIONS.find((d) => d.slot === slot)!;
    return {
        Inventory_ID: id, Item_Type: 'OTHER', Slot_Type: 'GEAR', Bound_General_UID: null, Quantity: 1, Quality: 'R',
        Source_Type: 'TEST', Display_Bucket: 'GEAR', Is_Displayed: true, Attributes: {}, Gear_ID: def.id,
        equippedBy, slotId,
    } as InventoryRecord;
}

function nonGear(id: string): InventoryRecord {
    return {
        Inventory_ID: id, Item_Type: 'SPIRIT_CARD', Slot_Type: 'SPIRIT', Bound_General_UID: null, Quantity: 1, Quality: 'R',
        Source_Type: 'TEST', Display_Bucket: 'SPIRIT', Is_Displayed: true, Attributes: {},
    } as InventoryRecord;
}

function gen(id: string, age: number): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 900, str: 80, int: 60, lea: 70, pol: 50, cha: 50, luk: 40, ep: 70,
        maxLifespan: 70, vitality: 100, maxVitality: 100, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic', templateId: `${id}-1`,
    } as unknown as GeneralConfig;
}

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const s = new GameSession(5);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

const byId = (records: readonly InventoryRecord[], id: string) => records.find((r) => r.Inventory_ID === id);

export function createGearLockDecomposeSuite(): TestSuite {
    const suite = new TestSuite('GearLockDecompose (物品鎖定與分解回收 BAG-07)');

    suite.test('純函式：鎖定與解鎖只改該列旗標，不動穿戴欄位，也不改輸入', () => {
        const records = [gear('W1', 'WEAPON', GENERAL, 'WEAPON')];
        const locked = setRecordLocked(records, 'W1', true);
        assert.isTrue(locked.ok);
        if (!locked.ok) return;
        assert.isTrue(byId(locked.records, 'W1')!.isLocked === true);
        assert.equals(GENERAL, byId(locked.records, 'W1')!.equippedBy ?? '');
        assert.isTrue(!records[0].isLocked, '輸入列不應被改動');
        const unlocked = setRecordLocked(locked.records, 'W1', false);
        assert.isTrue(unlocked.ok && byId(unlocked.records, 'W1')!.isLocked === false);
    });

    suite.test('純函式：鎖定不存在的列回傳 NOT_FOUND', () => {
        const result = setRecordLocked([gear('W1', 'WEAPON')], 'nope', true);
        assert.isFalse(result.ok);
    });

    suite.test('純函式：未鎖定、未裝備的一般裝備可分解，移除該列並給 1 件竹簡', () => {
        const records = [gear('W1', 'WEAPON'), gear('A1', 'ARMOR')];
        const result = decomposeGearRecord(records, STARTER_INVENTORY, 'W1');
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.isTrue(!byId(result.records, 'W1'), '分解後列應被移除');
        assert.isTrue(!!byId(result.records, 'A1'), '其他列保留');
        assert.equals(ITEM_BAMBOO_SLIP, result.material.itemId);
        assert.equals(DECOMPOSE_MATERIAL_AMOUNT, result.material.amount);
        assert.equals(itemCount(STARTER_INVENTORY, ITEM_BAMBOO_SLIP) + DECOMPOSE_MATERIAL_AMOUNT, itemCount(result.inventory, ITEM_BAMBOO_SLIP));
    });

    suite.test('純函式：鎖定、裝備中、非一般裝備、找不到，都拒絕且不發材料', () => {
        const records = [
            gear('LOCK', 'WEAPON'),
            gear('EQ', 'ARMOR', GENERAL, 'ARMOR'),
            nonGear('CARD'),
        ];
        const lockedRecords = setRecordLocked(records, 'LOCK', true);
        assert.isTrue(lockedRecords.ok);
        if (!lockedRecords.ok) return;
        const reasons = [
            decomposeGearRecord(lockedRecords.records, STARTER_INVENTORY, 'LOCK'),
            decomposeGearRecord(lockedRecords.records, STARTER_INVENTORY, 'EQ'),
            decomposeGearRecord(lockedRecords.records, STARTER_INVENTORY, 'CARD'),
            decomposeGearRecord(lockedRecords.records, STARTER_INVENTORY, 'missing'),
        ].map((r) => (r.ok ? 'OK' : r.reason));
        assert.equals('LOCKED', reasons[0]);
        assert.equals('EQUIPPED', reasons[1]);
        assert.equals('NOT_GEAR', reasons[2]);
        assert.equals('NOT_FOUND', reasons[3]);
    });

    suite.test('GameSession：鎖定後分解被擋，解鎖後才能分解，成功時發竹簡', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const a = build(new MemoryStorageAdapter(), [gen(GENERAL, 28)]);
        a.startNewGame(3);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [gear('W1', 'WEAPON')];
        const before = itemCount(a.inventory, ITEM_BAMBOO_SLIP);

        assert.isTrue(a.setInventoryLocked('W1', true));
        assert.isFalse(a.decomposeGear('W1').ok);
        assert.isTrue(!!byId(a.inventoryRecords as InventoryRecord[], 'W1'));

        assert.isTrue(a.setInventoryLocked('W1', false));
        assert.isTrue(a.decomposeGear('W1').ok);
        assert.isTrue(!byId(a.inventoryRecords as InventoryRecord[], 'W1'));
        assert.equals(before + DECOMPOSE_MATERIAL_AMOUNT, itemCount(a.inventory, ITEM_BAMBOO_SLIP));
    });

    suite.test('GameSession：鎖定旗標存讀檔後保留，鎖定中的裝備分解仍被擋', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [gen(GENERAL, 28)]);
        a.startNewGame(3);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [gear('W1', 'WEAPON')];
        assert.isTrue(a.setInventoryLocked('W1', true));
        await a.save();

        const b = build(adapter, []);
        assert.isTrue(await b.load());
        assert.isTrue(byId(b.inventoryRecords as InventoryRecord[], 'W1')!.isLocked === true);
        assert.isFalse(b.decomposeGear('W1').ok);
    });

    return suite;
}
