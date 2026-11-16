// @spec-source → PROG-2-9109（Widget 參數預設值未套用，畫面露出「${labelCancel}」）
/**
 * UITemplateResolverParams.test.ts — Widget 展開參數的合併順序
 * Unity 對照：Prefab 預設值 < 父層覆寫 < 實例覆寫。
 */
import { mergeWidgetParams } from '../assets/scripts/ui/core/UITemplateResolver';
import { TestSuite, assert } from './TestRunner';

const BUTTON_BAR_DEFS = {
    labelYes: { default: 'UI_CONFIRM' },
    labelCancel: { default: 'UI_CANCEL' },
    showTertiary: { default: false },
    noDefault: {},
};

export function createUITemplateResolverParamsSuite(): TestSuite {
    const suite = new TestSuite('UITemplateResolver 參數合併（PROG-2-9109）');

    suite.test('沒傳的參數用 Widget 預設值，不會留下 ${} 原字樣', () => {
        const p = mergeWidgetParams(BUTTON_BAR_DEFS, {}, {});
        assert.equals('UI_CANCEL', p.labelCancel);
        assert.equals(false, p.showTertiary);
        assert.isTrue(!('noDefault' in p));
    });

    suite.test('Template 參數覆蓋 Widget 預設，compose item 參數再覆蓋 Template', () => {
        const p = mergeWidgetParams(BUTTON_BAR_DEFS, { labelYes: 'T_YES', title: 'T' }, { labelYes: 'I_YES' });
        assert.equals('I_YES', p.labelYes);
        assert.equals('T', p.title);
        assert.equals('UI_CANCEL', p.labelCancel);
    });

    suite.test('Widget 沒有參數定義時照舊只用傳入參數', () => {
        const p = mergeWidgetParams(undefined, { a: 1 }, { b: true });
        assert.equals(1, p.a);
        assert.equals(true, p.b);
    });

    return suite;
}
