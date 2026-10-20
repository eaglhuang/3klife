/**
 * 血脈歸宗的因子移植（BLT-11，PROG-2-0442）
 *
 * 鎖住：V1 取得 V2 的一個 V1 沒有的因子；V2 標記已歸宗且不消失；已歸宗因子不重複移植；
 * 沒有可移植因子時回傳 null。歸宗令扣除與名門加成不在本卡範圍。
 */
import { assert, TestSuite } from './TestRunner';
import { mergeBloodline } from '../assets/scripts/core/systems/BloodlineMerge';

export function createBloodlineMergeSuite(): TestSuite {
    const suite = new TestSuite('BloodlineMerge (血脈歸宗因子移植 BLT-11)');

    suite.test('移植：V1 取得 V2 第一個 V1 沒有的因子，V2 標記已歸宗', () => {
        const result = mergeBloodline(
            { factors: ['f_a'], mergedOut: [] },
            { factors: ['f_a', 'f_b', 'f_c'], mergedOut: [] },
        );
        assert.isTrue(result !== null);
        assert.equals('f_b', result!.transferredFactor);
        assert.equals('f_a,f_b', result!.v1Factors.join(','));
        assert.equals('f_b', result!.v2MergedOut.join(','));
    });

    suite.test('V2 不因歸宗而消失：原清單保留，輸入不被修改', () => {
        const v2 = { factors: ['f_b'], mergedOut: [] as string[] };
        const result = mergeBloodline({ factors: [], mergedOut: [] }, v2);
        assert.equals('f_b', result!.transferredFactor);
        assert.equals(1, v2.factors.length);
        assert.equals(0, v2.mergedOut.length);
    });

    suite.test('已歸宗的因子不再移植給同一方，改取下一個', () => {
        const result = mergeBloodline(
            { factors: [], mergedOut: [] },
            { factors: ['f_b', 'f_c'], mergedOut: ['f_b'] },
        );
        assert.equals('f_c', result!.transferredFactor);
    });

    suite.test('沒有可移植因子（V1 已擁有全部或 V2 全部已歸宗）時回傳 null', () => {
        assert.isTrue(mergeBloodline({ factors: ['f_b'], mergedOut: [] }, { factors: ['f_b'], mergedOut: [] }) === null);
        assert.isTrue(mergeBloodline({ factors: [], mergedOut: [] }, { factors: ['f_b'], mergedOut: ['f_b'] }) === null);
        assert.isTrue(mergeBloodline({ factors: [], mergedOut: [] }, { factors: [], mergedOut: [] }) === null);
    });

    return suite;
}
