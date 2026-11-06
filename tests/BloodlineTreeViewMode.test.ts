/**
 * BloodlineTreeViewMode.test.ts — 祖先樹簡化／專家模式 headless 測試（血統理論 §E-6，PROG-2-1731）
 *
 * Unity 對照：EditMode Test 直接驗證各模式顯示哪些祖先格位。
 */
import { assert, TestSuite } from './TestRunner';
import {
    BLOODLINE_TREE_SPEC_DEFAULT_MODE,
    BLOODLINE_TREE_TOGGLE_LABEL,
    bloodlineTreeRowVisible,
    bloodlineTreeToggleAvailable,
    isPedigreeSlotVisible,
    toggleBloodlineTreeMode,
    visiblePedigreeSlots,
} from '../assets/scripts/core/systems/BloodlineTreeViewMode';

export function createBloodlineTreeViewModeSuite(): TestSuite {
    const suite = new TestSuite('BloodlineTreeViewMode (血統理論 §E-6 簡化/專家切換)');

    suite.test('規格預設為簡化模式', () => {
        assert.equals('simple', BLOODLINE_TREE_SPEC_DEFAULT_MODE);
    });

    suite.test('簡化模式只看父母與祖父母 6 人', () => {
        assert.equals('F,M,FF,FM,MF,MM', visiblePedigreeSlots('simple').join(','));
        assert.equals(false, isPedigreeSlotVisible('FFF', 'simple'));
    });

    suite.test('專家模式看到 14 人全圖', () => {
        assert.equals(14, visiblePedigreeSlots('expert').length);
        assert.equals(true, isPedigreeSlotVisible('MMM', 'expert'));
    });

    suite.test('切換在兩種模式間來回，按鈕文字對應目前模式', () => {
        assert.equals('expert', toggleBloodlineTreeMode('simple'));
        assert.equals('simple', toggleBloodlineTreeMode('expert'));
        assert.equals('展開全圖', BLOODLINE_TREE_TOGGLE_LABEL.simple);
        assert.equals('收合', BLOODLINE_TREE_TOGGLE_LABEL.expert);
    });

    suite.test('顯示列＝模式 × 家族階段（PROG-2-1897）', () => {
        assert.equals(false, bloodlineTreeRowVisible(3, 'simple', 4));
        assert.equals(true, bloodlineTreeRowVisible(3, 'expert', 4));
        assert.equals(false, bloodlineTreeRowVisible(2, 'expert', 1));
        assert.equals(true, bloodlineTreeRowVisible(1, 'simple', 1));
    });

    suite.test('切換鈕只在曾祖父母已開放的階段出現（PROG-2-1897）', () => {
        assert.equals(false, bloodlineTreeToggleAvailable(1));
        assert.equals(true, bloodlineTreeToggleAvailable(2));
        assert.equals(true, bloodlineTreeToggleAvailable(4));
    });

    return suite;
}
