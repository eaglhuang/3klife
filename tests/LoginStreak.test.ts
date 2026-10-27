/**
 * LoginStreak.test.ts — 連續登入統計與 UTC+8 切日（PROG-2-0987）
 */
import { assert, TestSuite } from './TestRunner';
import { EMPTY_LOGIN_STREAK, loginDayOf, recordLogin } from '../assets/scripts/core/systems/LoginStreak';

/** 指定 UTC+8 的日期與時刻，回傳 epoch 毫秒。 */
function at(day: string, hhmm: string): number {
    return Date.parse(`${day}T${hhmm}:00+08:00`);
}

export function createLoginStreakSuite(): TestSuite {
    const suite = new TestSuite('LoginStreak (PROG-2-0987 連續登入)');

    suite.test('UTC+8 00:00 切日：23:59 與次日 00:00 是不同日', () => {
        assert.equals('2026-10-27', loginDayOf(at('2026-10-27', '23:59')));
        assert.equals('2026-10-28', loginDayOf(at('2026-10-28', '00:00')));
    });

    suite.test('第一次登入為 1 天', () => {
        const state = recordLogin(EMPTY_LOGIN_STREAK, at('2026-10-27', '09:00'));
        assert.equals('2026-10-27', state.lastLoginDay!);
        assert.equals(1, state.consecutiveDays);
    });

    suite.test('同一天重複登入不增加天數', () => {
        let state = recordLogin(EMPTY_LOGIN_STREAK, at('2026-10-27', '09:00'));
        state = recordLogin(state, at('2026-10-27', '21:00'));
        assert.equals(1, state.consecutiveDays);
    });

    suite.test('隔一天登入 +1，跨月也成立', () => {
        let state = recordLogin(EMPTY_LOGIN_STREAK, at('2026-10-31', '10:00'));
        state = recordLogin(state, at('2026-11-01', '10:00'));
        assert.equals(2, state.consecutiveDays);
        state = recordLogin(state, at('2026-11-02', '10:00'));
        assert.equals(3, state.consecutiveDays);
    });

    suite.test('漏一天連續天數歸 1', () => {
        let state = recordLogin(EMPTY_LOGIN_STREAK, at('2026-10-27', '10:00'));
        state = recordLogin(state, at('2026-10-28', '10:00'));
        state = recordLogin(state, at('2026-10-30', '10:00'));
        assert.equals(1, state.consecutiveDays);
        assert.equals('2026-10-30', state.lastLoginDay!);
    });

    suite.test('不改輸入狀態', () => {
        const before = { lastLoginDay: '2026-10-27', consecutiveDays: 4 };
        recordLogin(before, at('2026-10-28', '10:00'));
        assert.equals(4, before.consecutiveDays);
    });

    suite.test('非有限時間戳丟錯', () => {
        let threw = false;
        try { recordLogin(EMPTY_LOGIN_STREAK, Number.NaN); } catch { threw = true; }
        assert.isTrue(threw);
    });

    return suite;
}
