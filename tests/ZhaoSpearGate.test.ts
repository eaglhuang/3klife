/**
 * ZhaoSpearGate — 趙家槍法血統限制與戰報（doc_spec_0361；PROG-2-2047）
 */
import { assert, TestSuite } from './TestRunner';
import { canInheritZhaoSpear, checkZhaoSpearEquip, formatZhaoSpearLog } from '../assets/scripts/core/systems/ZhaoSpearGate';

export function createZhaoSpearGateSuite(): TestSuite {
    const suite = new TestSuite('ZhaoSpearGate (趙家槍法 doc_spec_0361 PROG-2-2047)');

    suite.test('§4-1 血脈標籤或祖先含趙雲可裝備，否則灰化提示', () => {
        assert.isTrue(checkZhaoSpearEquip({ bloodlineTags: ['BLOOD_ZHAO'] }).allowed);
        assert.isTrue(checkZhaoSpearEquip({ ancestorIds: ['ma-yunlu', 'zhao-yun'] }).allowed);
        const denied = checkZhaoSpearEquip({ bloodlineTags: ['BLOOD_MA'] });
        assert.isFalse(denied.allowed);
        assert.equals('非趙氏血脈不可修行此槍法', denied.allowed ? '' : denied.hint);
    });

    suite.test('§4-2 趙雲教官只傳趙氏子嗣', () => {
        assert.isTrue(canInheritZhaoSpear('zhao-yun', { ancestorIds: ['zhao-yun'] }));
        assert.isFalse(canInheritZhaoSpear('zhao-yun', {}));
        assert.isFalse(canInheritZhaoSpear('guan-yu', { bloodlineTags: ['BLOOD_ZHAO'] }));
    });

    suite.test('§5 三刺戰報與合計', () => {
        const log = formatZhaoSpearLog([100, 120, 140]);
        assert.equals('趙家槍法連環三刺，造成 100 / 120 / 140 點貫穿傷害！', log.text);
        assert.equals(360, log.total);
    });

    return suite;
}
