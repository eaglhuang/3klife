/**
 * MentorOverflow.test.ts — 教官卡溢出轉化（MENT-07，PROG-2-0539）
 *
 * 未滿 ★5 的重複卡突破不入帳；★5 後的重複卡依稀有度入帳 SSR 500 / SR 100 / R 20。
 * Unity 對照：像 Shop 退款規則的 EditMode 測試，逐個稀有度驗邊界。
 */
import { TestSuite, assert } from './TestRunner';
import { MENTOR_OVERFLOW_SCORE, overflowScoreOf, overflowToastText, resolveMentorDuplicate } from '../assets/scripts/core/systems/MentorOverflow';

export function createMentorOverflowSuite(): TestSuite {
    const suite = new TestSuite('MentorOverflow (溢出轉化 MENT-07)');

    suite.test('溢出積分表：SSR 500、SR 100、R 20，未知稀有度為 0', () => {
        assert.equals(500, MENTOR_OVERFLOW_SCORE['SSR']);
        assert.equals(100, overflowScoreOf('SR'));
        assert.equals(20, overflowScoreOf('R'));
        assert.equals(0, overflowScoreOf('UR'));
    });

    suite.test('★4 的重複卡是突破到 ★5，不入帳積分', () => {
        const outcome = resolveMentorDuplicate(4, 'SSR');
        assert.equals('breakthrough', outcome.result.kind);
        assert.equals(5, outcome.result.star);
        assert.equals(0, outcome.scoreGain);
    });

    suite.test('★5 的重複卡是溢出，依稀有度入帳', () => {
        assert.equals('overflow', resolveMentorDuplicate(5, 'SSR').result.kind);
        assert.equals(500, resolveMentorDuplicate(5, 'SSR').scoreGain);
        assert.equals(100, resolveMentorDuplicate(5, 'SR').scoreGain);
        assert.equals(20, resolveMentorDuplicate(5, 'R').scoreGain);
    });

    suite.test('溢出 Toast 文案正確', () => {
        assert.equals('趙雲 已滿突破，轉化為積分×500', overflowToastText('趙雲', 500));
    });

    return suite;
}
