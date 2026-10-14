import { assert, TestSuite } from './TestRunner';
import {
    DISPATCH_MAX_ROWS,
    JournalHubController,
    JournalHubDeps,
    MORNING_MAX_LINES,
} from '../assets/scripts/ui/core/JournalHubController';

function makeDeps(overrides: Partial<JournalHubDeps> = {}): JournalHubDeps {
    return {
        morningLines: () => ['昨夜軍營操練', '糧草入庫 120'],
        dispatchRows: () => [{ id: 'd1', title: '護送糧草', scoreText: '品質 B' }],
        ...overrides,
    };
}

export function createJournalHubControllerSuite(): TestSuite {
    const suite = new TestSuite('JournalHubController (JRN-06 大廳晨報與派遣板)');

    suite.test('有晨報與派遣資料時顯示內容，空狀態隱藏', () => {
        const view = new JournalHubController(makeDeps()).getFlowView();
        assert.equals('昨夜軍營操練', view.texts.morningLine0);
        assert.isTrue(view.actives.morningLine1);
        assert.isFalse(view.actives.morningLine2);
        assert.isFalse(view.actives.morningEmptyLabel);
        assert.equals('護送糧草', view.texts.dispatchRow0Name);
        assert.equals('品質 B', view.texts.dispatchRow0Score);
        assert.isFalse(view.actives.dispatchEmptyLabel);
    });

    suite.test('晨報與派遣資料都為空時顯示空狀態字串', () => {
        const view = new JournalHubController(makeDeps({ morningLines: () => [], dispatchRows: () => [] })).getFlowView();
        assert.equals('今日尚無晨報', view.texts.morningEmptyLabel);
        assert.equals('目前沒有可派遣的任務', view.texts.dispatchEmptyLabel);
        assert.isTrue(view.actives.morningEmptyLabel);
        assert.isTrue(view.actives.dispatchEmptyLabel);
        assert.isFalse(view.actives.morningLine0);
        assert.isFalse(view.actives.dispatchRow0);
    });

    suite.test('晨報超過 3 則時只取前 3 則（規格 2~3 則）', () => {
        const controller = new JournalHubController(makeDeps({
            morningLines: () => ['a', 'b', 'c', 'd', 'e'],
        }));
        assert.equals(MORNING_MAX_LINES, controller.morningLines().length);
        assert.equals('c', controller.getFlowView().texts.morningLine2);
    });

    suite.test('派遣板超過上限時只顯示前 4 列', () => {
        const rows = Array.from({ length: 7 }, (_, i) => ({ id: `d${i}`, title: `任務${i}`, scoreText: 'C' }));
        const controller = new JournalHubController(makeDeps({ dispatchRows: () => rows }));
        assert.equals(DISPATCH_MAX_ROWS, controller.dispatchRows().length);
        assert.isFalse(controller.getFlowView().actives[`dispatchRow${DISPATCH_MAX_ROWS}`] ?? false);
    });

    suite.test('關閉鈕永遠可按', () => {
        assert.isTrue(new JournalHubController(makeDeps()).getFlowView().enabled.btnClose);
    });

    return suite;
}
