/**
 * validate-id-contract.js 的格式規則（TERM-01 / PROG-2-0419）
 *
 * 規則來源：名詞定義文件「命名統一規則」。本測試只驗規則本身，不斷言現有資料的違規數。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { checkIdContract, PATTERNS } = require('../tools_node/validate-id-contract.js') as {
    checkIdContract: (generals: Array<Record<string, unknown>>) => Array<{ generalId: string; field: string; value: string }>;
    PATTERNS: Record<'templateId' | 'bloodlineId' | 'geneId', RegExp>;
};

export function createIdContractValidatorSuite(): TestSuite {
    const suite = new TestSuite('IdContractValidator (命名契約 TERM-01)');

    suite.test('Template_ID：{Name}_V{n} 通過；缺版本號或全大寫舊格式違規', () => {
        assert.isTrue(PATTERNS.templateId.test('Zhao_Yun_V2'));
        assert.isTrue(PATTERNS.templateId.test('ZhaoYun_V1'));
        assert.isFalse(PATTERNS.templateId.test('Zhao_Yun'));
        assert.isFalse(PATTERNS.templateId.test('GEN_WEI_CAO_CAO'));
    });

    suite.test('Bloodline_ID：BL_{Name} 通過；缺 BL_ 前綴違規', () => {
        assert.isTrue(PATTERNS.bloodlineId.test('BL_ZhaoYun'));
        assert.isTrue(PATTERNS.bloodlineId.test('BL_WEI_BAQUAN'));
        assert.isFalse(PATTERNS.bloodlineId.test('ZhaoYun'));
        assert.isFalse(PATTERNS.bloodlineId.test('BL_'));
    });

    suite.test('Gene_ID：{COLOR}_{ATTR}_{NN}（兩位數）通過；小寫或一位數違規', () => {
        assert.isTrue(PATTERNS.geneId.test('GREEN_DRAGON_04'));
        assert.isFalse(PATTERNS.geneId.test('gene_strategy'));
        assert.isFalse(PATTERNS.geneId.test('GREEN_DRAGON_4'));
    });

    suite.test('checkIdContract：只檢查存在的欄位，缺欄位不算違規，並回報武將與欄位', () => {
        const violations = checkIdContract([
            { id: 'a', templateId: 'Zhao_Yun_V2', bloodlineId: 'BL_ZhaoYun', genes: [{ id: 'GREEN_DRAGON_04' }] },
            { id: 'b', templateId: 'bad', bloodlineId: 'nope', genes: [{ id: 'x' }] },
            { id: 'c' },
        ]);
        assert.equals(3, violations.length);
        assert.equals('b', violations[0].generalId);
        assert.equals('templateId', violations[0].field);
        assert.equals('bloodlineId', violations[1].field);
        assert.equals('genes[].id', violations[2].field);
    });

    return suite;
}
