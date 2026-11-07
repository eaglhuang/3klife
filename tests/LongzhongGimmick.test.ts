/**
 * LongzhongGimmick — 隆中草廬接入學府訓練引擎（doc_spec_0307；PROG-2-2017）
 */
import { assert, TestSuite } from './TestRunner';
import { AcademyControlMode, AcademyId, type AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { createAcademySnapshot, resolveAcademyAction } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { EightGate } from '../assets/scripts/core/systems/nurture/LongzhongAcademy';
import { LONGZHONG_GIMMICK, longzhongPayloadOf } from '../assets/scripts/core/systems/nurture/LongzhongGimmick';

const G = LONGZHONG_GIMMICK;

function fresh(): AcademyStateSnapshot {
    return createAcademySnapshot({ worldSeed: 'lz', clanUuid: 'clan', childId: 'c1', academyId: AcademyId.LONGZHONG, admissionTurn: 1,
        controlMode: AcademyControlMode.MANUAL, initialStats: { str: 10, lea: 10, int: 10, pol: 10, cha: 10 } }, G);
}

function parts(s: AcademyStateSnapshot): number {
    const p = longzhongPayloadOf(s);
    return p.gears + p.mortises + p.springs;
}

export function createLongzhongGimmickSuite(): TestSuite {
    const suite = new TestSuite('LongzhongGimmick (隆中草廬接線 doc_spec_0307 PROG-2-2017)');

    suite.test('訓練掉部件，回合結束羅盤轉門', () => {
        const s = resolveAcademyAction(fresh(), { actionType: 'TRAIN', targetStat: 'int' }, G);
        assert.equals(1, parts(s));
        assert.equals(EightGate.BRIGHT, longzhongPayloadOf(s).currentGate);
        const t = resolveAcademyAction(s, { actionType: 'REST' }, G);
        assert.equals(1, parts(t));
        assert.equals(EightGate.HARM, longzhongPayloadOf(t).currentGate);
        // 景門掉落翻倍（景門 ×1.8 會觸發大共鳴打斷，故直接呼叫 onTrain 驗證）
        longzhongPayloadOf(t).currentGate = EightGate.BRIGHT;
        G.onTrain(t, 'int', { nextInt: () => 0 } as never);
        assert.equals(3, parts(t));
    });

    suite.test('開門倍率與傷門耗精力', () => {
        const s = fresh();
        longzhongPayloadOf(s).currentGate = EightGate.OPEN;
        assert.equals(200, G.onTrain(s, 'str', { nextInt: () => 0 } as never).statBonusPct);
        longzhongPayloadOf(s).currentGate = EightGate.HARM;
        assert.equals(10, G.onTrain(s, 'str', { nextInt: () => 0 } as never).extraEnergyCost);
    });

    suite.test('機巧工造加屬性且只能一次', () => {
        const s = fresh();
        Object.assign(longzhongPayloadOf(s), { gears: 2, mortises: 2 });
        const t = resolveAcademyAction(s, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'CRAFT:WOODEN_OX' }, G);
        assert.equals(40, t.stats.lea);
        assert.equals(40, t.stats.pol);
        assert.isTrue(t.chronicles.some((c) => c.title === '機巧工造'));
        let threw = false;
        try { resolveAcademyAction(t, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'CRAFT:WOODEN_OX' }, G); } catch { threw = true; }
        assert.isTrue(threw);
    });

    suite.test('結業發放專屬戰法與特質', () => {
        const s = fresh();
        s.stats = { str: 85, lea: 85, int: 70, pol: 70, cha: 70 };
        longzhongPayloadOf(s).completedInventions = ['WOODEN_OX', 'REPEATING_CROSSBOW', 'EIGHT_FORMATION_TABLE'];
        G.onGraduate!(s);
        assert.equals('TAC_BAZHEN_XUANJI,TAC_SHENJI_LIANNU', s.learnedTactics.join(','));
        assert.equals('TRT_QIAOJIANG_TIANGONG', s.learnedTraits.join(','));
    });

    return suite;
}
