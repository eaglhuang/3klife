/**
 * UltimateStageSummary.test.ts — 五階奧義摘要文字（PROG-2-0740）headless 測試
 *
 * 鎖住：初始狀態顯示 1/5 與名聲不足；名聲與事蹟達標時顯示可點亮；全部點亮時顯示已全部點亮。
 */
import { TestSuite, assert } from './TestRunner';
import { ultimateStageSummary } from '../assets/scripts/ui/core/UltimateStageSummary';

export function createUltimateStageSummarySuite(): TestSuite {
    const suite = new TestSuite('UltimateStageSummary (五階奧義摘要 PROG-2-0740)');

    suite.test('缺欄位時顯示初始 1/5，下一階卡在上限', () => {
        const text = ultimateStageSummary(undefined, { fame: 0, incidents: 0, epicIncidents: 0 });
        assert.equals('血脈傳承奧義：已點亮 1 / 5 階（上限 1），需先升星提高上限', text);
    });

    suite.test('上限足夠、名聲不足時顯示名聲不足', () => {
        const text = ultimateStageSummary({ stageCap: 3, stageCurrent: 1 }, { fame: 0, incidents: 0, epicIncidents: 0 });
        assert.equals('血脈傳承奧義：已點亮 1 / 5 階（上限 3），名聲不足', text);
    });

    suite.test('條件達標時顯示下一階可點亮；全部點亮時顯示已全部點亮', () => {
        const ready = ultimateStageSummary({ stageCap: 3, stageCurrent: 1 }, { fame: 100, incidents: 1, epicIncidents: 0 });
        assert.equals('血脈傳承奧義：已點亮 1 / 5 階（上限 3），下一階可點亮', ready);
        const full = ultimateStageSummary({ stageCap: 5, stageCurrent: 5 }, { fame: 9999, incidents: 9, epicIncidents: 9 });
        assert.equals('血脈傳承奧義：已點亮 5 / 5 階（上限 5），已全部點亮', full);
    });

    return suite;
}
