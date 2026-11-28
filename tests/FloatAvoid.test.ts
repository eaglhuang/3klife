/**
 * FloatAvoid.test.ts — 跳字避開棋盤 buff 格標記（PROG-2-9415）
 *
 * 1. 不重疊不挪；路徑蓋到標記就往較近的一側挪到剛好不重疊。
 * 2. 兩個標記並排時，挪到兩個都避開的位置。
 * 3. 挪動超過上限就維持原位。
 * 4. 半寬估算：中文字比數字寬、字級大的爆擊比一般寬。
 *
 * Unity 對照：EditMode 測試 DamagePopup 生成位置的避讓計算。
 */
import { TestSuite, assert } from './TestRunner';
import {
    FLOAT_AVOID_MARGIN, FLOAT_AVOID_MAX_SHIFT, FLOAT_TEXT_STYLES, floatAvoidShift, floatHalfWidth, type FloatAvoidRect,
} from '../assets/scripts/core/systems/FloatTextStyle';

/** 檢查挪動後的路徑確實與每個標記都不重疊 */
function clear(startX: number, startY: number, halfW: number, halfH: number, rise: number, rects: FloatAvoidRect[]): boolean {
    for (const r of rects) {
        const yOverlap = startY + rise + halfH > r.y - r.halfH - FLOAT_AVOID_MARGIN && startY - halfH < r.y + r.halfH + FLOAT_AVOID_MARGIN;
        const xOverlap = startX + halfW > r.x - r.halfW - FLOAT_AVOID_MARGIN && startX - halfW < r.x + r.halfW + FLOAT_AVOID_MARGIN;
        if (yOverlap && xOverlap) return false;
    }
    return true;
}

export function createFloatAvoidSuite(): TestSuite {
    const suite = new TestSuite('FloatAvoid (跳字避開棋盤標記 PROG-2-9415)');

    suite.test('沒有標記或路徑不重疊 → 不挪', () => {
        assert.equals(0, floatAvoidShift(0, 0, 30, 15, 60, []));
        // 標記在路徑正上方很遠
        assert.equals(0, floatAvoidShift(0, 0, 30, 15, 60, [{ x: 0, y: 300, halfW: 40, halfH: 28 }]));
        // 標記在旁邊很遠
        assert.equals(0, floatAvoidShift(0, 0, 30, 15, 60, [{ x: 200, y: 40, halfW: 40, halfH: 28 }]));
    });

    suite.test('標記在路徑上偏右 → 往左挪到剛好不重疊', () => {
        const rects = [{ x: 20, y: 50, halfW: 40, halfH: 28 }];
        const dx = floatAvoidShift(0, 0, 30, 15, 60, rects);
        assert.isTrue(dx < 0, `應往左，實際 ${dx}`);
        assert.isTrue(clear(dx, 0, 30, 15, 60, rects), `挪 ${dx} 後仍重疊`);
        // 剛好緊貼：20 - 40 - 6 - 30 = -56（含 0.5 像素保險）
        assert.isTrue(Math.abs(dx - -56.5) < 1e-6, `挪動量 ${dx}`);
    });

    suite.test('標記在路徑上偏左 → 往右挪', () => {
        const rects = [{ x: -20, y: 50, halfW: 40, halfH: 28 }];
        const dx = floatAvoidShift(0, 0, 30, 15, 60, rects);
        assert.isTrue(dx > 0, `應往右，實際 ${dx}`);
        assert.isTrue(clear(dx, 0, 30, 15, 60, rects));
    });

    suite.test('兩個標記並排 → 挪到兩個都避開的位置', () => {
        const rects = [{ x: 10, y: 40, halfW: 40, halfH: 28 }, { x: -70, y: 40, halfW: 40, halfH: 28 }];
        const dx = floatAvoidShift(0, 0, 30, 15, 60, rects);
        assert.isTrue(dx !== 0, '應該要挪');
        assert.isTrue(clear(dx, 0, 30, 15, 60, rects), `挪 ${dx} 後仍重疊`);
        // 往左要越過兩個標記，往右只要越過一個：取右邊
        assert.isTrue(dx > 0, `應取較近的右邊，實際 ${dx}`);
    });

    suite.test('需要挪太遠（超過上限）→ 維持原位', () => {
        const wide = [{ x: 0, y: 40, halfW: FLOAT_AVOID_MAX_SHIFT + 50, halfH: 28 }];
        assert.equals(0, floatAvoidShift(0, 0, 30, 15, 60, wide));
    });

    suite.test('爆擊大字正對標記：上限隨字寬放寬，仍挪得開', () => {
        const halfW = floatHalfWidth('-188888', FLOAT_TEXT_STYLES.dmg_crit);
        assert.isTrue(halfW + 48 + FLOAT_AVOID_MARGIN > FLOAT_AVOID_MAX_SHIFT, '這個案例需要超過固定上限才挪得開');
        const rects = [{ x: 0, y: 60, halfW: 48, halfH: 28 }];
        const dx = floatAvoidShift(0, 0, halfW, 40, 120, rects);
        assert.isTrue(dx !== 0, '應該要挪');
        assert.isTrue(clear(dx, 0, halfW, 40, 120, rects), `挪 ${dx} 後仍重疊`);
    });

    suite.test('標記在起點下方（字往上飄不會經過）→ 不挪', () => {
        assert.equals(0, floatAvoidShift(0, 100, 30, 15, 60, [{ x: 0, y: 30, halfW: 40, halfH: 28 }]));
    });

    suite.test('半寬估算：中文比數字寬、爆擊（字級較大）比一般寬', () => {
        const base = FLOAT_TEXT_STYLES.dmg_player;
        assert.isTrue(floatHalfWidth('中毒', base) > floatHalfWidth('-12', base) * 0.9, '兩個中文字應不小於三個數字');
        assert.isTrue(floatHalfWidth('-120', FLOAT_TEXT_STYLES.dmg_crit) > floatHalfWidth('-120', base), '爆擊字應較寬');
        assert.equals(0, floatHalfWidth('', base));
    });

    return suite;
}
