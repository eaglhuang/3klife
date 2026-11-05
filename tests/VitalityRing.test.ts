// @spec-source → 武將壽命系統.md (doc_spec_0018) §UI 可視化要求；PROG-2-1853
import { TestSuite, assert } from './TestRunner';
import { vitalityRingView, VITALITY_RING_COLORS } from '../assets/scripts/core/systems/VitalityBarView';

export function createVitalityRingSuite(): TestSuite {
    const suite = new TestSuite('VitalityRing');

    suite.test('精力充足：紫光、弧長等於比例、顯示百分比', () => {
        const v = vitalityRingView(72, 100);
        assert.equals('high', v.band);
        assert.equals(0.72, v.ratio);
        assert.equals('72%', v.text);
        assert.equals(VITALITY_RING_COLORS.high.join(','), v.color.join(','));
    });

    suite.test('中段改弱火琥珀，枯竭改灰', () => {
        assert.equals('mid', vitalityRingView(30, 100).band);
        assert.equals(VITALITY_RING_COLORS.mid.join(','), vitalityRingView(30, 100).color.join(','));
        const low = vitalityRingView(5, 100);
        assert.equals('exhausted', low.band);
        assert.equals('5%', low.text);
        assert.equals(VITALITY_RING_COLORS.exhausted.join(','), low.color.join(','));
    });

    suite.test('上限不是 100 時依比例；輸入無效視為 0 並變灰', () => {
        assert.equals('50%', vitalityRingView(60, 120).text);
        const bad = vitalityRingView(Number.NaN, 100);
        assert.equals(0, bad.ratio);
        assert.equals('0%', bad.text);
        assert.equals('exhausted', bad.band);
        assert.equals(0, vitalityRingView(50, 0).ratio);
    });

    return suite;
}
