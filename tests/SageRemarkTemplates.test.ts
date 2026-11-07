/**
 * SageRemarkTemplates — 名士批語文案模板（ORAC-09；PROG-2-1936）
 */
import { assert, TestSuite } from './TestRunner';
import { renderSageRemarkText, SAGE_REMARK_TEMPLATES } from '../assets/scripts/core/systems/SageRemarkTemplates';
import { SAGES } from '../assets/scripts/core/systems/SageDivination';
import { ALL_FACTOR_COLORS } from '../assets/scripts/core/systems/FactorInheritance';

export function createSageRemarkTemplatesSuite(): TestSuite {
    const suite = new TestSuite('SageRemarkTemplates (名士批語 ORAC-09 PROG-2-1936)');

    suite.test('每位名士都有模板，每色系各一句且含關鍵詞句型都有 {keyword}', () => {
        for (const id of Object.keys(SAGES)) {
            const set = (SAGE_REMARK_TEMPLATES as Record<string, typeof SAGE_REMARK_TEMPLATES['zuo-ci']>)[id];
            assert.isTrue(!!set);
            for (const c of ALL_FACTOR_COLORS) {
                assert.isTrue(set.withKeyword[c].includes('{keyword}'));
                assert.isTrue(set.plain[c].length > 0 && !set.plain[c].includes('{keyword}'));
            }
        }
    });

    suite.test('有關鍵詞代入、無關鍵詞用一般句、未知名士回 null', () => {
        assert.equals('此子驍勇，萬人之敵也。', renderSageRemarkText('xu-shao', 'red', '驍勇'));
        assert.equals('月旦之評：此子勇力絕倫。', renderSageRemarkText('xu-shao', 'red', '  '));
        assert.equals('天機不可洩，不可洩。', renderSageRemarkText('zuo-ci', 'purple', null));
        assert.equals(null, renderSageRemarkText('nobody', 'blue', null));
    });

    return suite;
}
