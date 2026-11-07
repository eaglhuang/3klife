/**
 * JiangdongAcademy — 江東督府水文天時與陣型火攻（doc_spec_0305；PROG-2-2011）
 */
import { assert, TestSuite } from './TestRunner';
import type { IDeterministicRng } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import {
    NavalFormation, WindDirection, TideState, createJiangdongState, evaluateJiangdongSynergy, isJiangdongInspectionTurn,
    jiangdongGraduationRewards, processJiangdongTurn, resolveJiangdongInspection, setJiangdongFormation,
} from '../assets/scripts/core/systems/nurture/JiangdongAcademy';

function seqRng(values: number[]): IDeterministicRng {
    let i = 0;
    return { nextInt: () => values[i++ % values.length], chance: () => false, pickWeighted: () => 0 } as unknown as IDeterministicRng;
}

export function createJiangdongAcademySuite(): TestSuite {
    const suite = new TestSuite('JiangdongAcademy (江東督府 doc_spec_0305 PROG-2-2011)');

    suite.test('TC-JD-01/02 風火共鳴與逆風火攻', () => {
        const a = evaluateJiangdongSynergy(NavalFormation.FIRE_RAIDER, WindDirection.SOUTHEAST);
        assert.isTrue(a.isPerfectMatch);
        assert.equals(2.3, a.multiplier);
        const b = evaluateJiangdongSynergy(NavalFormation.FIRE_RAIDER, WindDirection.NORTHWEST);
        assert.isFalse(b.isPerfectMatch);
        assert.isTrue(b.multiplier <= 1.1);
        assert.equals(1.8, evaluateJiangdongSynergy(NavalFormation.WARSHIP_RAM, WindDirection.SOUTHEAST).multiplier);
        assert.equals(1.7, evaluateJiangdongSynergy(NavalFormation.TOWER_FORTRESS, WindDirection.NORTHWEST).multiplier);
    });

    suite.test('預報推進為當期並累計火攻點', () => {
        const rng = seqRng([0, 0, 1, 1, 2, 0]);
        const s = setJiangdongFormation(createJiangdongState(rng), NavalFormation.FIRE_RAIDER);
        assert.equals(WindDirection.SOUTHEAST, s.current.wind);
        assert.equals(TideState.LOW_TIDE, s.forecast.tide);
        const r = processJiangdongTurn(s, 1, rng);
        assert.isTrue(r.synergy.isFireStorm);
        assert.equals(1, r.state.firelinkPoints);
        assert.equals(WindDirection.NORTHWEST, r.state.current.wind);
        assert.equals(WindDirection.BREEZE, r.state.forecast.wind);
    });

    suite.test('大閱兵 9 回合內 3 次為甲等', () => {
        assert.isTrue(isJiangdongInspectionTurn(18));
        assert.isFalse(isJiangdongInspectionTurn(10));
        const base = createJiangdongState(seqRng([0]));
        const hist = [true, true, true, false, false, false, false, false, false, false, false];
        assert.isFalse(resolveJiangdongInspection({ ...base, matchHistory: hist }).gradeA);
        const ok = resolveJiangdongInspection({ ...base, matchHistory: hist.slice(0, 9) });
        assert.isTrue(ok.gradeA);
        assert.isTrue(ok.state.inspectionGradeA);
    });

    suite.test('結業產出', () => {
        const base = createJiangdongState(seqRng([0]));
        const g = jiangdongGraduationRewards(85, 88, { ...base, inspectionGradeA: true, firelinkPoints: 3 });
        assert.equals('TAC_HENGJIANG_ESHO,TAC_LIANHUAN_SHENHUO,TRT_JIANGDONG_NONGCHAO', g.join(','));
        assert.equals(0, jiangdongGraduationRewards(84, 80, base).length);
    });

    return suite;
}
