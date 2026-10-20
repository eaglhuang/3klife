/**
 * BloodlineBeast.test.ts — 命紋靈獸資料與覺醒傾向（GDUI-09 / PROG-2-0716）headless 測試
 *
 * Unity 對照：像 EditMode 測試，驗靈獸表的欄位規則與傾向比對。
 */
import { assert, TestSuite } from './TestRunner';
import { beastTendencyMatches, BEAST_ARCHETYPE_LABELS, validateBloodlineBeast, type BloodlineBeastDefinition } from '../assets/scripts/core/systems/BloodlineBeast';

const sample: BloodlineBeastDefinition = {
    id: 'TEST_BEAST_01',
    name: '測試靈獸',
    archetype: 'DRAGON',
    personaTags: ['果決', '好勝'],
    awakeningTendency: ['BATTLE_WIN'],
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
    });

    suite.test('傾向比對：事蹟類型在傾向清單內才符合', () => {
        assert.isTrue(beastTendencyMatches(sample, 'BATTLE_WIN'));
        assert.isFalse(beastTendencyMatches(sample, 'TRADE'));
    });

    return suite;
}
