/**
 * GearPickManage.test.ts — 寶頁選取面板的管理模式：鎖定與分解（BAG-07，PROG-2-1392）
 *
 * 鎖住：管理模式關閉時點列仍是穿戴；開啟後點列只選取；鎖定切換與分解的提示與按鈕可用狀態；
 * 沒選取時不動作。
 * Unity 對照：Picker 的「編輯模式」：平常點格子就裝備，編輯模式下點格子只是選中，再按 Lock 或 Salvage。
 */
import { assert, TestSuite } from './TestRunner';
import { GearSlotPickController, GearSlotPickDeps } from '../assets/scripts/ui/core/GearSlotPickController';
import { GEAR_DEFINITIONS } from '../assets/scripts/core/systems/GearDefinitions';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import type { GearDecomposeResult } from '../assets/scripts/core/systems/GearLockDecompose';
import type { GearEquipResult } from '../assets/scripts/core/systems/GearEquipFlow';

const GENERAL = 'zhao';

function weapon(id: string, extra: Partial<InventoryRecord> = {}): InventoryRecord {
    const def = GEAR_DEFINITIONS.find((d) => d.slot === 'WEAPON')!;
    return {
        Inventory_ID: id, Item_Type: 'OTHER', Slot_Type: 'GEAR', Bound_General_UID: null, Quantity: 1, Quality: 'R',
        Source_Type: 'TEST', Display_Bucket: 'GEAR', Is_Displayed: true, Attributes: {}, Gear_ID: def.id,
        equippedBy: null, slotId: null, ...extra,
    } as InventoryRecord;
}

function harness(records: InventoryRecord[], decomposeResult?: GearDecomposeResult) {
    const calls = { equip: [] as string[], locked: [] as { id: string; locked: boolean }[], decompose: [] as string[] };
    let current = records.slice();
    const deps: GearSlotPickDeps = {
        records: () => current,
        generalUid: () => GENERAL,
        equip: (gearUid): GearEquipResult => {
            calls.equip.push(gearUid);
            return { ok: true, records: current } as GearEquipResult;
        },
        unequip: () => ({ ok: true, records: current } as GearEquipResult),
        setLocked: (gearUid, locked) => {
            calls.locked.push({ id: gearUid, locked });
            current = current.map((r) => (r.Inventory_ID === gearUid ? { ...r, isLocked: locked } : r));
            return true;
        },
        decompose: (gearUid) => {
            calls.decompose.push(gearUid);
            return decomposeResult ?? { ok: true, records: [], inventory: {}, material: { itemId: 'ITEM_BAMBOO_SLIP', amount: 1 } };
        },
    };
    const controller = new GearSlotPickController(deps);
    controller.open('WEAPON');
    return { controller, calls };
}

export function createGearPickManageSuite(): TestSuite {
    const suite = new TestSuite('GearPickManage (寶頁選取面板管理模式 BAG-07)');

    suite.test('管理模式關閉時點列仍是穿戴，不會選取', () => {
        const { controller, calls } = harness([weapon('W1')]);
        controller.choose(0);
        assert.equals(1, calls.equip.length);
        assert.isTrue(controller.selectedRow() === null);
    });

    suite.test('管理模式開啟後點列只選取，不穿戴，鎖定與分解按鈕可用', () => {
        const { controller, calls } = harness([weapon('W1')]);
        controller.toggleManage();
        controller.choose(0);
        assert.equals(0, calls.equip.length);
        assert.equals('W1', controller.selectedRow()?.gearUid ?? '');
        const view = controller.getFlowView();
        assert.isTrue(view.actives.btnGearLock);
        assert.isTrue(view.actives.btnGearDecompose);
        assert.equals('管理：開', view.texts.gearManageLabel);
    });

    suite.test('沒選取時鎖定與分解不動作，並提示先選擇', () => {
        const { controller, calls } = harness([weapon('W1')]);
        controller.toggleManage();
        assert.isFalse(controller.toggleLockSelected());
        assert.isTrue(controller.decomposeSelected() === null);
        assert.equals(0, calls.locked.length);
        assert.equals(0, calls.decompose.length);
        assert.equals('請先選擇裝備', controller.getFlowView().texts.gearPickMessage);
        assert.isFalse(controller.getFlowView().actives.btnGearLock);
    });

    suite.test('選取後鎖定會切換旗標，按鈕文字在鎖定與解鎖間切換', () => {
        const { controller, calls } = harness([weapon('W1')]);
        controller.toggleManage();
        controller.choose(0);
        assert.isTrue(controller.toggleLockSelected());
        assert.isTrue(calls.locked[0].locked === true);
        assert.equals('解鎖', controller.getFlowView().texts.gearLockLabel);
        assert.isTrue(controller.toggleLockSelected());
        assert.isTrue(calls.locked[1].locked === false);
        assert.equals('鎖定', controller.getFlowView().texts.gearLockLabel);
    });

    suite.test('分解成功後清掉選取並提示獲得竹簡', () => {
        const { controller, calls } = harness([weapon('W1')]);
        controller.toggleManage();
        controller.choose(0);
        const result = controller.decomposeSelected();
        assert.isTrue(!!result && result.ok);
        assert.equals('W1', calls.decompose[0]);
        assert.isTrue(controller.selectedRow() === null);
        assert.isTrue(controller.getFlowView().texts.gearPickMessage.endsWith('，獲得 1 件竹簡'));
    });

    suite.test('鎖定中的裝備分解被拒絕並提示先解鎖', () => {
        const { controller } = harness([weapon('W1', { isLocked: true })], { ok: false, reason: 'LOCKED' });
        controller.toggleManage();
        controller.choose(0);
        const result = controller.decomposeSelected();
        assert.isTrue(!!result && !result.ok);
        assert.equals('已鎖定，請先解鎖再分解', controller.getFlowView().texts.gearPickMessage);
    });

    return suite;
}
