/**
 * YouzhouGimmick — 幽州演武接入學府訓練引擎（doc_spec_0304；PROG-2-2014）
 */
import { assert, TestSuite } from './TestRunner';
import { AcademyControlMode, AcademyId, type AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { createAcademySnapshot, resolveAcademyAction } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { YOUZHOU_GIMMICK, youzhouPayloadOf } from '../assets/scripts/core/systems/nurture/YouzhouGimmick';

const G = YOUZHOU_GIMMICK;

function fresh(mode = AcademyControlMode.MANUAL): AcademyStateSnapshot {
    return createAcademySnapshot({ worldSeed: 'yz', clanUuid: 'clan', childId: 'c1', academyId: AcademyId.YOUZHOU, admissionTurn: 1,
        controlMode: mode, initialStats: { str: 50, lea: 40, int: 10, pol: 10, cha: 10 } }, G);
}

function train(s: AcademyStateSnapshot): AcademyStateSnapshot {
    return resolveAcademyAction(s, { actionType: 'TRAIN', targetStat: 'str' }, G);
}

export function createYouzhouGimmickSuite(): TestSuite {
    const suite = new TestSuite('YouzhouGimmick (幽州演武接線 doc_spec_0304 PROG-2-2014)');

    suite.test('巡哨累積煞氣並依路線扣精力', () => {
        let s = resolveAcademyAction(fresh(), { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'DRILL:RECON' }, G);
        const e0 = s.energy;
        s = train(s);
        assert.equals(15, youzhouPayloadOf(s).maliceGauge);
        assert.equals(e0 - 20, s.energy);
        s = resolveAcademyAction(s, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'DRILL:REGULAR' }, G);
        const e1 = s.energy;
        s = train(s);
        assert.equals(20, youzhouPayloadOf(s).maliceGauge);
        assert.equals(e1 - 10, s.energy);
    });

    suite.test('煞氣未滿不能突破；滿 80 可開啟', () => {
        let threw = false;
        try { resolveAcademyAction(fresh(), { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'SURGE' }, G); } catch { threw = true; }
        assert.isTrue(threw);
        const s = fresh();
        youzhouPayloadOf(s).maliceGauge = 80;
        const t = resolveAcademyAction(s, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'SURGE' }, G);
        assert.isTrue(youzhouPayloadOf(t).isSurgeActive);
        assert.equals(2, youzhouPayloadOf(train(t)).surgeRemainingTurns);
    });

    suite.test('第 10 回合胡騎犯邊須先處理', () => {
        const s = fresh();
        s.currentTurn = 9;
        s.energy = 100;
        const t = train(s);
        assert.equals(10, t.currentTurn);
        assert.equals('SKIRMISH', G.blockingInteraction!(t));
        let threw = false;
        try { train(t); } catch { threw = true; }
        assert.isTrue(threw);
        const u = resolveAcademyAction(t, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'SKIRMISH:A' }, G);
        assert.equals(null, G.blockingInteraction!(u));
        assert.isTrue(u.chronicles.some((c) => c.title === '白馬衝陣'));
    });

    suite.test('休養回合選休息也會消化', () => {
        const s = fresh();
        youzhouPayloadOf(s).restTurns = 1;
        youzhouPayloadOf(s).hasInjury = true;
        const t = resolveAcademyAction(s, { actionType: 'REST' }, G);
        assert.equals(0, youzhouPayloadOf(t).restTurns);
        assert.isFalse(youzhouPayloadOf(t).hasInjury);
    });

    suite.test('結業發放專屬戰法與特質', () => {
        const s = fresh();
        s.stats.str = 90; s.stats.lea = 85;
        Object.assign(youzhouPayloadOf(s), { completedSurges: 2, valorPoints: 2 });
        G.onGraduate!(s);
        assert.equals('TAC_TUQI_POZHEN,TAC_BAIMA_YICONG', s.learnedTactics.join(','));
        assert.equals('TRT_SAIWAI_BAIZHAN', s.learnedTraits.join(','));
    });

    return suite;
}
