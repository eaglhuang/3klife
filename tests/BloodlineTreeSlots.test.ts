/**
 * BloodlineTreeSlots.test.ts — 結緣血統樹格位排列 headless 測試（PROG-2-0279 / BRD-06）
 *
 * Unity 對照：等同 EditMode Test，驗證 Presenter 的資料排列，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { BLOODLINE_TREE_SLOT_COUNTS, buildBloodlineTreeSlots } from '../assets/scripts/core/systems/BloodlineTreeSlots';

export function createBloodlineTreeSlotsSuite(): TestSuite {
    const suite = new TestSuite('BloodlineTreeSlots (BRD-06 結緣血統樹格位)');

    suite.test('格數固定為 2 + 4 + 8 = 14 人', () => {
        assert.equals(2, BLOODLINE_TREE_SLOT_COUNTS.gen3);
        assert.equals(4, BLOODLINE_TREE_SLOT_COUNTS.gen2);
        assert.equals(8, BLOODLINE_TREE_SLOT_COUNTS.gen1);
    });

    suite.test('14 位祖先依序分配到第 3 / 2 / 1 代', () => {
        const uids = Array.from({ length: 14 }, (_, i) => `a${i}`);
        const slots = buildBloodlineTreeSlots(uids);
        assert.equals(JSON.stringify(['a0', 'a1']), JSON.stringify(slots.gen3.map((s) => s.uid)));
        assert.equals(JSON.stringify(['a2', 'a3', 'a4', 'a5']), JSON.stringify(slots.gen2.map((s) => s.uid)));
        assert.equals('a13', slots.gen1[7].uid!);
    });

    suite.test('祖先不足時剩下的格位為空（uid null、文字為破折號）', () => {
        const slots = buildBloodlineTreeSlots(['a0', 'a1', 'a2']);
        assert.equals(null, slots.gen2[1].uid);
        assert.equals('—', slots.gen2[1].label);
        assert.equals(null, slots.gen1[7].uid);
    });

    suite.test('有名字就顯示名字，沒有則退回 uid', () => {
        const names: Record<string, string> = { a0: '劉備' };
        const slots = buildBloodlineTreeSlots(['a0', 'a1'], (uid) => names[uid]);
        assert.equals('劉備', slots.gen3[0].label);
        assert.equals('a1', slots.gen3[1].label);
    });

    suite.test('超過 14 位的祖先忽略，輸入陣列不被修改', () => {
        const input = Array.from({ length: 20 }, (_, i) => `x${i}`);
        const before = input.length;
        const slots = buildBloodlineTreeSlots(input);
        assert.equals(before, input.length);
        assert.equals(14, slots.gen3.length + slots.gen2.length + slots.gen1.length);
        assert.isFalse(JSON.stringify(slots).includes('x14'));
    });

    return suite;
}
