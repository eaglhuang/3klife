/**
 * 同名武將版本表（SAME-01 / PROG-2-0422）
 *
 * 範例取自《同名武將系統》I 節的 Client 範例（Zhao_Yun_V3_Holy）與同血源的基礎版本。
 * 正式趙雲版本資料屬企劃內容，本測試以規格範例驗證載入與查詢規則。
 */
import { assert, TestSuite } from './TestRunner';
import { validateGeneralVersions, versionsOfBloodline, parseInitialGenes, type GeneralVersionRecord } from '../assets/scripts/core/models/GeneralVersion';

const ZHAO_BASE: GeneralVersionRecord = {
    Template_ID: 'Zhao_Yun_V1',
    Bloodline_ID: 'BL_ZhaoYun',
    Display_Name: '趙雲',
    Version_Title: '常山之龍',
    Initial_Genes_JSON: '[{"Type":"Red","ID":"RED_STR_01","Level":2}]',
    Release_Date: '2026-01-01',
    Is_Limited: false,
};
const ZHAO_HOLY: GeneralVersionRecord = {
    Template_ID: 'Zhao_Yun_V3_Holy',
    Bloodline_ID: 'BL_ZhaoYun',
    Display_Name: '神聖趙雲',
    Version_Title: '聖光降臨',
    Initial_Genes_JSON: '[{"Type":"White","ID":"WHITE_HOLY_01","Level":5}]',
    Release_Date: '2026-06-01',
    Is_Limited: true,
};
const OTHER: GeneralVersionRecord = { Template_ID: 'Cao_Cao_V1', Bloodline_ID: 'BL_CaoCao' };

export function createGeneralVersionSuite(): TestSuite {
    const suite = new TestSuite('GeneralVersion (同名武將版本表 SAME-01)');

    suite.test('趙雲兩個版本通過驗證，且同血源查得兩筆、依上架日排序', () => {
        const list = [ZHAO_HOLY, ZHAO_BASE, OTHER];
        assert.equals(0, validateGeneralVersions(list).length, validateGeneralVersions(list).join('\n'));
        const zhao = versionsOfBloodline(list, 'BL_ZhaoYun');
        assert.equals(2, zhao.length);
        assert.equals('Zhao_Yun_V1', zhao[0].Template_ID);
        assert.equals('Zhao_Yun_V3_Holy', zhao[1].Template_ID);
    });

    suite.test('Template_ID 格式：{Name}_V{n} 與後綴通過；缺版本號或舊式 GEN_ 格式違規', () => {
        assert.equals(0, validateGeneralVersions([{ Template_ID: 'Zhao_Yun_V2', Bloodline_ID: 'BL_ZhaoYun' }]).length);
        const errs = validateGeneralVersions([{ Template_ID: 'GEN_WEI_CAO_CAO', Bloodline_ID: 'BL_CaoCao' }]);
        assert.equals(1, errs.length);
        assert.isTrue(errs[0].includes('Template_ID'));
    });

    suite.test('重複 Template_ID、Bloodline_ID 格式錯、日期格式錯都會回報', () => {
        const errs = validateGeneralVersions([
            { ...ZHAO_BASE },
            { ...ZHAO_BASE },
            { Template_ID: 'Lu_Bu_V1', Bloodline_ID: 'LuBu', Release_Date: '2026/1/1' },
        ]);
        assert.isTrue(errs.some(e => e.includes('重複')));
        assert.isTrue(errs.some(e => e.includes('Bloodline_ID')));
        assert.isTrue(errs.some(e => e.includes('Release_Date')));
    });

    suite.test('Initial_Genes_JSON：合法陣列可解析；非陣列或壞 JSON 回報錯誤', () => {
        const genes = parseInitialGenes(ZHAO_HOLY);
        assert.equals('WHITE_HOLY_01', (genes![0] as { ID: string }).ID);
        assert.equals(0, parseInitialGenes({ Template_ID: 'X_V1', Bloodline_ID: 'BL_X' })!.length);
        assert.isTrue(parseInitialGenes({ Template_ID: 'X_V1', Bloodline_ID: 'BL_X', Initial_Genes_JSON: '{"a":1}' }) === null);
        assert.isTrue(parseInitialGenes({ Template_ID: 'X_V1', Bloodline_ID: 'BL_X', Initial_Genes_JSON: '[' }) === null);
    });

    return suite;
}
