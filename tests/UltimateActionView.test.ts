/**
 * UltimateActionView.test.ts — 五階血脈傳承奧義操作區（PROG-2-0720）headless 測試
 *
 * 鎖住：可點亮時按鈕開放並標示第幾階；條件不足或已滿時按鈕鎖定並給原因；
 * 升星按鈕在來源未定前永遠鎖定。
 */
import { assert, TestSuite } from './TestRunner';
import { ultimateActionView, RAISE_LOCKED_TEXT } from '../assets/scripts/ui/core/UltimateActionView';

const enough = { fame: 1500, incidents: 3, epicIncidents: 1 };

export function createUltimateActionViewSuite(): TestSuite {
    const suite = new TestSuite('UltimateActionView (五階奧義操作區 PROG-2-0720)');

    suite.test('上限足夠且名聲事蹟達標時，點亮按鈕可按並標示下一階', () => {
        const view = ultimateActionView({ stageCap: 3, stageCurrent: 1 }, { fame: 100, incidents: 1, epicIncidents: 0 });
        assert.isTrue(view.awakenEnabled);
        assert.equals('點亮第 2 階', view.awakenLabel);
        assert.equals('血脈傳承奧義：已點亮 1 / 5 階（上限 3），下一階可點亮', view.summary);
    });

    suite.test('上限未升星時點亮按鈕鎖定，原因為需先升星', () => {
        const view = ultimateActionView({ stageCap: 1, stageCurrent: 1 }, enough);
        assert.isFalse(view.awakenEnabled);
        assert.equals('條件未達成', view.awakenLabel);
        assert.isTrue(view.summary.endsWith('需先升星提高上限'));
    });

    suite.test('名聲不足時鎖定並顯示名聲不足', () => {
        const view = ultimateActionView({ stageCap: 5, stageCurrent: 1 }, { fame: 99, incidents: 9, epicIncidents: 9 });
        assert.isFalse(view.awakenEnabled);
        assert.isTrue(view.summary.endsWith('名聲不足'));
    });

    suite.test('全部點亮後按鈕顯示已全部點亮', () => {
        const view = ultimateActionView({ stageCap: 5, stageCurrent: 5 }, enough);
        assert.isFalse(view.awakenEnabled);
        assert.equals('已全部點亮', view.awakenLabel);
    });

    suite.test('升星按鈕在來源未定前永遠鎖定', () => {
        const views = [
            ultimateActionView(undefined, { fame: 0, incidents: 0, epicIncidents: 0 }),
            ultimateActionView({ stageCap: 5, stageCurrent: 1 }, enough),
            ultimateActionView({ stageCap: 5, stageCurrent: 5 }, enough),
        ];
        for (const view of views) {
            assert.isFalse(view.raiseEnabled);
            assert.equals(RAISE_LOCKED_TEXT, view.raiseLabel);
        }
    });

    suite.test('缺欄位的舊武將視為初始狀態（已點亮 1、上限 1）', () => {
        const view = ultimateActionView(undefined, { fame: 0, incidents: 0, epicIncidents: 0 });
        assert.isTrue(view.summary.startsWith('血脈傳承奧義：已點亮 1 / 5 階（上限 1）'));
        assert.isFalse(view.awakenEnabled);
    });

    return suite;
}
