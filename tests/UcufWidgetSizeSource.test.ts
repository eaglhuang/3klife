/**
 * UcufWidgetSizeSource.test.ts — UCUF 尺寸單一來源（PROG-2-1628）
 *
 * Unity 對照：像 RectTransform 的 anchor 用比例保存，不在 Instantiate 時換成固定像素。
 */
import { assert, TestSuite } from './TestRunner';
import { Node, Widget } from 'cc';
import { percentFraction, widgetStretchSize } from '../assets/scripts/ui/core/UISpecTypes';
import { UIPreviewLayoutBuilder } from '../assets/scripts/ui/core/UIPreviewLayoutBuilder';

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

    return suite;
}
