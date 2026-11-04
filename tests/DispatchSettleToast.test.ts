// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §H 派遣完成／評級字串；PROG-2-1742
import { TestSuite, assert } from './TestRunner';
import { dispatchSettleToast } from '../assets/scripts/core/systems/DispatchCatalog';

export function createDispatchSettleToastSuite(): TestSuite {
    const suite = new TestSuite('DispatchSettleToast');
    const nameOf = (id: string) => ({ g1: '張飛', g2: '趙雲' } as Record<string, string>)[id] ?? id;

    suite.test('單項：武將名與評級', () => {
        assert.equals('張飛 已完成派遣，派遣評級：良好。', dispatchSettleToast([{ generalId: 'g1', quality: 'GOOD' }], nameOf));
    });

    suite.test('多項：列第一項並附另 N 項；空清單回空字串', () => {
        const text = dispatchSettleToast([{ generalId: 'g2', quality: 'EXCELLENT' }, { generalId: 'g1', quality: 'POOR' }], nameOf);
        assert.equals('趙雲 已完成派遣，派遣評級：極佳（另 1 項完成），獎勵已入帳。', text);
        assert.equals('', dispatchSettleToast([], nameOf));
    });

    return suite;
}
