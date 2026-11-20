/**
 * AcademyInheritAndMarks.test.ts — PROG-2-9182 學府雙年繼承開獎＋生平白因子印記單元測試
 */
import { assert, TestSuite } from './TestRunner';
import {
    careerMarkTpDiscount,
    computeCareerMarkProbability,
    computeInheritProbability,
    computeInheritStatDelta,
    computePinkAptitudeProbability,
    DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG,
    rollAncestralInheritEvent,
    rollGraduationCareerMark,
    topCareerMarksForBreeding,
    type AcademyInheritMarksConfig,
} from '../assets/scripts/core/systems/nurture/AcademyInheritAndMarks';
import { AcademyRng } from '../assets/scripts/core/systems/nurture/AcademyDeterministicRng';
import {
    createAcademySnapshot,
    resolveAcademyAction,
} from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { applyAcademyGraduation } from '../assets/scripts/core/systems/nurture/AcademyGraduation';
import { AcademyControlMode, AcademyId, type AcademyStats } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { Faction } from '../assets/scripts/core/config/Constants';
import * as fs from 'fs';
import * as path from 'path';

function makeStats(v: number): AcademyStats {
    return { str: v, lea: v, int: v, pol: v, cha: v };
}

function makeGeneral(id: string): GeneralConfig {
    return {
        id,
        name: id,
        faction: Faction.Player,
        gender: '男',
        hp: 100,
        age: 15,
        ep: 75,
        vitality: 100,
        maxVitality: 100,
        stats: { str: 60, int: 60, lea: 60, pol: 60, cha: 60, luk: 50 },
        genes: [],
    };
}

export function createAcademyInheritAndMarksSuite(): TestSuite {
    const suite = new TestSuite('AcademyInheritAndMarks (PROG-2-9182)');

    suite.test('academy-inherit-marks.json 與預設常數同步', () => {
        const filePath = path.resolve(__dirname, '../assets/resources/data/academy-inherit-marks.json');
        const loaded = JSON.parse(fs.readFileSync(filePath, 'utf8')) as AcademyInheritMarksConfig;
        assert.equals(JSON.stringify(DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG), JSON.stringify(loaded));
    });

    suite.test('雙年繼承開獎公式 3 組算例與上下限（含選擇題 1A 第 24 回合 +10% 保底）', () => {
        // 新手：S_blue=2, R_pink=0
        assert.equals(0.162, computeInheritProbability(2, false));
        assert.equals(5, computeInheritStatDelta(2));
        assert.equals(0, computePinkAptitudeProbability(0));
        // 中期：S_blue=24, R_pink=2；第12回合未中時第24回合 +0.10
        assert.equals(0.294, computeInheritProbability(24, false));
        assert.equals(0.394, computeInheritProbability(24, true));
        assert.equals(12, computeInheritStatDelta(24));
        assert.equals(0.16, computePinkAptitudeProbability(2));
        // 極端：S_blue=70, R_pink=3；即使加保底仍封頂 0.65
        assert.equals(0.57, computeInheritProbability(70, false));
        assert.equals(0.65, computeInheritProbability(70, true));
        assert.equals(28, computeInheritStatDelta(100));
        assert.equals(0.24, computePinkAptitudeProbability(5));
    });

    suite.test('結業生平印記機率與 TP 折扣計算（選擇題 2C 無限累積、配種取最高星 2 枚）', () => {
        assert.equals(0.1, computeCareerMarkProbability('C', 0));
        assert.equals(0.35, computeCareerMarkProbability('B', 2));
        assert.equals(1.0, computeCareerMarkProbability('S', 4));

        const marks = [
            { id: 'mark_c', stars: 1 as const },
            { id: 'mark_a', stars: 2 as const },
            { id: 'mark_s', stars: 3 as const },
            { id: 'mark_b', stars: 1 as const },
        ];
        const top2 = topCareerMarksForBreeding(marks);
        assert.equals(2, top2.length);
        assert.equals('mark_s', top2[0].id);
        assert.equals('mark_a', top2[1].id);

        // S 印記 3★ -> 15% 折扣；低星未入前2者不計；與綠因子 50% 合併封頂 60%
        assert.equals(0.15, careerMarkTpDiscount(marks, 'mark_s', 0));
        assert.equals(0, careerMarkTpDiscount(marks, 'mark_c', 0));
        assert.equals(0.6, careerMarkTpDiscount(marks, 'mark_s', 0.5));
    });

    suite.test('確定性防 SL 驗證：同種子重跑獲得相同雙年開獎與畢業印記', () => {
        const seed = 'deadbeef12345678'.repeat(4);
        const rng1 = new AcademyRng(seed);
        const rng2 = new AcademyRng(seed);
        const e1 = rollAncestralInheritEvent({ turn: 12, weightedBlueStars: 30, targetStat: 'str', pinkStars: 2, pinkAptitudeTarget: 'cavalry' }, rng1);
        const e2 = rollAncestralInheritEvent({ turn: 12, weightedBlueStars: 30, targetStat: 'str', pinkStars: 2, pinkAptitudeTarget: 'cavalry' }, rng2);
        assert.equals(JSON.stringify(e1), JSON.stringify(e2));

        const m1 = rollGraduationCareerMark({ academyId: AcademyId.YINGCHUAN, grade: 'S', resonanceHits: 4 }, rng1);
        const m2 = rollGraduationCareerMark({ academyId: AcademyId.YINGCHUAN, grade: 'S', resonanceHits: 4 }, rng2);
        assert.equals(JSON.stringify(m1), JSON.stringify(m2));
        assert.equals(3, m1!.stars);
    });

    suite.test('36 回合完整引擎整合：第 12/24 回合先祖開獎 + 畢業生平印記寫回武將', () => {
        let state = createAcademySnapshot({
            worldSeed: '20261120',
            clanUuid: 'clan-test',
            childId: 'child-1',
            academyId: AcademyId.LONGZHONG,
            controlMode: AcademyControlMode.AUTO,
            initialStats: makeStats(140),
            admissionTurn: 1,
        });
        state.legacySupport = {
            statBonusPct: { str: 10 },
            traitSeeds: ['trait_brave'],
            weightedBlueStars: 70,
            primaryStat: 'str',
            pinkStars: 3,
            pinkAptitudeTarget: 'cavalry',
        };

        let safety = 0;
        while (!state.graduated && safety < 200) {
            safety += 1;
            if (state.pendingInterrupt) {
                state = resolveAcademyAction(state, {
                    actionType: 'RESOLVE_INTERRUPT',
                    selectedOptionId: state.interruptOptions[0],
                });
            } else if (state.energy >= 20) {
                state = resolveAcademyAction(state, { actionType: 'TRAIN', targetStat: 'str' });
            } else {
                state = resolveAcademyAction(state, { actionType: 'REST' });
            }
        }

        assert.isTrue(state.graduated, '應在 36 回合後順利結業');
        assert.equals(2, state.ancestralInheritHistory?.length ?? 0, '第 12 與第 24 回合皆應留下開獎紀錄');
        assert.isTrue(state.graduatedCareerMark !== undefined, '畢業時應於 session 內鎖定印記結果');

        const baseGeneral = makeGeneral('child-1');
        const grad = applyAcademyGraduation(baseGeneral, state);
        if (state.graduatedCareerMark) {
            assert.equals(1, grad.general.careerMarks?.length ?? 0);
            assert.equals(state.graduatedCareerMark.id, grad.general.careerMarks![0].id);
        }
    });

    return suite;
}
