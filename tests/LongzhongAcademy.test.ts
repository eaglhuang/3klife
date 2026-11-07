/**
 * LongzhongAcademy — 隆中草廬八陣羅盤與機巧工造（doc_spec_0307；PROG-2-2013）
 */
import { assert, TestSuite } from './TestRunner';
import {
    EightGate, addLongzhongParts, advanceLongzhongCompass, canCraftLongzhong, craftLongzhong, createLongzhongState,
    evaluateLongzhongGate, longzhongGraduationRewards, nextLongzhongGate,
} from '../assets/scripts/core/systems/nurture/LongzhongAcademy';

export function createLongzhongAcademySuite(): TestSuite {
    const suite = new TestSuite('LongzhongAcademy (隆中草廬 doc_spec_0307 PROG-2-2013)');

    suite.test('TC-LZ-01 八門順序 8 回合循環', () => {
        assert.equals(EightGate.BRIGHT, nextLongzhongGate(EightGate.LIFE));
        let s = createLongzhongState();
        for (let i = 0; i < 8; i++) s = advanceLongzhongCompass(s);
        assert.equals(EightGate.LIFE, s.currentGate);
        assert.equals(EightGate.LIFE, nextLongzhongGate(EightGate.OPEN));
    });

    suite.test('TC-LZ-02 當門加成', () => {
        const o = evaluateLongzhongGate(EightGate.OPEN);
        assert.equals(2.0, o.multiplier);
        assert.equals(0, o.extraEnergyCost);
        assert.equals(10, evaluateLongzhongGate(EightGate.HARM).extraEnergyCost);
        assert.isTrue(evaluateLongzhongGate(EightGate.LIFE).healsInjury);
        assert.equals(2, evaluateLongzhongGate(EightGate.BRIGHT).partDropMultiplier);
        const c = evaluateLongzhongGate(EightGate.CLOSE);
        assert.equals(0.8, c.multiplier);
        assert.isTrue(c.avoidsNegativeEvents);
        assert.isTrue(evaluateLongzhongGate(EightGate.DEATH).willTrial);
    });

    suite.test('機巧工造消耗部件且只能完成一次', () => {
        let s = addLongzhongParts(addLongzhongParts(createLongzhongState(), 'gears', 2), 'mortises', 2);
        assert.isFalse(canCraftLongzhong(s, 'REPEATING_CROSSBOW'));
        const r = craftLongzhong(s, 'WOODEN_OX')!;
        assert.equals(30, r.rewards.pol!);
        assert.equals(0, r.state.gears);
        s = addLongzhongParts(addLongzhongParts(r.state, 'gears', 2), 'mortises', 2);
        assert.isTrue(craftLongzhong(s, 'WOODEN_OX') === null);
    });

    suite.test('結業產出', () => {
        const all = { ...createLongzhongState(), completedInventions: ['WOODEN_OX', 'REPEATING_CROSSBOW', 'EIGHT_FORMATION_TABLE'] };
        const g = longzhongGraduationRewards({ str: 85, int: 70, lea: 85, pol: 70, cha: 70 }, all);
        assert.equals('TAC_BAZHEN_XUANJI,TAC_SHENJI_LIANNU,TRT_QIAOJIANG_TIANGONG', g.join(','));
        assert.equals(0, longzhongGraduationRewards({ str: 90, int: 90, lea: 90, pol: 90, cha: 69 }, createLongzhongState()).length);
    });

    return suite;
}
