/**
 * SvgLineArt.test.ts — 純線條 SVG 換算到節點框（PROG-2-1682）
 *
 * Unity 對照：像 LineRenderer 的座標換算：viewBox 座標依 preserveAspectRatio
 * 拉伸或等比置中到 RectTransform 大小。
 */
import { assert, TestSuite } from './TestRunner';
import { isSvgLineArtMeta, layoutSvgLineArt, type SvgLineArtMeta } from '../assets/scripts/ui/core/SvgLineArt';

const meta = (par: string): SvgLineArtMeta => ({
    kind: 'line-art',
    viewBox: { x: 0, y: 0, width: 600, height: 32 },
    preserveAspectRatio: par,
    lines: [{ x1: 150, y1: 0, x2: 450, y2: 16, stroke: '#FFE088', strokeWidth: 2 }],
});

export function createSvgLineArtSuite(): TestSuite {
    const suite = new TestSuite('SvgLineArt (純線條 SVG 換算)');

    suite.test('preserveAspectRatio=none 時橫縱各自拉伸', () => {
        const [seg] = layoutSvgLineArt(meta('none'), 300, 64);
        assert.equals(75, seg.x1);
        assert.equals(225, seg.x2);
        assert.equals(32, seg.y2);
        assert.equals('#FFE088', seg.color);
        assert.equals('255,224,136,255', seg.rgba.join(','));
        assert.equals(2, seg.width);
    });

    suite.test('預設等比縮放並置中', () => {
        const [seg] = layoutSvgLineArt(meta('xMidYMid meet'), 300, 64);
        assert.equals(75, seg.x1);
        assert.equals(24, seg.y1);
        assert.equals(32, seg.y2);
    });

    suite.test('尺寸無效時不畫，非 line-art 不認', () => {
        assert.equals(0, layoutSvgLineArt(meta('none'), 0, 10).length);
        assert.equals(false, isSvgLineArtMeta({ kind: 'radar-chart' }));
        assert.equals(true, isSvgLineArtMeta(meta('none')));
    });

    return suite;
}
