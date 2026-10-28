/**
 * GearHeirRealBreedingE2E.test.ts — 退役裝備傳給真實結緣子嗣（QA，PROG-2-1461）
 * #1307 的血緣驗證看 fatherId／motherId；這裡用真實 BreedingService 產生的子嗣驗證欄位確實寫入，
 * 退役父親時裝備轉給子嗣、配偶與外人被拒、存讀檔後裝備仍在子嗣名下。
 */
import { assert, TestSuite } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GEAR_DEFINITIONS } from '../assets/scripts/core/systems/GearDefinitions';
import { deriveGeneralBackpack } from '../assets/scripts/core/systems/GeneralBackpackView';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { DEFAULT_SEASON_MODIFIERS, setActiveSeasonModifiers } from '../assets/scripts/core/systems/SeasonModifiers';
import { buildWorld, person, type World } from './MvpMainFlowE2E.test';

function weapon(id: string): InventoryRecord {
    const def = GEAR_DEFINITIONS.find((d) => d.slot === 'WEAPON')!;
    return {
        Inventory_ID: id, Item_Type: 'OTHER', Slot_Type: 'GEAR', Bound_General_UID: null, Quantity: 1, Quality: 'R',
        Source_Type: 'TEST', Display_Bucket: 'GEAR', Is_Displayed: true, Attributes: {}, Gear_ID: def.id,
        equippedBy: null, slotId: null,
    } as InventoryRecord;
}

function find(w: World, id: string): GeneralConfig | undefined {
    return w.store.getAll().find((g) => g.id === id);
}

async function reopen(w: World, adapter: MemoryStorageAdapter): Promise<World> {
    await w.session.save();
    const next = buildWorld(adapter, []);
    assert.isTrue(await next.session.load(), '讀檔成功');
    next.breeding.syncGraphFromRoster();
    return next;
}

function recordOf(w: World, id: string): InventoryRecord {
    return (w.session.inventoryRecords as InventoryRecord[]).find((r) => r.Inventory_ID === id)!;
}

export function createGearHeirRealBreedingE2ESuite(): TestSuite {
    const suite = new TestSuite('GearHeirRealBreedingE2E (退役裝備傳給真實結緣子嗣 PROG-2-1461)');

    suite.test('真實子嗣帶 fatherId：父親退役裝備轉給子嗣；配偶、外人被拒；存讀檔後仍在子嗣名下', async () => {
        setActiveSeasonModifiers(DEFAULT_SEASON_MODIFIERS);
        const adapter = new MemoryStorageAdapter();
        let w = buildWorld(adapter, [person('hero', '男', 64), person('lady', '女', 28), person('stranger', '男', 30)]);
        w.session.startNewGame(61);

        const bred = w.breeding.breed('hero', 'lady');
        assert.equals('conceived', bred.outcome);
        const childId = bred.child!.id;
        const child = find(w, childId) as GeneralConfig & { fatherId?: string; motherId?: string };
        assert.equals('hero', child.fatherId ?? '', '真實子嗣的 fatherId 指向父親');
        assert.equals('lady', child.motherId ?? '', '真實子嗣的 motherId 指向母親');

        (w.session as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = [weapon('W1')];
        assert.isTrue(w.session.equipGear('W1', 'hero', 'WEAPON').ok, '父親先穿上武器');

        // 父親滿 65 歲
        let guard = 0;
        while (((find(w, 'hero') as GeneralConfig).age ?? 0) < 65 && guard++ < 20) await w.session.advanceSeason();
        assert.isTrue(((find(w, 'hero') as GeneralConfig).age ?? 0) >= 65, '父親年滿 65');

        // 配偶與外人不能當接收者，被拒時裝備與名冊都不變
        for (const bad of ['lady', 'stranger']) {
            let threw = false;
            try { await w.session.retireGeneral('hero', { heirChildId: bad }); } catch { threw = true; }
            assert.isTrue(threw, `${bad} 應被拒`);
            assert.equals('hero', recordOf(w, 'W1').equippedBy ?? '', `${bad} 被拒後裝備仍在父親`);
        }

        // 存讀檔後（欄位要跟著存檔），子嗣仍符合資格，裝備轉移成功
        w = await reopen(w, adapter);
        await w.session.retireGeneral('hero', { heirChildId: childId });
        assert.equals(childId, recordOf(w, 'W1').equippedBy ?? '', '裝備轉給子嗣');
        w = await reopen(w, adapter);
        assert.equals('W1', deriveGeneralBackpack(w.session.inventoryRecords, childId).equipped.WEAPON ?? '', '存讀檔後子嗣背包仍有武器');
        assert.equals(1, (await w.legacy.getMentorCards()).length, '教官卡已產生');
    });

    return suite;
}
