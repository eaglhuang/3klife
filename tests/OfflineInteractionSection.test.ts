// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §H UI_OFFLINE_INTERACTION_TITLE；PROG-2-1856
import { readFileSync } from 'fs';
import { join } from 'path';
import { TestSuite, assert } from './TestRunner';
import { JournalHubController, OFFLINE_INTERACTION_MAX_LINES } from '../assets/scripts/ui/core/JournalHubController';

function hub(lines?: string[]) {
    return new JournalHubController({ morningLines: () => [], dispatchRows: () => [], offlineInteractionLines: lines ? () => lines : undefined });
}

export function createOfflineInteractionSectionSuite(): TestSuite {
    const suite = new TestSuite('OfflineInteractionSection');

    suite.test('有互動時顯示「離線互動」標題與最多兩行', () => {
        const view = hub(['甲與乙對飲', '丙與丁比武', '戊與己吟詩']).getFlowView();
        assert.equals('離線互動', view.texts.offlineInteractionTitle);
        assert.isTrue(view.actives.offlineInteractionTitle);
        assert.equals('甲與乙對飲', view.texts.offlineInteractionLine0);
        assert.equals('丙與丁比武', view.texts.offlineInteractionLine1);
        assert.equals(2, OFFLINE_INTERACTION_MAX_LINES);
    });

    suite.test('只有一則時第二行隱藏；沒有互動或沒接資料時整區隱藏', () => {
        const one = hub(['甲與乙對飲']).getFlowView();
        assert.isTrue(one.actives.offlineInteractionLine0);
        assert.isFalse(one.actives.offlineInteractionLine1);
        for (const view of [hub([]).getFlowView(), hub().getFlowView()]) {
            assert.isFalse(view.actives.offlineInteractionTitle);
            assert.isFalse(view.actives.offlineInteractionLine0);
        }
    });

    suite.test('版面有對應節點，放在晨報之後、派遣標題之前', () => {
        const layout = JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/ui-spec/layouts/journal-hub-main.json'), 'utf8'));
        const ids: string[] = layout.root.children[0].children.map((c: { id: string }) => c.id);
        const title = ids.indexOf('offlineInteractionTitle');
        assert.isTrue(title > ids.indexOf('morningLine2'));
        assert.equals(title + 1, ids.indexOf('offlineInteractionLine0'));
        assert.equals(title + 3, ids.indexOf('dispatchTitle'));
    });

    return suite;
}
