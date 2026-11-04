/**
 * QuickViewSkillLines.test.ts — 主將快覽戰法列：我方顯示名稱，敵方未發動顯示「🔒 未知戰法」（PROG-2-1756）
 */
import { assert, TestSuite } from './TestRunner';
import { QUICK_VIEW_UNKNOWN_TACTIC, quickViewSkillLines } from '../assets/scripts/shared/QuickViewSkillLines';
import { getBattleSkillPresentation } from '../assets/scripts/shared/BattleSkillPresentation';

export function createQuickViewSkillLinesSuite(): TestSuite {
    const suite = new TestSuite('QuickViewSkillLines (主將快覽戰法列 PROG-2-1756)');

    suite.test('我方一律顯示名稱；敵方未發動顯示未知、發動後顯示名稱', () => {
        const nameOf = (id: string): string => `名:${id}`;
        assert.equals('名:a,名:b', quickViewSkillLines(['a', 'b'], false, new Set(), nameOf).join(','));
        assert.equals(`${QUICK_VIEW_UNKNOWN_TACTIC},名:b`, quickViewSkillLines(['a', 'b'], true, new Set(['b']), nameOf).join(','));
        assert.equals(0, quickViewSkillLines([], true, new Set()).length);
    });

    suite.test('預設查 BattleSkillPresentation 的顯示名稱', () => {
        assert.equals(getBattleSkillPresentation('tally-link').name, quickViewSkillLines(['tally-link'], false, new Set())[0]);
    });

    return suite;
}
