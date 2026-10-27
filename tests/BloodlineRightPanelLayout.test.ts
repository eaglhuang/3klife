/**
 * BloodlineRightPanelLayout.test.ts — 命頁右半區六塊順序與英靈卡命槽操作（GDUI-05，PROG-2-1266）headless 測試
 *
 * 鎖住：六塊固定順序（英靈卡操作在最後）；空槽只可插入；已裝配可替換、卸下、設主卡（主卡不可再設）；
 * 戰鬥鎖定時只剩查看詳情；替換時要求提示被動解除。
 */
import { assert, TestSuite } from './TestRunner';
import { BLOODLINE_RIGHT_PANEL_BLOCKS, spiritSlotActions, SpiritSlotAction } from '../assets/scripts/core/systems/BloodlineRightPanelLayout';

function enabledOf(plan: ReturnType<typeof spiritSlotActions>): string {
    return plan.actions.filter((a) => a.enabled).map((a) => a.action).join(',');
}

export function createBloodlineRightPanelLayoutSuite(): TestSuite {
    const suite = new TestSuite('BloodlineRightPanelLayout (命頁右半六塊 GDUI-05 PROG-2-1266)');

    suite.test('六塊順序固定，英靈卡操作在最後', () => {
        assert.equals(
            'bloodlineSummary,bloodlineBeast,bloodlineUltimate,specialFactors,birthBurstAwakening,spiritSlot',
            BLOODLINE_RIGHT_PANEL_BLOCKS.join(','),
        );
    });

    suite.test('空命槽只可插入，查看詳情不可按', () => {
        const plan = spiritSlotActions({ occupied: false, isMain: false, battleLocked: false });
        assert.equals('insert', enabledOf(plan));
        assert.isFalse(plan.warnPassiveLoss);
    });

    suite.test('已裝配副卡可替換、卸下、設為主卡與查看詳情', () => {
        const plan = spiritSlotActions({ occupied: true, isMain: false, battleLocked: false });
        assert.equals('replace,unequip,setMain,detail', enabledOf(plan));
        assert.isTrue(plan.warnPassiveLoss);
    });

    suite.test('已是主卡時不可再設為主卡', () => {
        const plan = spiritSlotActions({ occupied: true, isMain: true, battleLocked: false });
        assert.equals('replace,unequip,detail', enabledOf(plan));
    });

    suite.test('戰鬥鎖定時只剩查看詳情', () => {
        const empty = spiritSlotActions({ occupied: false, isMain: false, battleLocked: true });
        assert.equals('', enabledOf(empty));
        const filled = spiritSlotActions({ occupied: true, isMain: false, battleLocked: true });
        assert.equals('detail', enabledOf(filled));
    });

    suite.test('操作順序固定為插入、替換、卸下、設為主卡、查看詳情', () => {
        const plan = spiritSlotActions({ occupied: true, isMain: false, battleLocked: false });
        const order: SpiritSlotAction[] = ['insert', 'replace', 'unequip', 'setMain', 'detail'];
        assert.equals(order.join(','), plan.actions.map((a) => a.action).join(','));
    });

    return suite;
}
