/**
 * LabelLayoutDeferral.test.ts — 固定外框 Label 的強制排版延後（PROG-2-9801）
 */
import { assert, TestSuite } from './TestRunner';
import { Label } from 'cc';
import { runWithDeferredLayout, refreshLabelLazily, hasFixedBox } from '../assets/scripts/ui/core/LabelLayoutDeferral';

interface FakeInner {
    updateRenderData(force?: boolean): void;
    _flushAssembler(): void;
    _applyFontTexture(): void;
    _markForUpdateRenderData(enable?: boolean): void;
    renderData: { vertDirty: boolean } | null;
}

const layoutCalls: boolean[] = [];

function makeLabel(overflow: number): Label & FakeInner {
    const label = new Label() as unknown as Label & FakeInner;
    label.overflow = overflow;
    label.renderData = { vertDirty: false };
    const marks: string[] = [];
    (label as unknown as { marks: string[] }).marks = marks;
    label._flushAssembler = () => { marks.push('flush'); };
    label._applyFontTexture = () => { marks.push('font'); };
    label._markForUpdateRenderData = () => { marks.push('mark'); };
    return label;
}

export function createLabelLayoutDeferralSuite(): TestSuite {
    const suite = new TestSuite('LabelLayoutDeferral');
    // 測試替身的 Label 沒有排版方法：補一個會記錄強制排版次數的
    (Label.prototype as unknown as FakeInner).updateRenderData = function (force = false): void { layoutCalls.push(force); };

    suite.test('SHRINK／CLAMP 是固定外框，NONE／RESIZE_HEIGHT 不是', () => {
        assert.equals(true, hasFixedBox(makeLabel(Label.Overflow.SHRINK)));
        assert.equals(true, hasFixedBox(makeLabel(Label.Overflow.CLAMP)));
        assert.equals(false, hasFixedBox(makeLabel(Label.Overflow.NONE)));
        assert.equals(false, hasFixedBox(makeLabel(Label.Overflow.RESIZE_HEIGHT)));
    });

    suite.test('固定外框：範圍內的強制排版改成標髒，範圍外照舊', () => {
        layoutCalls.length = 0;
        const label = makeLabel(Label.Overflow.SHRINK);
        runWithDeferredLayout(label, () => { label.updateRenderData(true); label.updateRenderData(true); });
        assert.equals(0, layoutCalls.length);
        assert.equals(true, label.renderData?.vertDirty);
        assert.equals(true, (label as unknown as { marks: string[] }).marks.includes('mark'));
        label.updateRenderData(true);
        assert.equals(1, layoutCalls.length);
    });

    suite.test('NONE 會依內容改節點尺寸：維持強制即時排版', () => {
        layoutCalls.length = 0;
        const label = makeLabel(Label.Overflow.NONE);
        runWithDeferredLayout(label, () => { label.updateRenderData(true); });
        assert.equals(1, layoutCalls.length);
    });

    suite.test('範圍內其他標籤與非強制排版不受影響；例外後狀態會還原', () => {
        layoutCalls.length = 0;
        const a = makeLabel(Label.Overflow.SHRINK);
        const b = makeLabel(Label.Overflow.SHRINK);
        let thrown = false;
        try {
            runWithDeferredLayout(a, () => { b.updateRenderData(true); a.updateRenderData(false); throw new Error('boom'); });
        } catch (_) { thrown = true; }
        assert.equals(true, thrown);
        assert.equals(2, layoutCalls.length);
        a.updateRenderData(true);
        assert.equals(3, layoutCalls.length);
    });

    suite.test('refreshLabelLazily：固定外框只標髒，其他元件交還呼叫端', () => {
        const fixed = makeLabel(Label.Overflow.CLAMP);
        assert.equals(true, refreshLabelLazily(fixed));
        assert.equals(false, refreshLabelLazily(makeLabel(Label.Overflow.NONE)));
        assert.equals(false, refreshLabelLazily({}));
    });

    return suite;
}
