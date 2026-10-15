import { TestSuite, assert } from './TestRunner';
import {
    applyMorale,
    chargeDamage,
    dotDamagePerTurn,
    slowedMoveRange,
    soloAttackMultiplier,
    totalHitCount,
} from '../assets/scripts/battle/skills/SkillEffectFormulas';

export function createSkillEffectFormulasSuite(): TestSuite {
    const suite = new TestSuite('SkillEffectFormulas (戰法效果純公式 PROG-2-0751)');

    suite.test('精銳突擊：衝鋒傷害 ×2.0', () => {
        assert.equals(20, chargeDamage(10));
    });

    suite.test('毒箭：每回合扣最大 HP 的 10%', () => {
        assert.equals(50, dotDamagePerTurn(500));
    });

    suite.test('緩速：移動範圍減 1，不低於 0', () => {
        assert.equals(3, slowedMoveRange(4, 1));
        assert.equals(0, slowedMoveRange(0, 1));
    });

    suite.test('鼓舞：士氣 +20', () => {
        assert.equals(70, applyMorale(50, 20));
    });

    suite.test('結姻連射：攻擊次數 +1', () => {
        assert.equals(2, totalHitCount(1, 1));
    });

    suite.test('單騎破陣：無相鄰友軍 ×1.3，有則 ×1', () => {
        assert.equals(1.3, soloAttackMultiplier(false));
        assert.equals(1, soloAttackMultiplier(true));
    });

    return suite;
}
