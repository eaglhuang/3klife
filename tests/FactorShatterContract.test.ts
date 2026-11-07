/**
 * FactorShatterContract — 因子覺醒碎裂（doc_spec_0328；PROG-2-2004）
 */
import { assert, TestSuite } from './TestRunner';
import {
    canTransitionGeneSlot, factorAwakenToast, geneSlotFlagsOf, geneSlotStateOf, isGeneSlotEffective, isGeneSlotRevealed,
    shatterPhaseAt, shatterShardCount, specialBattleAwakenChance,
} from '../assets/scripts/core/systems/FactorShatterContract';

export function createFactorShatterContractSuite(): TestSuite {
    const suite = new TestSuite('FactorShatterContract (因子覺醒碎裂 doc_spec_0328 PROG-2-2004)');

    suite.test('三態旗標互轉、只能往前、只有覺醒生效', () => {
        assert.equals('LOCKED', geneSlotStateOf({ isLocked: true, isPeeked: false }));
        assert.equals('PEEKED', geneSlotStateOf({ isLocked: true, isPeeked: true }));
        assert.equals('AWAKENED', geneSlotStateOf({ isLocked: false, isPeeked: false }));
        assert.isTrue(geneSlotFlagsOf('AWAKENED').isPeeked);
        assert.isTrue(canTransitionGeneSlot('LOCKED', 'AWAKENED'));
        assert.isFalse(canTransitionGeneSlot('AWAKENED', 'PEEKED'));
        assert.isFalse(canTransitionGeneSlot('PEEKED', 'PEEKED'));
        assert.isFalse(isGeneSlotEffective('PEEKED'));
        assert.isTrue(isGeneSlotRevealed('PEEKED'));
        assert.isFalse(isGeneSlotRevealed('LOCKED'));
    });

    suite.test('戰功覺醒 15% + LUK/10 × 1%', () => {
        assert.equals(0.23, specialBattleAwakenChance(80));
        assert.equals(0.15, specialBattleAwakenChance(9));
        assert.equals(0.15, specialBattleAwakenChance(-5));
        assert.equals(1, specialBattleAwakenChance(5000));
    });

    suite.test('碎裂時間軸、碎片數與 Toast', () => {
        assert.equals('tremble', shatterPhaseAt(0.1));
        assert.equals('burst', shatterPhaseAt(0.2));
        assert.equals('rise', shatterPhaseAt(0.5));
        assert.equals('done', shatterPhaseAt(0.65));
        assert.equals(6, shatterShardCount(0));
        assert.equals(8, shatterShardCount(2));
        assert.equals(7, shatterShardCount(-4));
        assert.equals('【因子覺醒！】獲得特技：雨師踏浪', factorAwakenToast('雨師踏浪'));
    });

    return suite;
}
