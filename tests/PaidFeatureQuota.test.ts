/**
 * 付費功能每日免費額度（EQP-11／OFC-12，裁決第 19 項，PROG-2-1997）：
 * 單日免費 1 次，超額每次 60 玉璧；跨日歸零；時鐘回撥不重置；玉璧不足不改狀態。
 */
import { TestSuite, assert } from './TestRunner';
import {
    consumePaidFeatureUse,
    EMPTY_PAID_FEATURE_QUOTA,
    normalizePaidFeatureQuota,
    PAID_FEATURE_EXTRA_GEM_COST,
    previewPaidFeatureUse,
    QUOTA_FEATURE_EQP_AUTO_ORGANIZE,
    QUOTA_FEATURE_OFC_REFRESH,
    type PaidFeatureQuotaState,
} from '../assets/scripts/core/systems/PaidFeatureQuota';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 9, 4, 0, 0);

function use(state: PaidFeatureQuotaState, feature: string, at: number, gems: number) {
    const r = consumePaidFeatureUse(state, feature, at, gems);
    if (!r.ok) throw new Error(`預期成功卻失敗：${r.reason}`);
    return r;
}

export function createPaidFeatureQuotaSuite(): TestSuite {
    const suite = new TestSuite('PaidFeatureQuota（EQP-11／OFC-12 單日免費 1 次＋超額 60 玉璧）');

    suite.test('第一次免費、第二次起每次 60 玉璧', () => {
        const a = use(EMPTY_PAID_FEATURE_QUOTA, QUOTA_FEATURE_EQP_AUTO_ORGANIZE, T0, 0);
        assert.isTrue(a.free);
        assert.equals(0, a.gemsSpent);
        const b = use(a.state, QUOTA_FEATURE_EQP_AUTO_ORGANIZE, T0 + 1000, 100);
        assert.isFalse(b.free);
        assert.equals(PAID_FEATURE_EXTRA_GEM_COST, b.gemsSpent);
        assert.equals(60, b.gemsSpent);
        const c = use(b.state, QUOTA_FEATURE_EQP_AUTO_ORGANIZE, T0 + 2000, 60);
        assert.equals(60, c.gemsSpent);
    });

    suite.test('各功能額度獨立', () => {
        const a = use(EMPTY_PAID_FEATURE_QUOTA, QUOTA_FEATURE_EQP_AUTO_ORGANIZE, T0, 0);
        const b = use(a.state, QUOTA_FEATURE_OFC_REFRESH, T0, 0);
        assert.isTrue(b.free, '另一個功能第一次仍免費');
    });

    suite.test('玉璧不足：拒絕且狀態不變；免費那次不需要玉璧', () => {
        const a = use(EMPTY_PAID_FEATURE_QUOTA, QUOTA_FEATURE_OFC_REFRESH, T0, 0);
        const r = consumePaidFeatureUse(a.state, QUOTA_FEATURE_OFC_REFRESH, T0, 59);
        assert.isFalse(r.ok);
        assert.equals('insufficient-gems', r.ok ? '' : r.reason);
        const p = previewPaidFeatureUse(a.state, QUOTA_FEATURE_OFC_REFRESH, T0, 59);
        assert.isFalse(p.affordable);
        assert.equals(60, p.gemCost);
        assert.isTrue(previewPaidFeatureUse(a.state, QUOTA_FEATURE_OFC_REFRESH, T0, 60).affordable);
    });

    suite.test('跨日（UTC+8 日曆日）歸零，又有 1 次免費', () => {
        const a = use(EMPTY_PAID_FEATURE_QUOTA, QUOTA_FEATURE_EQP_AUTO_ORGANIZE, T0, 0);
        const next = use(a.state, QUOTA_FEATURE_EQP_AUTO_ORGANIZE, T0 + DAY, 0);
        assert.isTrue(next.free);
        assert.equals(0, previewPaidFeatureUse(next.state, QUOTA_FEATURE_EQP_AUTO_ORGANIZE, T0 + DAY, 0).freeLeft);
    });

    suite.test('系統時鐘回撥：不重置免費額度（沿用已記錄日）', () => {
        const a = use(EMPTY_PAID_FEATURE_QUOTA, QUOTA_FEATURE_EQP_AUTO_ORGANIZE, T0 + DAY, 0);
        const back = consumePaidFeatureUse(a.state, QUOTA_FEATURE_EQP_AUTO_ORGANIZE, T0, 0);
        assert.isFalse(back.ok, '回撥到前一天仍視為今天已用過免費，沒玉璧被拒');
    });

    suite.test('normalize：壞資料回空、次數只收正整數', () => {
        assert.equals(null, normalizePaidFeatureQuota(null).day);
        assert.equals(null, normalizePaidFeatureQuota({ day: 'oops', used: { a: 3 } }).day);
        const q = normalizePaidFeatureQuota({ day: '2026-11-09', used: { a: 2.7, b: -1, c: 'x' } });
        assert.equals(2, q.used.a);
        assert.equals(undefined, q.used.b);
        assert.equals(undefined, q.used.c);
    });

    return suite;
}
