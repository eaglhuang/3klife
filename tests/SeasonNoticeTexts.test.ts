/**
 * SeasonNoticeTexts — 實機巡檢修正（PROG-2-2102）：同一佔位重複、屆齡榮退通知、年報標題。
 */
import { assert, TestSuite } from './TestRunner';
import { fillI18nArgs } from '../assets/scripts/core/systems/I18nSystem';
import { buildYearReportTexts, withYearReportFallback } from '../assets/scripts/core/systems/YearReport';
import { spiritCardNoticeSpec } from '../assets/scripts/core/systems/SpiritCardDeathSettlement';
import { formatTallyLine } from '../assets/scripts/core/systems/TallyLineSpec';
import { formatForcedRetirementNotice } from '../assets/scripts/ui/core/LifeVitalityPresenter';

export function createSeasonNoticeTextsSuite(): TestSuite {
    const suite = new TestSuite('SeasonNoticeTexts');

    suite.test('i18n：同一佔位出現兩次都會替換', () => {
        assert.equals('張飛 留下【英靈卡：張飛】', fillI18nArgs('{0} 留下【英靈卡：{0}】', ['張飛']));
    });

    suite.test('i18n：多個佔位各自替換，沒給參數的保留原樣', () => {
        assert.equals('a-b-{2}', fillI18nArgs('{0}-{1}-{2}', ['a', 'b']));
    });

    suite.test('i18n：參數含特殊字元或佔位時不再被展開', () => {
        assert.equals('$& {1}', fillI18nArgs('{0} {1}', ['$&', '{1}']));
        assert.equals('{1} x', fillI18nArgs('{0} {1}', ['{1}', 'x']));
    });

    suite.test('英靈卡提示走 i18n 同模板時名字兩處都帶入', () => {
        const translate = (key: string, ...args: string[]) => fillI18nArgs('{0} 英魂不散，留下了【英靈卡：{0}】', args) + (key ? '' : '');
        const text = formatTallyLine(spiritCardNoticeSpec('張飛', false), translate);
        assert.equals(false, text.includes('{0}'));
    });

    suite.test('屆齡榮退：列出所有姓名', () => {
        assert.equals('張飛、關羽 屆齡榮退，轉任教官', formatForcedRetirementNotice(['張飛', '關羽']));
    });

    suite.test('年報：標題帶年份，年份欄不重複顯示', () => {
        const texts = buildYearReportTexts(
            { year: 3, seasons: 4, deaths: 0, retirementCandidates: 0 },
            withYearReportFallback((key) => key),
        );
        assert.equals('第 3 年總結', texts.yearReportTitle);
        assert.equals('', texts.yearReportYear);
    });

    return suite;
}
