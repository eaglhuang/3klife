/**
 * ComboAttackKin.test.ts — 相鄰義兄弟的合攻觸發率（KIN-09，PROG-2-1063）headless 測試
 *
 * 鎖住：沒有相鄰關係時維持基礎值；相鄰義兄弟乘 1.3；多個相鄰關係不疊乘；結果夾在 0~1。
 */
import { assert, TestSuite } from './TestRunner';
import { COMBO_ATTACK_BASE_CHANCE, comboAttackChanceWithKin } from '../assets/scripts/core/systems/ComboAttackKin';
import type { HistoricalRelation } from '../assets/scripts/core/systems/KinRelation';

function relation(comboAttackRateMod?: number): HistoricalRelation {
    return {
        relationId: `rel-${comboAttackRateMod ?? 'none'}`,
        templateA: 'liu-bei',
        templateB: 'guan-yu',
        type: 'SWORN',
        epBonus: 0,
        extraEffects: comboAttackRateMod === undefined ? {} : { comboAttackRateMod },
        loreKey: 'lore.test',
    };
}

const near = (value: number, expected: number) => Math.abs(value - expected) < 1e-9;

export function createComboAttackKinSuite(): TestSuite {
    const suite = new TestSuite('ComboAttackKin (義兄弟相鄰合攻 KIN-09 PROG-2-1063)');

    suite.test('沒有相鄰關係時維持基礎觸發率', () => {
        assert.isTrue(near(comboAttackChanceWithKin(0.5, []), 0.5));
    });

    suite.test('基礎觸發率暫定 20%，相鄰義兄弟後為 26%', () => {
        assert.isTrue(near(COMBO_ATTACK_BASE_CHANCE, 0.2));
        assert.isTrue(near(comboAttackChanceWithKin(COMBO_ATTACK_BASE_CHANCE, [relation(1.3)]), 0.26));
    });

    suite.test('相鄰義兄弟（倍率 1.3）觸發率 +30%', () => {
        assert.isTrue(near(comboAttackChanceWithKin(0.5, [relation(1.3)]), 0.65));
    });

    suite.test('多個相鄰關係不疊乘，只取最大倍率', () => {
        assert.isTrue(near(comboAttackChanceWithKin(0.5, [relation(1.3), relation(1.3)]), 0.65));
        assert.isTrue(near(comboAttackChanceWithKin(0.5, [relation(1.2), relation(1.3)]), 0.65));
    });

    suite.test('沒有倍率或倍率不大於 1 的關係不影響結果；結果夾在 0~1', () => {
        assert.isTrue(near(comboAttackChanceWithKin(0.5, [relation(), relation(0.8)]), 0.5));
        assert.isTrue(near(comboAttackChanceWithKin(0.9, [relation(1.3)]), 1));
        assert.isTrue(near(comboAttackChanceWithKin(-0.2, [relation(1.3)]), 0));
    });

    return suite;
}
