/**
 * BloodlineBeast.test.ts — 命紋靈獸資料與覺醒傾向（GDUI-09 / PROG-2-0716）headless 測試
 *
 * Unity 對照：像 EditMode 測試，驗靈獸表的欄位規則與傾向比對。
 */
import { assert, TestSuite } from './TestRunner';
import { beastForGeneral, beastTendencyMatches, BEAST_ARCHETYPE_LABELS, formatBeastSummary, PROVISIONAL_BEAST_CATALOG, validateBloodlineBeast, type BloodlineBeastDefinition } from '../assets/scripts/core/systems/BloodlineBeast';

const sample: BloodlineBeastDefinition = {
    id: 'TEST_BEAST_01',
    name: '測試靈獸',
    archetype: 'DRAGON',
    personaTags: ['果決', '好勝'],
    awakeningTendency: ['BATTLE_WIN'],
    awakeningHint: '連勝',
    ultimateBias: '全軍領導',
};

export function createBloodlineBeastSuite(): TestSuite {
    const suite = new TestSuite('BloodlineBeast (命紋靈獸資料與覺醒傾向 GDUI-09)');

    suite.test('六種原型與規格名稱對應', () => {
        assert.equals('龍', BEAST_ARCHETYPE_LABELS.DRAGON);
        assert.equals('玄龜', BEAST_ARCHETYPE_LABELS.TORTOISE);
        assert.equals('麒麟', BEAST_ARCHETYPE_LABELS.QILIN);
    });

    suite.test('合法靈獸通過驗證', () => {
        assert.equals(0, validateBloodlineBeast(sample).length);
    });

    suite.test('驗證：原型不合法、標籤數量不在 2~3、標籤重複、傾向為空都會被擋', () => {
        assert.isTrue(validateBloodlineBeast({ ...sample, archetype: 'PHOENIX' as never }).length > 0);
        assert.isTrue(validateBloodlineBeast({ ...sample, personaTags: ['只有一個'] }).length > 0);
        assert.isTrue(validateBloodlineBeast({ ...sample, personaTags: ['a', 'b', 'c', 'd'] }).length > 0);
        assert.isTrue(validateBloodlineBeast({ ...sample, personaTags: ['同名', '同名'] }).length > 0);
        assert.isTrue(validateBloodlineBeast({ ...sample, awakeningTendency: [] }).length > 0);
        assert.isTrue(validateBloodlineBeast({ ...sample, awakeningHint: '' }).length > 0);
        assert.isTrue(validateBloodlineBeast({ ...sample, ultimateBias: '' }).length > 0);
    });

    suite.test('靈獸清單的人格標籤與覺醒傾向說明與血統理論系統 §M 靈獸原型建議表一致', () => {
        const byArchetype = Object.fromEntries(PROVISIONAL_BEAST_CATALOG.map((b) => [b.archetype, b]));
        assert.equals('統御、果決、昂揚', byArchetype.DRAGON.personaTags.join('、'));
        assert.equals('守城、護軍、長線續戰', byArchetype.TORTOISE.awakeningHint);
        assert.equals('救援、援護、民望威望', byArchetype.QILIN.awakeningHint);
        assert.equals('位移切入、追獵、破綻擴大', byArchetype.WOLF.ultimateBias);
    });

    suite.test('傾向比對：事蹟類型在傾向清單內才符合', () => {
        assert.isTrue(beastTendencyMatches(sample, 'BATTLE_WIN'));
        assert.isFalse(beastTendencyMatches(sample, 'TRADE'));
    });

    suite.test('暫定靈獸清單：六種原型各一筆、每筆通過驗證、名稱為原型名', () => {
        assert.equals(6, PROVISIONAL_BEAST_CATALOG.length);
        assert.equals(6, new Set(PROVISIONAL_BEAST_CATALOG.map((b) => b.archetype)).size);
        assert.isTrue(PROVISIONAL_BEAST_CATALOG.every((b) => validateBloodlineBeast(b).length === 0));
        assert.equals(BEAST_ARCHETYPE_LABELS[PROVISIONAL_BEAST_CATALOG[0].archetype], PROVISIONAL_BEAST_CATALOG[0].name);
    });

    suite.test('暫定綁定：同一武將 id 每次得到同一靈獸；摘要含名稱、人格與傾向', () => {
        assert.equals(beastForGeneral('ZHAO_YUN').id, beastForGeneral('ZHAO_YUN').id);
        const summary = formatBeastSummary(PROVISIONAL_BEAST_CATALOG[0]);
        assert.isTrue(summary.includes('龍'));
        assert.isTrue(summary.includes('統御'));
        assert.isTrue(summary.includes('連勝、先鋒破陣、統軍成勢'));
        assert.isTrue(summary.includes('全軍領導、開場氣勢、軍勢壓制'));
    });

    return suite;
}
