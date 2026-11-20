// @spec-source → Issue #2139（奧義漫畫分鏡 cut-in）；PROG-2-9419
/**
 * UltCutinBurstGlow.test.ts — 奧義收尾爆光的繪製層次：邊緣淡、中心亮，外圈有衝擊波環。
 *
 * Unity 對照：驗證程式產生的 radial gradient 參數，不開場景。
 */
import {
    BURST_GLOW_STEPS,
    BURST_RING_RADIUS_RATIO,
    burstGlowLayers,
    burstGlowOpacityAt,
    lightenChannel,
} from '../assets/scripts/shared/cutin/cutinBurstGlow';
import { TestSuite, assert } from './TestRunner';

export function createUltCutinBurstGlowSuite(): TestSuite {
    const suite = new TestSuite('UltCutinBurstGlow');

    suite.test('層次：柔光由外到內、半徑遞減，最後一層是衝擊波環', () => {
        const layers = burstGlowLayers(1000);
        assert.equals(BURST_GLOW_STEPS + 1, layers.length);
        const fills = layers.filter((l) => l.kind === 'fill');
        assert.equals(1000, fills[0].radius);
        for (let i = 1; i < fills.length; i++) assert.isTrue(fills[i].radius < fills[i - 1].radius);
        const ring = layers[layers.length - 1];
        assert.equals('ring', ring.kind);
        assert.equals(1000 * BURST_RING_RADIUS_RATIO, ring.radius);
        assert.isTrue((ring.lineWidth ?? 0) > 0);
    });

    suite.test('邊緣淡、中心亮：不再是起始幾乎不透明的硬邊實心圓', () => {
        const edge = burstGlowOpacityAt(1000, 999);
        const center = burstGlowOpacityAt(1000, 0);
        assert.isTrue(edge < 0.25, `邊緣不透明度應很低，實際 ${edge}`);
        assert.isTrue(center > 0.8, `中心應夠亮，實際 ${center}`);
        assert.isTrue(burstGlowOpacityAt(1000, 500) > edge);
        assert.isTrue(burstGlowOpacityAt(1000, 500) < center);
    });

    suite.test('越往中心越接近白色；提亮比例有上下限', () => {
        const fills = burstGlowLayers(100).filter((l) => l.kind === 'fill');
        assert.equals(0, fills[0].lighten);
        assert.isTrue(fills[fills.length - 1].lighten > fills[0].lighten);
        assert.equals(120, lightenChannel(120, 0));
        assert.equals(255, lightenChannel(120, 1));
        assert.equals(255, lightenChannel(120, 5));
        assert.equals(120, lightenChannel(120, -1));
    });

    suite.test('半徑無效時不畫任何東西', () => {
        assert.equals(0, burstGlowLayers(0).length);
        assert.equals(0, burstGlowLayers(-5).length);
        assert.equals(0, burstGlowLayers(Number.NaN).length);
    });

    return suite;
}
