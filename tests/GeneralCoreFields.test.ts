/**
 * GeneralCoreFields.test.ts — 武將 25 核心欄位覆蓋檢查（GDP-05 第一片，PROG-2-1271）headless 測試
 *
 * 鎖住：核心欄位共 25 個；缺欄、null、空字串、"???"、空陣列都算缺；完整武將回傳空陣列；
 * 覆蓋統計正確計算完整人數與每欄缺數。
 */
import { assert, TestSuite } from './TestRunner';
import { GENERAL_CORE_FIELDS, missingCoreFields, coreFieldCoverage } from '../assets/scripts/core/systems/GeneralCoreFields';

function fullGeneral(): Record<string, unknown> {
    const general: Record<string, unknown> = {};
    for (const field of GENERAL_CORE_FIELDS) general[field] = 'x';
    general.genes = [{ id: 'gene_a' }];
    general.storyStripCells = ['a', 'b', 'c', 'd', 'e', 'f'];
    general.str = 80;
    general.luk = 0;
    return general;
}

export function createGeneralCoreFieldsSuite(): TestSuite {
    const suite = new TestSuite('GeneralCoreFields (武將 25 核心欄位 GDP-05 PROG-2-1271)');

    suite.test('核心欄位共 25 個', () => {
        assert.equals(25, GENERAL_CORE_FIELDS.length);
    });

    suite.test('完整武將沒有缺欄；數值 0 不算缺', () => {
        assert.equals('', missingCoreFields(fullGeneral()).join(','));
    });

    suite.test('缺欄、null、空字串、??? 與空陣列都判為缺', () => {
        const general = fullGeneral();
        delete general.title;
        general.skillId = null;
        general.name = '  ';
        general.historicalAnecdote = '???';
        general.genes = [];
        assert.equals('name,title,historicalAnecdote,genes,skillId', missingCoreFields(general).join(','));
    });

    suite.test('覆蓋統計計算完整人數與每欄缺數', () => {
        const incomplete = fullGeneral();
        incomplete.genes = [];
        incomplete.skillId = '';
        const coverage = coreFieldCoverage([fullGeneral(), incomplete, incomplete]);
        assert.equals(3, coverage.total);
        assert.equals(1, coverage.complete);
        assert.equals(2, coverage.missingByField.genes);
        assert.equals(2, coverage.missingByField.skillId);
        assert.isTrue(coverage.missingByField.title === undefined);
    });

    return suite;
}
