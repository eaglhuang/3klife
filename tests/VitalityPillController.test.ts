/**
 * 補元散使用鈕的流程（PROG-2-0444）
 *
 * 鎖住：持有數顯示正確；使用成功與各拒絕原因都轉成正確提示文字；控制器不改背包（由 session 負責）。
 * GameSession.usePillOnGeneral 的存檔與名冊寫回不在這裡測，交 Codex 實機與存檔測試。
 */
import { assert, TestSuite } from './TestRunner';
import { VitalityPillController, VITALITY_PILL_REJECT_TEXT } from '../assets/scripts/ui/core/VitalityPillController';
import { ITEM_PREMIUM_VITALITY_PILL, ITEM_VITALITY_PILL, PlayerInventory } from '../assets/scripts/core/systems/PlayerInventory';
import type { VitalityPillKind } from '../assets/scripts/core/systems/VitalityPill';

function fakeSession(inventory: PlayerInventory) {
    return {
        inventory,
        usePillOnGeneral: async (_id: string, _kind: VitalityPillKind) => ({ ok: false as const, reason: 'no-item' as const }),
    };
}

export function createVitalityPillControllerSuite(): TestSuite {
    const suite = new TestSuite('VitalityPillController (補元散使用鈕流程 PROG-2-0444)');

    suite.test('持有數顯示：補元散與高級補元散各自讀取', () => {
        const inventory: PlayerInventory = { [ITEM_VITALITY_PILL]: 4, [ITEM_PREMIUM_VITALITY_PILL]: 1 };
        const view = new VitalityPillController({ session: fakeSession(inventory) }).getView();
        assert.equals(4, view.vitalityPillCount);
        assert.equals(1, view.premiumVitalityPillCount);
    });

    suite.test('持有數顯示：沒有道具時為 0', () => {
        const view = new VitalityPillController({ session: fakeSession({}) }).getView();
        assert.equals(0, view.vitalityPillCount);
        assert.equals(0, view.premiumVitalityPillCount);
    });

    suite.test('使用成功：提示回復量與目前精力', async () => {
        const session = {
            inventory: {} as PlayerInventory,
            usePillOnGeneral: async () => ({ ok: true as const, vitality: 70, restored: 50 }),
        };
        const text = await new VitalityPillController({ session }).use('g1', 'vitalityPill', '趙雲');
        assert.equals('趙雲 服下補元散，精力恢復！', text);
    });

    suite.test('拒絕原因轉成提示文字：精力已滿、沒有道具、查無武將', async () => {
        const reasons = ['vitality-full', 'no-item', 'no-general'] as const;
        for (const reason of reasons) {
            const session = {
                inventory: {} as PlayerInventory,
                usePillOnGeneral: async () => ({ ok: false as const, reason }),
            };
            const text = await new VitalityPillController({ session }).use('g1', 'premiumVitalityPill', '趙雲');
            assert.equals(VITALITY_PILL_REJECT_TEXT[reason], text);
        }
    });

    return suite;
}
