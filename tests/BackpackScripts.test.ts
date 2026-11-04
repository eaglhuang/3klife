// @spec-source → 武將背包（倉庫）系統.md (doc_spec_0017) §G；PROG-2-1764
import { assert, TestSuite } from './TestRunner';
import { equipHorseLine, gearInheritLine, retireGearReturnLine, warehouseFullLine } from '../assets/scripts/core/systems/BackpackScripts';
import { GearSlotPickController } from '../assets/scripts/ui/core/GearSlotPickController';
import { RetirementFlowController } from '../assets/scripts/ui/core/RetirementFlowController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

function pickController(slotGeneralName: string | undefined) {
    const records = [{ Inventory_ID: 'g1', Item_Type: 'OTHER', Gear_ID: 'GEAR_MOUNT_PLACEHOLDER', Quality: 'R', equippedBy: null, slotId: null }] as unknown as InventoryRecord[];
    return new GearSlotPickController({
        records: () => records,
        generalUid: () => 'zhao-yun',
        generalName: slotGeneralName === undefined ? undefined : () => slotGeneralName,
        equip: () => ({ ok: true, records }),
        unequip: () => ({ ok: true, records }),
        setLocked: () => true,
        decompose: () => ({ ok: false, reason: 'NOT_FOUND' }),
    });
}

function retireFlow(hasGear: boolean, gender: string) {
    const elder = { id: 'old', name: '黃忠', age: 70, gender } as unknown as GeneralConfig;
    const heir = { id: 'kid', name: '黃敘', age: 16, fatherId: 'old' } as unknown as GeneralConfig;
    const flow = new RetirementFlowController({
        roster: () => [elder, heir],
        retireGeneral: async () => undefined,
        hasEquippedGear: () => hasGear,
    });
    return flow;
}

export function createBackpackScriptsSuite(): TestSuite {
    const suite = new TestSuite('BackpackScripts');

    suite.test('規格 §G 句子，女將改用她與母親', () => {
        assert.equals('赤兔 嘶鳴長嘯——呂布 如虎添翼！', equipHorseLine('赤兔', '呂布'));
        assert.equals('黃忠 留下了他的裝備，願後人善加利用。', retireGearReturnLine('黃忠', false));
        assert.equals('孫尚香 留下了她的裝備，願後人善加利用。', retireGearReturnLine('孫尚香', true));
        assert.equals('父親的佩劍傳到了黃敘手中——血脈與鐵器，一同傳承。', gearInheritLine('黃敘', false));
        assert.equals('母親的佩劍傳到了阿斗手中——血脈與鐵器，一同傳承。', gearInheritLine('阿斗', true));
        assert.equals('主城倉庫已滿！請清理或擴充空間。', warehouseFullLine());
    });

    suite.test('裝備名馬顯示劇本句，其他格維持一般提示', () => {
        const mount = pickController('趙雲');
        mount.open('MOUNT');
        mount.choose(0);
        assert.isTrue(mount.getFlowView().texts.gearPickMessage.includes('趙雲 如虎添翼！'));

        const noName = pickController(undefined);
        noName.open('MOUNT');
        noName.choose(0);
        assert.isTrue(noName.getFlowView().texts.gearPickMessage.startsWith('已穿上'));
    });

    suite.test('退役提示帶裝備去向：沒裝備不提，有裝備回倉', async () => {
        const noGear = retireFlow(false, '男');
        await noGear.retire();
        await noGear.retire();
        assert.isFalse(noGear.notice.includes('裝備'));

        const withGear = retireFlow(true, '男');
        await withGear.retire();
        await withGear.retire();
        assert.isTrue(withGear.notice.includes('黃忠 留下了他的裝備'));

        const toHeir = retireFlow(true, '女');
        toHeir.selectNextHeirChild();
        await toHeir.retire();
        await toHeir.retire();
        assert.isTrue(toHeir.notice.includes('母親的佩劍傳到了黃敘手中'));
    });

    return suite;
}
