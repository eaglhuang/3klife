/**
 * BloodlineCurve.test.ts — 血統樹父子貝茲連線 headless 測試（BUI-04 / PROG-2-1300）
 *
 * 鎖住：端點正確、控制點沿垂直方向推出、取樣點數與端點、無效座標不產生破圖的線。
 *
 * Unity 對照：像在 Editor 裡檢查 LineRenderer 的點列，起點與終點對得上節點，中途不會斷。
 */
import { assert, TestSuite } from './TestRunner';
import {
    bloodlineCurveBetween,
    DEFAULT_BEND_RATIO,
    sampleCubicBezier,
} from '../assets/scripts/core/systems/BloodlineCurve';

export function createBloodlineCurveSuite(): TestSuite {
    const suite = new TestSuite('BloodlineCurve (血統樹父子貝茲連線 BUI-04 / PROG-2-1300)');

    suite.test('控制點端點正確，並沿垂直方向推出', () => {
        const curve = bloodlineCurveBetween({ x: 0, y: 0 }, { x: 0, y: 100 });
        assert.isTrue(curve !== null);
        assert.equals(0, curve!.p0.x);
        assert.equals(0, curve!.p0.y);
        assert.equals(100, curve!.p3.y);
        assert.equals(50, curve!.p1.y);
        assert.equals(50, curve!.p2.y);
        assert.equals(DEFAULT_BEND_RATIO, 0.5);
    });

    suite.test('取樣為 segments + 1 點，首尾等於端點', () => {
        const curve = bloodlineCurveBetween({ x: -50, y: 0 }, { x: 50, y: 100 });
        const points = sampleCubicBezier(curve, 4);
        assert.equals(5, points.length);
        assert.equals(-50, points[0].x);
        assert.equals(0, points[0].y);
        assert.equals(50, points[4].x);
        assert.equals(100, points[4].y);
    });

    suite.test('對稱曲線的中點落在兩端連線的正中央', () => {
        const curve = bloodlineCurveBetween({ x: -50, y: 0 }, { x: 50, y: 100 });
        const mid = sampleCubicBezier(curve, 2)[1];
        assert.equals(0, mid.x);
        assert.equals(50, mid.y);
    });

    suite.test('segments 小於 1 視為 1，不會回傳空陣列', () => {
        const curve = bloodlineCurveBetween({ x: 0, y: 0 }, { x: 0, y: 100 });
        assert.equals(2, sampleCubicBezier(curve, 0).length);
        assert.equals(2, sampleCubicBezier(curve, -3).length);
    });

    suite.test('無效座標或 null 曲線不產生點，不畫破圖的線', () => {
        assert.isTrue(bloodlineCurveBetween({ x: NaN, y: 0 }, { x: 0, y: 100 }) === null);
        assert.isTrue(bloodlineCurveBetween({ x: 0, y: 0 }, { x: 0, y: Infinity }) === null);
        assert.isTrue(bloodlineCurveBetween({ x: 0, y: 0 }, { x: 0, y: 100 }, NaN) === null);
        assert.equals(0, sampleCubicBezier(null, 8).length);
    });

    suite.test('同一點的父子連線退化為單點，取樣結果仍全部有限', () => {
        const curve = bloodlineCurveBetween({ x: 10, y: 20 }, { x: 10, y: 20 });
        for (const point of sampleCubicBezier(curve, 6)) {
            assert.isTrue(Number.isFinite(point.x) && Number.isFinite(point.y));
            assert.equals(10, point.x);
            assert.equals(20, point.y);
        }
    });

    return suite;
}
