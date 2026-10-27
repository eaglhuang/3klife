/**
 * LimitedPoolSchedule.test.ts — 限定池上下架時間窗與本期限定角色（GCH-12，PROG-2-1072）
 *
 * 鎖住：時間窗為半開區間、無效時間窗不上架、未開放時拿不到本期角色（且回傳新陣列）、
 * 銅錢符不可用於限定池。
 *
 * Unity 對照：EditMode Test 驗證 ScheduledEvent 的 Active 區間邊界。
 */
import { assert, TestSuite } from './TestRunner';
import {
    featuredGeneralsOf,
    isLimitedPoolOpen,
    limitedPoolAcceptsCurrency,
    openLimitedPools,
    type LimitedPoolWindow,
} from '../assets/scripts/core/systems/LimitedPoolSchedule';

const WINDOW: LimitedPoolWindow = {
    poolId: 'limited-zhaoyun',
    startMs: 1000,
    endMs: 2000,
    featuredGeneralIds: ['zhao_yun'],
};

export function createLimitedPoolScheduleSuite(): TestSuite {
    const suite = new TestSuite('LimitedPoolSchedule (限定池排程 GCH-12)');

    suite.test('時間窗為半開區間：開始時刻上架，結束時刻下架', () => {
        assert.isFalse(isLimitedPoolOpen(WINDOW, 999));
        assert.isTrue(isLimitedPoolOpen(WINDOW, 1000));
        assert.isTrue(isLimitedPoolOpen(WINDOW, 1999));
        assert.isFalse(isLimitedPoolOpen(WINDOW, 2000));
    });

    suite.test('結束不晚於開始、或時間非有限數的時間窗不會上架', () => {
        assert.isFalse(isLimitedPoolOpen({ ...WINDOW, endMs: 1000 }, 1000));
        assert.isFalse(isLimitedPoolOpen({ ...WINDOW, startMs: Number.NaN }, 1500));
        assert.isFalse(isLimitedPoolOpen(WINDOW, Number.POSITIVE_INFINITY));
    });

    suite.test('openLimitedPools 只回傳此刻開放的池子，保留輸入順序', () => {
        const other: LimitedPoolWindow = { poolId: 'limited-other', startMs: 1500, endMs: 3000, featuredGeneralIds: [] };
        const late: LimitedPoolWindow = { poolId: 'limited-late', startMs: 5000, endMs: 6000, featuredGeneralIds: [] };
        const open = openLimitedPools([WINDOW, late, other], 1600);
        assert.equals(2, open.length);
        assert.equals('limited-zhaoyun', open[0].poolId);
        assert.equals('limited-other', open[1].poolId);
    });

    suite.test('本期限定角色只在池子開放時回傳，且回傳新陣列不共用排程資料', () => {
        const during = featuredGeneralsOf([WINDOW], 'limited-zhaoyun', 1500);
        assert.equals(1, during.length);
        assert.equals('zhao_yun', during[0]);
        during.push('mutated');
        assert.equals(1, WINDOW.featuredGeneralIds.length);
        assert.equals(0, featuredGeneralsOf([WINDOW], 'limited-zhaoyun', 2500).length);
        assert.equals(0, featuredGeneralsOf([WINDOW], 'no-such-pool', 1500).length);
    });

    suite.test('限定池接受靈玉、不接受銅錢符', () => {
        assert.isTrue(limitedPoolAcceptsCurrency('SPIRIT_JADE'));
        assert.isFalse(limitedPoolAcceptsCurrency('BRONZE_CHARM'));
    });

    return suite;
}
