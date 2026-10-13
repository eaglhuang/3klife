import { assert, TestSuite } from './TestRunner';
import { buildDomesticRows } from '../assets/scripts/core/systems/DomesticPresenter';
import { EMPTY_DOMESTIC_LOG } from '../assets/scripts/core/systems/DomesticTasks';

export function createDomesticPresenterSuite(): TestSuite {
    const suite = new TestSuite('DomesticPresenter (MVP-10 內政面板資料)');

    suite.test('每季開始時 5 列都可選，沒有已選項', () => {
        const rows = buildDomesticRows(EMPTY_DOMESTIC_LOG, 1);
        assert.equals(5, rows.length);
        assert.isTrue(rows.every(r => r.canChoose));
        assert.isTrue(rows.every(r => !r.chosenThisSeason));
    });

    suite.test('列文字含資源名與產出量', () => {
        const rows = buildDomesticRows(EMPTY_DOMESTIC_LOG, 1);
        assert.equals('農耕', rows[0].label);
        assert.equals('糧草 +120', rows[0].outputText);
        assert.equals('偵查', rows[4].label);
        assert.equals('黃金 +30', rows[4].outputText);
    });

    suite.test('本季已選一項後，全部關閉，並標記那一項', () => {
        const rows = buildDomesticRows({ lastSeason: 3, lastTask: 'commerce' }, 3);
        assert.isTrue(rows.every(r => !r.canChoose));
        assert.isTrue(rows[1].chosenThisSeason);
        assert.isFalse(rows[0].chosenThisSeason);
    });

    suite.test('換季後恢復可選，舊的已選紀錄不再標記', () => {
        const rows = buildDomesticRows({ lastSeason: 3, lastTask: 'commerce' }, 4);
        assert.isTrue(rows.every(r => r.canChoose));
        assert.isTrue(rows.every(r => !r.chosenThisSeason));
    });

    return suite;
}
