/**
 * DailyFreeEnroll.test.ts — 掛機產出每日免費入學令（PROG-2-1374，ITM-06）
 *
 * 鎖住：公式 floor(等級/5)+1 在 1–9 級給 1–2 張；非法等級視為 1；
 * 登入切日才發一次，同日重登不重複發。
 *
 * Unity 對照：像 Idle 遊戲的每日領取按鈕，每天第一次開遊戲才可領，重開遊戲不能重領。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { dailyFreeEnrollCount } from '../assets/scripts/core/systems/DailyFreeEnroll';
import { ITEM_ADMISSION_TOKEN } from '../assets/scripts/core/systems/PlayerInventory';

const HOUR_MS = 60 * 60 * 1000;
// 2026-10-28 12:00（UTC+8）
const DAY_ONE = Date.UTC(2026, 9, 28, 4, 0);

export function createDailyFreeEnrollSuite(): TestSuite {
    const suite = new TestSuite('DailyFreeEnroll (掛機每日免費入學令 ITM-06)');

    suite.test('公式 floor(等級/5)+1：1–4 級 1 張，5–9 級 2 張，10 級起 3 張', () => {
        assert.equals(1, dailyFreeEnrollCount(1));
        assert.equals(1, dailyFreeEnrollCount(4));
        assert.equals(2, dailyFreeEnrollCount(5));
        assert.equals(2, dailyFreeEnrollCount(9));
        assert.equals(3, dailyFreeEnrollCount(10));
    });

    suite.test('非法等級視為 1，張數不為 0', () => {
        assert.equals(1, dailyFreeEnrollCount(0));
        assert.equals(1, dailyFreeEnrollCount(-3));
        assert.equals(1, dailyFreeEnrollCount(Number.NaN));
    });

    suite.test('登入切日發一次；同日重複登入不重發', () => {
        const session = new GameSession();
        session.recordLoginAt(DAY_ONE);
        assert.equals(1, session.itemCount(ITEM_ADMISSION_TOKEN));
        session.recordLoginAt(DAY_ONE + HOUR_MS);
        assert.equals(1, session.itemCount(ITEM_ADMISSION_TOKEN));
    });

    suite.test('隔天登入再發一次', () => {
        const session = new GameSession();
        session.recordLoginAt(DAY_ONE);
        session.recordLoginAt(DAY_ONE + 24 * HOUR_MS);
        assert.equals(2, session.itemCount(ITEM_ADMISSION_TOKEN));
    });

    return suite;
}
