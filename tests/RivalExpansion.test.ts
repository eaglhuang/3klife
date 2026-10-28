/**
 * RivalExpansion.test.ts — 他國 AI 擴張決策與軍事任務品質（E-4、F-2、E-11、F-6，PROG-2-1473）
 */
import {
    EXPANSION_WILLINGNESS, evaluateExpansion, evaluateExpansionTarget, militaryMissionTierOf, missionIntelBandOf,
    type ExpansionAttacker, type ExpansionTarget,
} from '../assets/scripts/core/systems/RivalExpansion';
import { TestSuite, assert } from './TestRunner';

const ATTACKER: ExpansionAttacker = { troops: 9000, food: 5000, intel: 50, profile: 'MILITARIST' };
const WEAK: ExpansionTarget = { id: 'weak', troops: 3000, food: 4000, gold: 3000, hatred: 80, relation: -30 };
const STRONG: ExpansionTarget = { id: 'strong', troops: 18000, food: 0, gold: 0, hatred: 0, relation: 80 };

function near(expected: number, actual: number): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, `expected ${expected}, got ${actual}`);
}

export function createRivalExpansionSuite(): TestSuite {
    const suite = new TestSuite('RivalExpansion (他國 AI 擴張決策 E-4 F-2 PROG-2-1473)');

    suite.test('F-2 效用：五項加權，兵力比上限 2、其餘上限 1', () => {
        // 兵力比 3→2；資源 (4000+6000)/10000=1；仇恨 0.8；邦交落差 130/200；情報 0.5
        near(0.3 * 2 + 0.2 * 1 + 0.2 * 0.8 + 0.15 * 0.65 + 0.15 * 0.5, evaluateExpansionTarget(ATTACKER, WEAK));
        near(0.3 * 0.5 + 0 + 0 + 0.15 * 0.1 + 0.15 * 0.5, evaluateExpansionTarget(ATTACKER, STRONG));
    });

    suite.test('兵力或糧草不足不出征', () => {
        assert.equals('troops', (evaluateExpansion({ ...ATTACKER, troops: 1499 }, [WEAK], () => 0) as { reason: string }).reason);
        assert.equals('food', (evaluateExpansion({ ...ATTACKER, food: 2999 }, [WEAK], () => 0) as { reason: string }).reason);
    });

    suite.test('擲骰超過性格意願不出征；PASSIVE 幾乎不出征', () => {
        const willing = EXPANSION_WILLINGNESS.MILITARIST;
        assert.equals('willingness', (evaluateExpansion(ATTACKER, [WEAK], () => willing + 0.01) as { reason: string }).reason);
        assert.equals('ATTACK', evaluateExpansion(ATTACKER, [WEAK], () => willing).kind);
        assert.equals('HOLD', evaluateExpansion({ ...ATTACKER, profile: 'PASSIVE' }, [WEAK], () => 0.06).kind);
    });

    suite.test('選最高分目標；最高分 < 0.6 或沒有目標時不出征', () => {
        const decision = evaluateExpansion(ATTACKER, [STRONG, WEAK], () => 0);
        assert.equals('ATTACK', decision.kind);
        assert.equals('weak', decision.kind === 'ATTACK' ? decision.targetId : '');
        assert.equals('low-score', (evaluateExpansion(ATTACKER, [STRONG], () => 0) as { reason: string }).reason);
        assert.equals('no-target', (evaluateExpansion(ATTACKER, [], () => 0) as { reason: string }).reason);
    });

    suite.test('E-11／F-6：智力決定軍事任務品質與情報分段', () => {
        assert.equals('MASTER', militaryMissionTierOf(90));
        assert.equals('ADVANCED', militaryMissionTierOf(70));
        assert.equals('BASIC', militaryMissionTierOf(69));
        assert.equals(3, missionIntelBandOf(95));
        assert.equals(2, missionIntelBandOf(70));
        assert.equals(1, missionIntelBandOf(50));
        assert.equals(0, missionIntelBandOf(49));
    });

    return suite;
}
