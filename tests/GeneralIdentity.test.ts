/**
 * GeneralIdentity — 同名武將複合身分鍵（doc_spec_0337；PROG-2-2022）
 */
import { assert, TestSuite } from './TestRunner';
import {
    findDuplicateTemplatesInLineup, getGeneralCompositeKey, getTitleI18nKey, parseGeneralCompositeKey,
} from '../assets/scripts/core/models/GeneralIdentity';

export function createGeneralIdentitySuite(): TestSuite {
    const suite = new TestSuite('GeneralIdentity (同名辨識複合鍵 doc_spec_0337 PROG-2-2022)');

    suite.test('§2.1 複合鍵組合與拆解', () => {
        assert.equals('zhuge_liang#wolong', getGeneralCompositeKey('zhuge_liang', 'wolong'));
        assert.equals('zhuge_liang', getGeneralCompositeKey('zhuge_liang', '  '));
        assert.equals('zhuge_liang', getGeneralCompositeKey('zhuge_liang'));
        const p = parseGeneralCompositeKey('lu_meng#baiyi');
        assert.equals('lu_meng', p.templateId);
        assert.equals('baiyi', p.titleTag!);
        assert.equals(undefined, parseGeneralCompositeKey('lu_meng').titleTag);
    });

    suite.test('§4.1 稱號字典鍵', () => {
        assert.equals('TITLE_ZHUGE_LIANG_WOLONG', getTitleI18nKey('zhuge_liang', 'wolong'));
        assert.equals('TITLE_GUAN_YU_MEIRAN', getTitleI18nKey('guan-yu', 'meiran'));
    });

    suite.test('§2.1 同模板不論稱號同隊只能一人', () => {
        assert.equals('zhuge_liang', findDuplicateTemplatesInLineup(['zhuge_liang#wolong', 'guan_yu', 'zhuge_liang#gonggeng']).join(','));
        assert.equals(0, findDuplicateTemplatesInLineup(['zhuge_liang#wolong', 'lu_meng#baiyi']).length);
    });

    return suite;
}
