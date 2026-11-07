/**
 * JiangdongGimmick — 江東督府接入學府訓練引擎（doc_spec_0305；PROG-2-2015）
 */
import { assert, TestSuite } from './TestRunner';
import { AcademyControlMode, AcademyId, type AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { createAcademySnapshot, resolveAcademyAction } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { WindDirection } from '../assets/scripts/core/systems/nurture/JiangdongAcademy';
import { JIANGDONG_GIMMICK, jiangdongPayloadOf } from '../assets/scripts/core/systems/nurture/JiangdongGimmick';

const G = JIANGDONG_GIMMICK;

function fresh(): AcademyStateSnapshot {
    return createAcademySnapshot({ worldSeed: 'jd', clanUuid: 'clan', childId: 'c1', academyId: AcademyId.JIANGDONG, admissionTurn: 1,
        controlMode: AcademyControlMode.MANUAL, initialStats: { str: 10, lea: 40, int: 40, pol: 10, cha: 10 } }, G);
}

export function createJiangdongGimmickSuite(): TestSuite {
    const suite = new TestSuite('JiangdongGimmick (江東督府接線 doc_spec_0305 PROG-2-2015)');

    suite.test('同種子初始天候一致', () => {
        assert.equals(JSON.stringify(jiangdongPayloadOf(fresh()).forecast), JSON.stringify(jiangdongPayloadOf(fresh()).forecast));
    });

    suite.test('火攻陣遇東南風成長大增並累積火攻點', () => {
        let s = resolveAcademyAction(fresh(), { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'FORMATION:FIRE_RAIDER' }, G);
        jiangdongPayloadOf(s).current = { ...jiangdongPayloadOf(s).current, wind: WindDirection.SOUTHEAST };
        const before = s.stats.lea;
        s = resolveAcademyAction(s, { actionType: 'TRAIN', targetStat: 'lea' }, G);
        assert.equals(1, jiangdongPayloadOf(s).firelinkPoints);
        assert.isTrue(s.stats.lea - before >= 30);
        let threw = false;
        try { resolveAcademyAction(s, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'FORMATION:X' }, G); } catch { threw = true; }
        assert.isTrue(threw);
    });

    suite.test('休息也推進預報且記為未匹配', () => {
        const s = fresh();
        const f = jiangdongPayloadOf(s).forecast;
        const t = resolveAcademyAction(s, { actionType: 'REST' }, G);
        assert.equals(JSON.stringify(f), JSON.stringify(jiangdongPayloadOf(t).current));
        assert.equals('false', jiangdongPayloadOf(t).matchHistory.join(','));
    });

    suite.test('第 9 回合大閱兵甲等加統率', () => {
        const s = fresh();
        s.currentTurn = 9;
        jiangdongPayloadOf(s).matchHistory = [true, true, true];
        const before = s.stats.lea;
        const t = resolveAcademyAction(s, { actionType: 'REST' }, G);
        assert.isTrue(jiangdongPayloadOf(t).inspectionGradeA);
        assert.equals(before + 20, t.stats.lea);
        assert.isTrue(t.chronicles.some((c) => c.title === '長江大閱兵'));
    });

    suite.test('結業發放專屬戰法與特質', () => {
        const s = fresh();
        s.stats.lea = 85; s.stats.int = 88;
        Object.assign(jiangdongPayloadOf(s), { inspectionGradeA: true, firelinkPoints: 3 });
        G.onGraduate!(s);
        assert.equals('TAC_HENGJIANG_ESHO,TAC_LIANHUAN_SHENHUO', s.learnedTactics.join(','));
        assert.equals('TRT_JIANGDONG_NONGCHAO', s.learnedTraits.join(','));
    });

    return suite;
}
