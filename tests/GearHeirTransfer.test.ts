/**
 * GearHeirTransfer.test.ts — 退役武將的一般裝備傳給子嗣（EQP-07，PROG-2-1387）
 *
 * 鎖住：純函式的轉移規則（格位空且解鎖則保留、否則回倉庫、只動一般裝備）；
 * GameSession.retireGeneral 帶 heirChildId 時走同一規則，不帶時行為與原本相同；
 * 存讀檔後裝備仍在子嗣名下。
 * Unity 對照：像 Inventory 的 TransferItem 再配 OnDestroy 收回：轉給的人要有空格位，沒空位就掉回背包。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GEAR_DEFINITIONS } from '../assets/scripts/core/systems/GearDefinitions';
import { transferGearToHeir } from '../assets/scripts/core/systems/GearEquipFlow';
import { deriveGeneralBackpack } from '../assets/scripts/core/systems/GeneralBackpackView';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { sys } from 'cc';

const RETIREE = 'old';
const HEIR = 'kid';

function gear(id: string, slot: string, equippedBy: string | null, slotId: string | null): InventoryRecord {
    const def = GEAR_DEFINITIONS.find((d) => d.slot === slot)!;
    return {
        Inventory_ID: id, Item_Type: 'OTHER', Slot_Type: 'GEAR', Bound_General_UID: null, Quantity: 1, Quality: 'R',
        Source_Type: 'TEST', Display_Bucket: 'GEAR', Is_Displayed: true, Attributes: {}, Gear_ID: def.id,
        equippedBy, slotId,
    } as InventoryRecord;
}

function gen(id: string, age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 900, str: 80, int: 60, lea: 70, pol: 50, cha: 50, luk: 40, ep: 70,
        maxLifespan: 70, vitality: 100, maxVitality: 100, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic', templateId: `${id}-1`,
        ...extra,
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

const byId = (records: readonly InventoryRecord[], id: string) => records.find((r) => r.Inventory_ID === id)!;

export function createGearHeirTransferSuite(): TestSuite {
    const suite = new TestSuite('GearHeirTransfer (退役裝備傳給子嗣 EQP-07)');

    suite.test('純函式：子嗣格位空且解鎖時保留原格', () => {
        const records = [gear('W1', 'WEAPON', RETIREE, 'WEAPON')];
        const next = transferGearToHeir(records, RETIREE, HEIR);
        assert.equals(HEIR, byId(next, 'W1').equippedBy ?? '');
        assert.equals('WEAPON', byId(next, 'W1').slotId ?? '');
    });

    suite.test('純函式：子嗣同格已有裝備時，轉來的那件回倉庫，子嗣原裝備不動', () => {
        const records = [
            gear('W1', 'WEAPON', RETIREE, 'WEAPON'),
            gear('W2', 'WEAPON', HEIR, 'WEAPON'),
        ];
        const next = transferGearToHeir(records, RETIREE, HEIR);
        assert.isTrue(!byId(next, 'W1').equippedBy);
        assert.isTrue(!byId(next, 'W1').slotId);
        assert.equals(HEIR, byId(next, 'W2').equippedBy ?? '');
    });

    suite.test('純函式：只轉退役者的一般裝備，別人的裝備與未裝備的列不受影響', () => {
        const records = [
            gear('W1', 'WEAPON', RETIREE, 'WEAPON'),
            gear('A9', 'ARMOR', 'other', 'ARMOR'),
            gear('W3', 'WEAPON', null, null),
        ];
        const next = transferGearToHeir(records, RETIREE, HEIR);
        assert.equals('other', byId(next, 'A9').equippedBy ?? '');
        assert.isTrue(!byId(next, 'W3').equippedBy);
        assert.equals(HEIR, byId(next, 'W1').equippedBy ?? '');
    });

    suite.test('純函式：沒有任何裝備時回傳內容相同的列', () => {
        const records = [gear('W3', 'WEAPON', null, null)];
        const next = transferGearToHeir(records, RETIREE, HEIR);
        assert.equals(JSON.stringify(records), JSON.stringify(next));
    });

    suite.test('退役帶 heirChildId：裝備轉給子嗣，存讀檔後仍在子嗣名下', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [gen(RETIREE, 66), gen(HEIR, 30, { fatherId: RETIREE })]);
        a.startNewGame(3);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [gear('W1', 'WEAPON', null, null)];
        assert.isTrue(a.equipGear('W1', RETIREE, 'WEAPON').ok);
        await a.retireGeneral(RETIREE, { heirChildId: HEIR });
        assert.equals(HEIR, byId(a.inventoryRecords as InventoryRecord[], 'W1').equippedBy ?? '');
        await a.save();

        const b = build(adapter, []);
        assert.isTrue(await b.load());
        assert.equals('W1', deriveGeneralBackpack(b.inventoryRecords, HEIR).equipped.WEAPON ?? '');
    });

    suite.test('退役不帶 heirChildId：行為與原本相同，裝備回倉庫', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const a = build(new MemoryStorageAdapter(), [gen(RETIREE, 66), gen(HEIR, 30, { fatherId: RETIREE })]);
        a.startNewGame(3);
        (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [gear('W1', 'WEAPON', null, null)];
        assert.isTrue(a.equipGear('W1', RETIREE, 'WEAPON').ok);
        await a.retireGeneral(RETIREE);
        assert.isTrue(!byId(a.inventoryRecords as InventoryRecord[], 'W1').equippedBy);
    });

    suite.test('子嗣不合法（就是退役者本人、不存在、導師卡、非親生子嗣）：拋錯，名冊與裝備都不變', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const cases = [RETIREE, 'nobody', 'mentor', 'stranger'];
        for (const heir of cases) {
            const a = build(new MemoryStorageAdapter(), [gen(RETIREE, 66), gen('mentor', 40, { isMentorCard: true, fatherId: RETIREE }), gen('stranger', 30)]);
            a.startNewGame(3);
            (a as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [gear('W1', 'WEAPON', null, null)];
            assert.isTrue(a.equipGear('W1', RETIREE, 'WEAPON').ok);
            let threw = false;
            try {
                await a.retireGeneral(RETIREE, { heirChildId: heir });
            } catch {
                threw = true;
            }
            assert.isTrue(threw, `子嗣 ${heir} 應被拒絕`);
            assert.equals(RETIREE, byId(a.inventoryRecords as InventoryRecord[], 'W1').equippedBy ?? '');
        }
    });

    return suite;
}
