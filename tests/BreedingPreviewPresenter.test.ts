/**
 * BreedingPreviewPresenter — 結緣介面 EP 預覽文字（FEM-09，PROG-2-0567）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import type { EpBreakdown } from '../assets/scripts/core/systems/BreedingSystem';
import { buildBreedingPreviewLines } from '../assets/scripts/ui/core/BreedingPreviewPresenter';

function ep(over: Partial<EpBreakdown> = {}): EpBreakdown {
    return {
        ep: 128, resonance: 20, outcross: 8, affinity: 10, fate: 0,
        topTag: '勇', topTagCount: 4, rating: '優良',
        ...over,
    };
}

export function createBreedingPreviewPresenterSuite(): TestSuite {
    const suite = new TestSuite('BreedingPreviewPresenter (結緣 EP 預覽文字 FEM-09)');

    suite.test('EP 行含數值與評級', () => {
        const lines = buildBreedingPreviewLines(ep());
        assert.equals('預計爆發力 EP 128 · 優良', lines.epLine);
    });

    suite.test('拆解行列出共鳴、異脈、契合，天命為 0 時不顯示', () => {
        const lines = buildBreedingPreviewLines(ep());
        assert.equals('共鳴 +20　異脈 +8　契合 +10', lines.breakdownLine);
    });

    suite.test('天命不為 0 時附加天命行，負值保留負號', () => {
        const lines = buildBreedingPreviewLines(ep({ fate: -6 }));
        assert.equals('共鳴 +20　異脈 +8　契合 +10　天命 -6', lines.breakdownLine);
    });

    suite.test('有共鳴標籤時顯示標籤與次數，沒有時顯示無共鳴標籤', () => {
        assert.equals('最多共鳴標籤：勇 ×4', buildBreedingPreviewLines(ep()).tagLine);
        assert.equals('無共鳴標籤', buildBreedingPreviewLines(ep({ topTag: null, topTagCount: 0 })).tagLine);
    });

    return suite;
}
