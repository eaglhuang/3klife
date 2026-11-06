/**
 * WidgetStretch.test.ts — 結算窗 host 撐滿畫面，遮罩才能蓋全螢幕（PROG-2-1879）
 *
 * Unity 對照：RectTransform anchorMin=(0,0)、anchorMax=(1,1)、offset 歸零。
 */
import { stretchWidgetToParent, StretchableWidget } from '../assets/scripts/ui/core/WidgetStretch';
import { TestSuite, assert } from './TestRunner';

function makeWidget(init: Partial<StretchableWidget>): StretchableWidget & { updates: number } {
    const w = {
        isAlignTop: false, isAlignBottom: false, isAlignLeft: false, isAlignRight: false,
        isAlignHorizontalCenter: false, isAlignVerticalCenter: false,
        top: 0, bottom: 0, left: 0, right: 0,
        updates: 0,
        updateAlignment() { w.updates++; },
        ...init,
    };
    return w;
}

export function createWidgetStretchSuite(): TestSuite {
    const suite = new TestSuite('WidgetStretch (結算窗遮罩撐滿 PROG-2-1879)');

    suite.test('只設置中的 host 改成四邊貼齊並重算', () => {
        const w = makeWidget({ isAlignHorizontalCenter: true, isAlignVerticalCenter: true });
        assert.equals(true, stretchWidgetToParent(w));
        assert.equals(false, w.isAlignHorizontalCenter);
        assert.equals(false, w.isAlignVerticalCenter);
        assert.equals(true, w.isAlignTop && w.isAlignBottom && w.isAlignLeft && w.isAlignRight);
        assert.equals(1, w.updates);
    });

    suite.test('四邊有邊距時歸零', () => {
        const w = makeWidget({ isAlignTop: true, isAlignBottom: true, isAlignLeft: true, isAlignRight: true, top: 40 });
        assert.equals(true, stretchWidgetToParent(w));
        assert.equals(0, w.top);
    });

    suite.test('已撐滿時不動也不重算', () => {
        const w = makeWidget({ isAlignTop: true, isAlignBottom: true, isAlignLeft: true, isAlignRight: true });
        assert.equals(false, stretchWidgetToParent(w));
        assert.equals(0, w.updates);
    });

    return suite;
}
