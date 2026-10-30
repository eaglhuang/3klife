/**
 * UcufWidgetSizeSource.test.ts — UCUF 尺寸單一來源（PROG-2-1628）
 *
 * Unity 對照：像 RectTransform 的 anchor 用比例保存，不在 Instantiate 時換成固定像素。
 */
import { assert, TestSuite } from './TestRunner';
import { Label, Node, Widget } from 'cc';
import { percentFraction, widgetStretchSize } from '../assets/scripts/ui/core/UISpecTypes';
import { UIPreviewLayoutBuilder } from '../assets/scripts/ui/core/UIPreviewLayoutBuilder';
import { UIPreviewBuilder } from '../assets/scripts/ui/core/UIPreviewBuilder';

export function createUcufWidgetSizeSourceSuite(): TestSuite {
    const suite = new TestSuite('UCUF 尺寸單一來源');

    suite.test('百分比字串轉 0~1 比例，數字回 null', () => {
        assert.equals(0.125, percentFraction('12.5%'));
        assert.equals(null, percentFraction(40));
    });

    suite.test('左右同時對齊才拉伸寬度，未拉伸的軸沿用 fallback', () => {
        const size = widgetStretchSize({ left: '10%', right: 20 }, 1280, 720, 300, 200);
        assert.equals(1280 - 128 - 20, size.width);
        assert.equals(200, size.height);
    });

    suite.test('Widget 百分比以比例保存，數字維持絕對像素', () => {
        const node = new Node('n');
        new UIPreviewLayoutBuilder().applyWidget(node, { left: '25%', top: 30 } as any, 1920, 1080);
        const w = node.getComponent(Widget) as any;
        assert.equals(false, w.isAbsoluteLeft);
        assert.equals(0.25, w.left);
        assert.equals(true, w.isAbsoluteTop);
        assert.equals(30, w.top);
    });

    suite.test('流式 Label 在自決尺寸模式下實測，其餘沿用估寬（PROG-2-1630）', () => {
        const measure = (UIPreviewBuilder.prototype as any)._measureFlowLabel;
        const run = (overflow: number, spec: any, flow = true): boolean => {
            const node = new Node('l');
            const lbl = node.addComponent(Label) as any;
            let called = false;
            lbl.overflow = overflow;
            lbl.updateRenderData = () => { called = true; };
            measure.call({}, node, spec, flow);
            return called;
        };
        const O = (Label as any).Overflow;
        assert.equals(true, run(O.NONE, { type: 'label' }));
        assert.equals(true, run(O.RESIZE_HEIGHT, { type: 'label', width: 200 }));
        assert.equals(false, run(O.SHRINK, { type: 'label' }));
        assert.equals(false, run(O.NONE, { type: 'label' }, false));
        assert.equals(false, run(O.NONE, { type: 'label', width: 10, height: 10 }));
    });

    return suite;
}
