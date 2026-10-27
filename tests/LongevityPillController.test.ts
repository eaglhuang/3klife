/**
 * LongevityPillController.test.ts — 延壽丹使用流程 Presenter（PROG-2-1348）
 */
import { assert, TestSuite } from './TestRunner';
import { LONGEVITY_PILL_REJECT_TEXT, LongevityPillController } from '../assets/scripts/ui/core/LongevityPillController';
import type { LongevityPillUseResult } from '../assets/scripts/core/systems/LongevityPill';
import { addItem, ITEM_LONGEVITY_PILL, normalizeInventory, PlayerInventory } from '../assets/scripts/core/systems/PlayerInventory';

type SessionResult = LongevityPillUseResult | { readonly ok: false; readonly reason: 'no-general' };

function controller(inventory: PlayerInventory, result: SessionResult): { ctrl: LongevityPillController; calls: string[] } {
    const calls: string[] = [];
    const ctrl = new LongevityPillController({
        session: {
            inventory,
            useLongevityPillOnGeneral: async (id: string) => { calls.push(id); return result; },
        },
    });
    return { ctrl, calls };
}

export function createLongevityPillControllerSuite(): TestSuite {
    const suite = new TestSuite('LongevityPillController (延壽丹使用流程 PROG-2-1348)');
    const empty = normalizeInventory({});

    suite.test('getView：持有數與可否使用', () => {
        assert.equals(0, controller(empty, { ok: false, reason: 'no-item' }).ctrl.getView().count);
        assert.isFalse(controller(empty, { ok: false, reason: 'no-item' }).ctrl.getView().usable);
        const v = controller(addItem(empty, ITEM_LONGEVITY_PILL, 2), { ok: false, reason: 'no-item' }).ctrl.getView();
        assert.equals(2, v.count);
        assert.isTrue(v.usable);
    });

    suite.test('成功：顯示武將名與延長後的壽命上限', async () => {
        const { ctrl, calls } = controller(empty, { ok: true, inventory: empty, maxLifespan: 73, previousMaxLifespan: 70 });
        const text = await ctrl.use('gen-a', '黃忠');
        assert.equals('黃忠 服下延壽丹，壽命上限延長 3 歲（70→73）', text);
        assert.equals('gen-a', calls[0]);
    });

    suite.test('拒絕原因轉成提示文字', async () => {
        for (const reason of ['no-item', 'dead', 'no-general'] as const) {
            const text = await controller(empty, { ok: false, reason }).ctrl.use('x', 'x');
            assert.equals(LONGEVITY_PILL_REJECT_TEXT[reason], text);
        }
    });

    return suite;
}
