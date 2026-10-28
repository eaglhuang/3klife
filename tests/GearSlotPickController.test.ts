/**
 * GearSlotPickController.test.ts — 寶頁格位選取面板（PROG-2-1044）
 *
 * 鎖住：可放入清單只含該格裝備、排除他人已裝與非裝備與未知定義；
 * 穿上成功即關閉面板，失敗留在面板顯示原因；卸下只在該格有裝備時可用；FlowView 啟用狀態。
 */
import { assert, TestSuite } from './TestRunner';
import { EquipSlot } from '../assets/scripts/core/systems/GeneralBackpack';
import { GEAR_DEFINITIONS } from '../assets/scripts/core/systems/GearDefinitions';
import { buildGearPickerRows, hasEquippedInSlot } from '../assets/scripts/core/systems/GearPickerView';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import type { GearEquipResult } from '../assets/scripts/core/systems/GearEquipFlow';
import { GearSlotPickController } from '../assets/scripts/ui/core/GearSlotPickController';

const GENERAL = 'gen-1';
const OTHER = 'gen-2';

function placeholderIdOf(slot: string): string {
    return GEAR_DEFINITIONS.find((def) => def.slot === slot)!.id;
}

function gear(id: string, gearId: string | null, equippedBy: string | null = null, slotId: string | null = null): InventoryRecord {
    return {
        Inventory_ID: id, Item_Type: 'OTHER', Slot_Type: 'GEAR', Bound_General_UID: null, Quantity: 1, Quality: 'R',
        Source_Type: 'TEST', Display_Bucket: 'GEAR', Is_Displayed: true, Attributes: {}, Gear_ID: gearId, equippedBy, slotId,
    };
}

function harness(records: InventoryRecord[], equipResult: GearEquipResult = { ok: true, records }) {
    const calls: { kind: 'equip' | 'unequip'; args: unknown[] }[] = [];
    const controller = new GearSlotPickController({
        records: () => records,
        generalUid: () => GENERAL,
        equip: (...args) => { calls.push({ kind: 'equip', args: [...args] }); return equipResult; },
        unequip: (...args) => { calls.push({ kind: 'unequip', args: [...args] }); return { ok: true, records }; },
        setLocked: () => false,
        decompose: () => ({ ok: false, reason: 'NOT_FOUND' }),
    });
    return { controller, calls };
}

export function createGearSlotPickControllerSuite(): TestSuite {
    const suite = new TestSuite('GearSlotPickController (寶頁格位選取面板 PROG-2-1044)');

    suite.test('可放入清單只含該格裝備；排除他人已裝、非裝備與未知定義', () => {
        const records = [
            gear('W1', placeholderIdOf('WEAPON')),
            gear('W2', placeholderIdOf('WEAPON'), OTHER, 'WEAPON'),
            gear('A1', placeholderIdOf('ARMOR')),
            gear('X1', 'NO_SUCH_GEAR'),
            { ...gear('T1', placeholderIdOf('WEAPON')), Item_Type: 'TALLY' } as InventoryRecord,
        ];
        const rows = buildGearPickerRows(records, GENERAL, 'WEAPON');
        assert.equals(1, rows.length);
        assert.equals('W1', rows[0].gearUid);
        assert.equals('武器（占位）', rows[0].name);
    });

    suite.test('同一武將已裝在該格的裝備仍可列出（重新穿戴）', () => {
        const records = [gear('W1', placeholderIdOf('WEAPON'), GENERAL, 'WEAPON')];
        assert.equals(1, buildGearPickerRows(records, GENERAL, 'WEAPON').length);
    });

    suite.test('hasEquippedInSlot 只認這位武將該格的裝備', () => {
        const records = [gear('W1', placeholderIdOf('WEAPON'), GENERAL, 'WEAPON')];
        assert.isTrue(hasEquippedInSlot(records, GENERAL, 'WEAPON'));
        assert.isFalse(hasEquippedInSlot(records, GENERAL, 'ARMOR'));
        assert.isFalse(hasEquippedInSlot(records, OTHER, 'WEAPON'));
    });

    suite.test('開啟面板列出清單，FlowView 顯示標題與列文字', () => {
        const records = [gear('W1', placeholderIdOf('WEAPON'))];
        const { controller } = harness(records);
        controller.open('WEAPON' as EquipSlot);
        const view = controller.getFlowView();
        assert.equals('選擇武器', view.texts.gearPickTitle);
        assert.equals('R｜武器（占位）', view.texts.gearPickLabel0);
        assert.isTrue(view.actives.btnGearPick0);
        assert.isFalse(view.actives.btnGearPick1);
        assert.isTrue(view.actives.gearPickPanel);
    });

    suite.test('選一件穿上：呼叫 equip，成功後關閉面板並顯示提示', () => {
        const records = [gear('W1', placeholderIdOf('WEAPON'))];
        const { controller, calls } = harness(records);
        controller.open('WEAPON' as EquipSlot);
        const result = controller.choose(0);
        assert.isTrue(result?.ok === true);
        assert.equals(1, calls.length);
        assert.equals('W1', String(calls[0].args[0]));
        assert.equals(GENERAL, String(calls[0].args[1]));
        assert.equals('WEAPON', String(calls[0].args[2]));
        assert.isTrue(controller.slot() === null);
        assert.equals('已穿上 武器（占位）', controller.getFlowView().texts.gearPickMessage);
    });

    suite.test('穿上失敗：留在面板並顯示原因', () => {
        const records = [gear('W1', placeholderIdOf('WEAPON'))];
        const { controller } = harness(records, { ok: false, reason: 'NOT_EQUIPABLE' });
        controller.open('WEAPON' as EquipSlot);
        controller.choose(0);
        assert.equals('WEAPON', controller.slot() ?? '');
        assert.equals('這件裝備不能放進這一格', controller.getFlowView().texts.gearPickMessage);
    });

    suite.test('卸下只在該格有裝備時可用，成功後關閉面板', () => {
        const worn = [gear('W1', placeholderIdOf('WEAPON'), GENERAL, 'WEAPON')];
        const { controller, calls } = harness(worn);
        controller.open('WEAPON' as EquipSlot);
        assert.isTrue(controller.getFlowView().actives.btnGearUnequip);
        const result = controller.unequip();
        assert.isTrue(result?.ok === true);
        assert.equals('unequip', calls[0].kind);
        assert.isTrue(controller.slot() === null);
    });

    suite.test('該格沒有裝備時卸下回傳 null，不呼叫 unequip', () => {
        const { controller, calls } = harness([]);
        controller.open('ARMOR' as EquipSlot);
        assert.isTrue(controller.unequip() === null);
        assert.equals(0, calls.length);
        assert.isFalse(controller.getFlowView().actives.btnGearUnequip);
    });

    suite.test('面板關閉時 FlowView 隱藏面板且不顯示列', () => {
        const { controller } = harness([gear('W1', placeholderIdOf('WEAPON'))]);
        const view = controller.getFlowView();
        assert.isFalse(view.actives.gearPickPanel);
        assert.isFalse(view.actives.btnGearPick0);
    });

    return suite;
}
