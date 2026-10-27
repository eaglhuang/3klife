/**
 * VortexTransition.test.ts — 漩渦吸入與白閃轉場的階段時序（PROG-2-1209，OPEN-04）
 */
import { assert, TestSuite } from './TestRunner';
import { VORTEX_TRANSITION_STEPS, vortexPhaseAt, vortexTransitionTotalMs } from '../assets/scripts/core/systems/VortexTransition';

export function createVortexTransitionSuite(): TestSuite {
    const suite = new TestSuite('VortexTransition (PROG-2-1209 漩渦轉場時序)');

    suite.test('階段順序依規格：白點 → 擴散 → 吸入 → 白閃 → 轉蛋飛出', () => {
        const order = VORTEX_TRANSITION_STEPS.map((step) => step.phase).join(',');
        assert.equals('dot,spread,suck-in,white-flash,wheel-fly-out', order);
    });

    suite.test('開始時在第一階段、進度 0', () => {
        const state = vortexPhaseAt(0);
        assert.equals('dot', state.phase!);
        assert.equals(0, state.progress);
    });

    suite.test('階段交界時切換到下一階段', () => {
        const first = VORTEX_TRANSITION_STEPS[0].durationMs;
        assert.equals('spread', vortexPhaseAt(first).phase!);
    });

    suite.test('階段內進度依比例計算', () => {
        const second = VORTEX_TRANSITION_STEPS[1];
        const offset = VORTEX_TRANSITION_STEPS[0].durationMs;
        const state = vortexPhaseAt(offset + second.durationMs / 2);
        assert.equals('spread', state.phase!);
        assert.isTrue(Math.abs(state.progress - 0.5) < 1e-9);
    });

    suite.test('超過總長視為播完，階段為 null、進度 1', () => {
        const state = vortexPhaseAt(vortexTransitionTotalMs() + 1);
        assert.isTrue(state.phase === null);
        assert.equals(1, state.progress);
    });

    suite.test('負數時間視為開始，不出錯', () => {
        assert.equals('dot', vortexPhaseAt(-500).phase!);
    });

    return suite;
}
