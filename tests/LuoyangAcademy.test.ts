/**
 * LuoyangAcademy — 洛陽太學五經注疏與九品官聲（doc_spec_0306；PROG-2-2012）
 */
import { assert, TestSuite } from './TestRunner';
import type { IDeterministicRng } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import {
    ClassicsBook, addClassicsProgress, borrowLuoyangRelic, createLuoyangState, luoyangGraduationRewards, luoyangTrainingMultiplier,
    luoyangVisitCost, petitionClassics, promoteLuoyang, rollLuoyangImpeachment, visitPatron,
} from '../assets/scripts/core/systems/nurture/LuoyangAcademy';

function hitRng(hit: boolean): IDeterministicRng {
    return { nextInt: () => 0, chance: () => hit, pickWeighted: () => 0 } as unknown as IDeterministicRng;
}

export function createLuoyangAcademySuite(): TestSuite {
    const suite = new TestSuite('LuoyangAcademy (洛陽太學 doc_spec_0306 PROG-2-2012)');

    suite.test('TC-LY-01 注疏、請益、拜謁、晉升 9→7', () => {
        let s = addClassicsProgress(createLuoyangState(), ClassicsBook.SHIJING, 150);
        assert.equals(100, s.classicsProgress.SHIJING);
        const p = petitionClassics(s, ClassicsBook.SHIJING);
        assert.isTrue(p.success);
        assert.isFalse(petitionClassics(p.state, ClassicsBook.SHIJING).success);
        const v = visitPatron(p.state, 100);
        assert.isTrue(v.success);
        assert.equals(1, v.state.recommendationLetters);
        const r = promoteLuoyang(v.state);
        assert.isTrue(r.success);
        assert.equals(7, r.newRank);
        assert.equals(0, r.state.recommendationLetters);
        s = { ...r.state, recommendationLetters: 1 };
        assert.isFalse(promoteLuoyang(s).success);
    });

    suite.test('TC-LY-02 一品乘區 2.35 封頂', () => {
        assert.equals(2.35, luoyangTrainingMultiplier(1));
        assert.equals(2.35, luoyangTrainingMultiplier(0));
        assert.equals(1.15, luoyangTrainingMultiplier(9));
    });

    suite.test('遺物大彩圈與清議彈劾', () => {
        const s = { ...createLuoyangState(), officialRank: 3 };
        assert.equals(2.4, borrowLuoyangRelic(s, 12, 'RELIC_JIAOWEI_QIN')!.multiplier);
        assert.isTrue(borrowLuoyangRelic(s, 13, 'x') === null);
        assert.isTrue(borrowLuoyangRelic({ ...s, officialRank: 5 }, 24, 'x') === null);
        const im = rollLuoyangImpeachment(s, hitRng(true), 't1');
        assert.isTrue(im.impeached);
        assert.equals(5, im.state.officialRank);
        assert.equals(200, luoyangVisitCost(im.state));
        assert.isFalse(rollLuoyangImpeachment(s, hitRng(false), 't1').impeached);
    });

    suite.test('結業產出', () => {
        const g = luoyangGraduationRewards(90, 88, { ...createLuoyangState(), officialRank: 1 });
        assert.equals('TAC_JIUPIN_ZHONGZHENG,TAC_GONGQING_WEIYI,TRT_GUANMIAN_SHIZU', g.join(','));
        assert.equals(0, luoyangGraduationRewards(90, 70, { ...createLuoyangState(), officialRank: 5 }).length);
    });

    return suite;
}
