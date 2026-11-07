/**
 * GeneralPhaseMachine — 生命週期七階段與雙軌數值（doc_spec_0320；PROG-2-1946）
 */
import { assert, TestSuite } from './TestRunner';
import {
    advancePhaseByAge, applyPhaseEvent, changeRole, finalStat, naturalPhaseForAge, vitalityRegenMultiplier,
} from '../assets/scripts/core/systems/GeneralPhaseMachine';

export function createGeneralPhaseMachineSuite(): TestSuite {
    const suite = new TestSuite('GeneralPhaseMachine (名將本體 doc_spec_0320 PROG-2-1946)');

    suite.test('年齡邊界對應五個自然階段', () => {
        assert.equals('BABY', naturalPhaseForAge(4));
        assert.equals('CHILD', naturalPhaseForAge(5));
        assert.equals('YOUTH', naturalPhaseForAge(12));
        assert.equals('PEAK', naturalPhaseForAge(20));
        assert.equals('PEAK', naturalPhaseForAge(49));
        assert.equals('DECLINE', naturalPhaseForAge(50));
    });

    suite.test('只往後走；事件階段不被年齡覆寫', () => {
        assert.equals('PEAK', advancePhaseByAge('YOUTH', 20));
        assert.equals('PEAK', advancePhaseByAge('PEAK', 18));
        assert.equals('RETIRED', advancePhaseByAge('RETIRED', 70));
        assert.equals('SPIRIT', advancePhaseByAge('SPIRIT', 30));
    });

    suite.test('榮退 60 歲門檻、死亡進英靈、英靈為終態', () => {
        const young = applyPhaseEvent('DECLINE', 59, 'retire');
        assert.isTrue(!young.ok && young.reason === 'too-young');
        const ret = applyPhaseEvent('DECLINE', 60, 'retire');
        assert.isTrue(ret.ok && ret.phase === 'RETIRED');
        const again = applyPhaseEvent('RETIRED', 61, 'retire');
        assert.isTrue(!again.ok && again.reason === 'already');
        const die = applyPhaseEvent('PEAK', 30, 'death');
        assert.isTrue(die.ok && die.phase === 'SPIRIT');
        assert.isFalse(applyPhaseEvent('SPIRIT', 30, 'death').ok);
    });

    suite.test('衰退期精力回復減半、FinalStat 取小、Mentor 不可逆', () => {
        assert.equals(0.5, vitalityRegenMultiplier('DECLINE'));
        assert.equals(1, vitalityRegenMultiplier('PEAK'));
        assert.equals(80, finalStat(95, 80));
        assert.equals(70, finalStat(70, 80));
        const m = changeRole('Combat', 'Mentor');
        assert.isTrue(m.ok && m.roleBoundary === 'TeachingOnly');
        assert.isFalse(changeRole('Mentor', 'Combat').ok);
    });

    return suite;
}
