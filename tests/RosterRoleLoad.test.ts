// @spec-source → 武將系統.md §Server 端欄位表（Role ENUM）（GEN-06 接線，PROG-2-0556）
/**
 * RosterRoleLoad — 讀檔名冊職能正規化 headless 測試（PROG-2-0556）
 */
import { assert, TestSuite } from './TestRunner';
import { normalizeRosterRoles } from '../assets/scripts/core/systems/RosterRoleLoad';

export function createRosterRoleLoadSuite(): TestSuite {
    const suite = new TestSuite('RosterRoleLoad (讀檔職能正規化 GEN-06)');

    suite.test('舊值正規化：Advisor / Planner / Noble → Combat，Support → Mentor', () => {
        const out = normalizeRosterRoles([
            { id: 'a', role: 'Advisor' },
            { id: 'b', role: 'Planner' },
            { id: 'c', role: 'Noble' },
            { id: 'd', role: 'Support' },
        ]);
        assert.equals('Combat', out[0].role);
        assert.equals('Combat', out[1].role);
        assert.equals('Combat', out[2].role);
        assert.equals('Mentor', out[3].role);
    });

    suite.test('待裁決的未知值原樣保留，不硬歸類', () => {
        const out = normalizeRosterRoles([{ id: 'x', role: 'Mystic' }]);
        assert.equals('Mystic', out[0].role);
    });

    suite.test('已是規格值不變，且不改動其他欄位', () => {
        const input = { id: 'y', name: '甲', role: 'Combat' };
        const out = normalizeRosterRoles([input]);
        assert.equals('Combat', out[0].role);
        assert.equals('甲', out[0].name);
        assert.equals(input.role, out[0].role);
    });

    suite.test('不修改傳入的原陣列物件（回傳新物件）', () => {
        const input = [{ id: 'z', role: 'Support' }];
        const out = normalizeRosterRoles(input);
        assert.equals('Support', input[0].role);
        assert.equals('Mentor', out[0].role);
    });

    return suite;
}
