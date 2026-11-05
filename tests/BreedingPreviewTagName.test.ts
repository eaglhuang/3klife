import { TestSuite, assert } from './TestRunner';
import type { EpBreakdown } from '../assets/scripts/core/systems/BreedingSystem';
import { buildBreedingPreviewLines } from '../assets/scripts/ui/core/BreedingPreviewPresenter';

const ep = (topTag: string | null) => ({ ep: 80, rating: '良', resonance: 0, outcross: 0, affinity: 0, vitalityFull: 0, fate: 0, topTag, topTagCount: 7 }) as unknown as EpBreakdown;

export function createBreedingPreviewTagNameSuite(): TestSuite {
    const suite = new TestSuite('BreedingPreviewTagName');

    suite.test('有名稱就顯示名稱，查不到或沒給查詢都顯示原值，沒有標籤另有句子', () => {
        const nameOf = (tag: string) => (tag === 'gene_luck' ? '福運' : undefined);
        assert.equals('最多共鳴標籤：福運 ×7', buildBreedingPreviewLines(ep('gene_luck'), nameOf).tagLine);
        assert.equals('最多共鳴標籤：勇 ×7', buildBreedingPreviewLines(ep('勇'), nameOf).tagLine);
        assert.equals('最多共鳴標籤：gene_luck ×7', buildBreedingPreviewLines(ep('gene_luck')).tagLine);
        assert.equals('無共鳴標籤', buildBreedingPreviewLines(ep(null), nameOf).tagLine);
    });

    return suite;
}
