/**
 * AiDuelDecision.test.ts — 單挑 AI 接受判定（AIS-10 / PROG-2-1322）
 *
 * 鎖住：三項權重與公式；輸入夾在 0~1；抖動 ±0.05；一般閾值 0.58、EASY 0.45；
 * 分數達閾值才接受。
 */
import { assert, TestSuite } from './TestRunner';
import {
    decideDuelAccept,
    duelAcceptThresholdOf,
    duelScoreOf,
    duelScoreWithJitter,
} from '../assets/scripts/core/systems/AiDuelDecision';

export function createAiDuelDecisionSuite(): TestSuite {
    const suite = new TestSuite('AiDuelDecision (單挑 AI 接受判定 AIS-10 / PROG-2-1322)');

    suite.test('duel_score 依 0.45 / 0.35 / 0.20 加權', () => {
        const score = duelScoreOf({ hpRatio: 1, squadRatio: 0, powerRatio: 0 });
        assert.isTrue(Math.abs(score - 0.45) < 1e-9);
        assert.isTrue(Math.abs(duelScoreOf({ hpRatio: 0, squadRatio: 1, powerRatio: 0 }) - 0.35) < 1e-9);
        assert.isTrue(Math.abs(duelScoreOf({ hpRatio: 0, squadRatio: 0, powerRatio: 1 }) - 0.2) < 1e-9);
        assert.isTrue(Math.abs(duelScoreOf({ hpRatio: 1, squadRatio: 1, powerRatio: 1 }) - 1) < 1e-9);
    });

    suite.test('輸入超出 0~1 時先夾住', () => {
        assert.isTrue(Math.abs(duelScoreOf({ hpRatio: 2, squadRatio: -1, powerRatio: 0.5 }) - (0.45 + 0.1)) < 1e-9);
    });

    suite.test('抖動 roll=0 為 −0.05、roll=1 為 +0.05、roll=0.5 不變', () => {
        const input = { hpRatio: 0.5, squadRatio: 0.5, powerRatio: 0.5 };
        const base = duelScoreOf(input);
        assert.isTrue(Math.abs(duelScoreWithJitter(input, 0) - (base - 0.05)) < 1e-9);
        assert.isTrue(Math.abs(duelScoreWithJitter(input, 1) - (base + 0.05)) < 1e-9);
        assert.isTrue(Math.abs(duelScoreWithJitter(input, 0.5) - base) < 1e-9);
    });

    suite.test('閾值：一般 0.58、EASY 0.45', () => {
        assert.equals(0.58, duelAcceptThresholdOf('normal'));
        assert.equals(0.58, duelAcceptThresholdOf('hell'));
        assert.equals(0.45, duelAcceptThresholdOf('easy'));
    });

    suite.test('一般難度：分數達 0.58 接受，低於則拒絕', () => {
        const strong = { hpRatio: 1, squadRatio: 1, powerRatio: 1 };
        const weak = { hpRatio: 0.2, squadRatio: 0.2, powerRatio: 0.2 };
        assert.isTrue(decideDuelAccept(strong, 0.5, 'normal'));
        assert.isFalse(decideDuelAccept(weak, 0.5, 'normal'));
    });

    suite.test('EASY 閾值較低：同一組輸入在 EASY 接受、一般拒絕', () => {
        // base = 0.5；roll=0.5 不抖動，0.5 介於 0.45 與 0.58 之間
        const input = { hpRatio: 0.5, squadRatio: 0.5, powerRatio: 0.5 };
        assert.isFalse(decideDuelAccept(input, 0.5, 'normal'));
        assert.isTrue(decideDuelAccept(input, 0.5, 'easy'));
    });

    return suite;
}
