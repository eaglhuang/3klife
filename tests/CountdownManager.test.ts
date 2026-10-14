import { assert, TestSuite } from './TestRunner';
import {
    countdownStatus,
    createCountdown,
    rushCountdown,
    shouldShowResidentIcon,
} from '../assets/scripts/core/systems/CountdownManager';

const T0 = 1_000_000;
const HOUR = 3_600_000;

export function createCountdownManagerSuite(): TestSuite {
    const suite = new TestSuite('CountdownManager (OPEN-11 趕路倒數)');

    suite.test('趕路中：剩餘時間依絕對時間計算，常駐圖示顯示', () => {
        const state = createCountdown('da-qiao', T0, 4 * HOUR, true);
        const snap = countdownStatus(state, T0 + HOUR);
        assert.equals('traveling', snap.status);
        assert.equals(3 * HOUR, snap.remainingMs);
        assert.isTrue(shouldShowResidentIcon(state, T0 + HOUR));
    });

    suite.test('離線後回來：不靠每秒累加，直接用現在時間算出正確剩餘', () => {
        const state = createCountdown('da-qiao', T0, 4 * HOUR, true);
        const back = countdownStatus(state, T0 + 2 * HOUR);
        assert.equals(2 * HOUR, back.remainingMs);
    });

    suite.test('到點切換為已到達，剩餘為 0，常駐圖示隱藏', () => {
        const state = createCountdown('da-qiao', T0, 4 * HOUR, true);
        const snap = countdownStatus(state, T0 + 4 * HOUR);
        assert.equals('arrived', snap.status);
        assert.equals(0, snap.remainingMs);
        assert.isTrue(!shouldShowResidentIcon(state, T0 + 5 * HOUR));
    });

    suite.test('加速：可加速時立即完成，回傳新狀態且不改原狀態', () => {
        const state = createCountdown('da-qiao', T0, 4 * HOUR, true);
        const result = rushCountdown(state, T0 + HOUR);
        assert.equals(true, result.ok);
        assert.equals('arrived', countdownStatus(result.state, T0 + HOUR).status);
        assert.equals(false, state.accelerated);
    });

    suite.test('不可加速的倒數拒絕加速', () => {
        const state = createCountdown('wen-guan', T0, 3 * HOUR, false);
        const result = rushCountdown(state, T0 + HOUR);
        assert.equals(false, result.ok);
        assert.equals('cannot-accelerate', result.reason!);
    });

    suite.test('已到達後再加速拒絕', () => {
        const state = createCountdown('da-qiao', T0, HOUR, true);
        const result = rushCountdown(state, T0 + 2 * HOUR);
        assert.equals(false, result.ok);
        assert.equals('already-arrived', result.reason!);
    });

    suite.test('時長非正數或非有限數字時拋出 RangeError', () => {
        for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
            let threw = false;
            try {
                createCountdown('x', T0, bad, true);
            } catch (error) {
                threw = error instanceof RangeError;
            }
            assert.isTrue(threw, `時長 ${bad} 應拋出 RangeError`);
        }
    });

    return suite;
}
