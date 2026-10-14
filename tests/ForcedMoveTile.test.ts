/**
 * ForcedMoveTile — 位移格推移判定（GRD-03，PROG-2-0576）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import { forcedMoveBlockedDamageRatio, resolveForcedMove } from '../assets/scripts/battle/shared/ForcedMoveTile';

const NONE = (_depth: number): boolean => false;

export function createForcedMoveTileSuite(): TestSuite {
    const suite = new TestSuite('ForcedMoveTile (位移格推移 GRD-03)');

    suite.test('沒有受阻時，整段推移走完且不算受阻', () => {
        const r = resolveForcedMove(2, -1, 2, NONE);
        assert.equals(0, r.finalDepth);
        assert.equals(2, r.movedSteps);
        assert.isFalse(r.blocked);
        assert.equals(0, r.remainingSteps);
    });

    suite.test('正向與反向都能推移', () => {
        assert.equals(5, resolveForcedMove(3, 1, 2, NONE).finalDepth);
        assert.equals(1, resolveForcedMove(3, -1, 2, NONE).finalDepth);
    });

    suite.test('受阻時停在受阻格前，剩餘步數記為受阻', () => {
        const blockedAt1 = (depth: number) => depth === 1;
        const r = resolveForcedMove(3, -1, 3, blockedAt1);
        assert.equals(2, r.finalDepth);
        assert.equals(1, r.movedSteps);
        assert.isTrue(r.blocked);
        assert.equals(2, r.remainingSteps);
    });

    suite.test('第一格就受阻時原地不動，全部步數都算受阻', () => {
        const r = resolveForcedMove(3, 1, 2, (depth) => depth === 4);
        assert.equals(3, r.finalDepth);
        assert.equals(0, r.movedSteps);
        assert.isTrue(r.blocked);
        assert.equals(2, r.remainingSteps);
    });

    suite.test('步數為 0 或非整數時不推移，也不算受阻', () => {
        assert.equals(3, resolveForcedMove(3, 1, 0, NONE).finalDepth);
        assert.isFalse(resolveForcedMove(3, 1, 0, NONE).blocked);
        assert.equals(4, resolveForcedMove(3, 1, 1.9, NONE).finalDepth);
    });

    suite.test('受阻傷害：每剩餘 1 步 5% 最大 HP，上限 20%，0 步為 0', () => {
        const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
        assert.isTrue(near(0, forcedMoveBlockedDamageRatio(0)));
        assert.isTrue(near(0.05, forcedMoveBlockedDamageRatio(1)));
        assert.isTrue(near(0.15, forcedMoveBlockedDamageRatio(3)));
        assert.isTrue(near(0.2, forcedMoveBlockedDamageRatio(4)));
        assert.isTrue(near(0.2, forcedMoveBlockedDamageRatio(10)));
    });

    return suite;
}
