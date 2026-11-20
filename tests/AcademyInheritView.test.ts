/**
 * AcademyInheritView.test.ts — PROG-2-9183 學府雙年開獎與生平印記畫面顯示測試
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildAncestralInheritView,
    careerMarkDisplayName,
    formatRosterCareerMarksLine,
} from '../assets/scripts/ui/core/AcademyInheritView';
import { academyGraduationTexts } from '../assets/scripts/ui/core/AcademyGraduationView';
import { applyAcademyGraduation } from '../assets/scripts/core/systems/nurture/AcademyGraduation';
import {
    createAcademySnapshot,
    resolveAcademyAction,
} from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { AcademyControlMode, AcademyId, type AcademyStats } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { Faction } from '../assets/scripts/core/config/Constants';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import * as fs from 'fs';
import * as path from 'path';

function makeStats(v: number): AcademyStats {
    return { str: v, lea: v, int: v, pol: v, cha: v };
}

function makeGeneral(id: string, gender: '男' | '女', extra: Partial<BreedingGeneral> = {}): BreedingGeneral {
    return {
        id,
        name: id,
        faction: Faction.Player,
        gender,
        hp: 100,
        age: 22,
        ep: 75,
        vitality: 100,
        maxVitality: 100,
        stats: { str: 60, int: 60, lea: 60, pol: 60, cha: 60, luk: 50 },
        genes: [],
        ...extra,
    };
}

export function createAcademyInheritViewSuite(): TestSuite {
    const suite = new TestSuite('AcademyInheritView (PROG-2-9183)');

    suite.test('四語系皆含 9183 新增印記與先祖開獎鍵，且不外露內部 id', () => {
        const required = [
            'ui.academy.graduation.career_mark',
            'ui.academy.graduation.career_mark_none',
            'ui.academy.mark.yingchuan',
            'ui.academy.mark.longzhong',
            'ui.academy.mark.pedigree_hint',
            'ui.academy.inherit.hit',
            'ui.academy.inherit.miss',
            'ui.academy.inherit.pity_active',
        ];
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../assets/resources/i18n/${loc}.json`), 'utf8'));
            for (const key of required) {
                assert.isTrue(typeof data[key] === 'string' && data[key].length > 0, `${loc} 應含 ${key}`);
            }
        }
        assert.equals('隆中奇謀印記', careerMarkDisplayName('mark_longzhong_strategy'));
        assert.equals('宗族學府印記', careerMarkDisplayName('mark_unknown_id'));
    });

    suite.test('無頭跑完 36 回合：第 12 / 24 回合打斷點皆產出中文開獎文案（含未觸發安慰句與保底提示），結業寫入印記顯示模型', () => {
        let state = createAcademySnapshot({
            worldSeed: '20261120',
            clanUuid: 'clan-ui',
            childId: 'child-ui',
            academyId: AcademyId.LONGZHONG,
            controlMode: AcademyControlMode.AUTO,
            initialStats: makeStats(140),
            admissionTurn: 1,
        });
        state.legacySupport = {
            statBonusPct: { str: 10 },
            traitSeeds: [],
            weightedBlueStars: 24,
            primaryStat: 'str',
            pinkStars: 2,
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

        const history = state.ancestralInheritHistory ?? [];
        assert.equals(2, history.length, '第 12 與第 24 回合應各有 1 筆開獎紀錄');

        const midtermView = buildAncestralInheritView(history[0], { ancestorName: '張飛' });
        assert.isTrue(midtermView.body.includes('張飛'));
        assert.equals(false, midtermView.body.includes('mark_'));

        const riteView = buildAncestralInheritView(history[1], {
            ancestorName: '張飛',
            pityActive: !history[0].triggered,
        });
        if (!history[0].triggered) {
            assert.isTrue(riteView.body.includes('保底感應 +10%'), '期中未中時弱冠應顯示保底提示');
        }
        const missSample = buildAncestralInheritView(
            { turn: 12, triggered: false, probability: 0.2, targetStat: 'str', statDelta: 0 },
            { ancestorName: '張飛' },
        );
        assert.isTrue(missSample.body.includes('尚未顯靈'));

        const grad = applyAcademyGraduation(makeGeneral('child-ui', '男') as GeneralConfig, state);
        const texts = academyGraduationTexts(grad, { generalName: '張小將' });
        assert.isTrue(texts.academyGradCareerMark.startsWith('生平印記：'));
        assert.equals(false, texts.academyGradCareerMark.includes('mark_'), '結業成績單不應露出內部印記 id');
    });

    suite.test('譜牒／結緣畫面列出持有印記並標示「遺傳採計最高 2 枚」', () => {
        const line = formatRosterCareerMarksLine([
            { id: 'mark_yingchuan_scholar', stars: 1 },
            { id: 'mark_longzhong_strategy', stars: 3 },
            { id: 'mark_youzhou_cavalry', stars: 2 },
        ]);
        assert.isTrue(line.includes('隆中奇謀印記 3★'));
        assert.isTrue(line.includes('幽州鐵騎印記 2★'));
        assert.isTrue(line.includes('遺傳採計最高 2 枚'));
        assert.equals(false, line.includes('潁川清談印記'), '只列最高 2 枚');

        const father = makeGeneral('f1', '男', {
            name: '趙雲',
            careerMarks: [{ id: 'mark_youzhou_cavalry', stars: 3 }],
        });
        const mother = makeGeneral('m1', '女', { name: '蔡文姬' });
        const roster = new InMemoryRosterStore([father, mother]);
        const graph = BloodlineGraph.getInstance();
        graph.clear();
        const breeding = new BreedingService(roster, graph, { random: () => 0.5 });
        const controller = new BondingSetupController({ breeding, roster });
        controller.selectFather('f1');
        controller.selectMother('m1');
        const view = controller.getView();
        assert.isTrue(view.texts.fatherFactors.includes('幽州鐵騎印記 3★'));
        assert.isTrue(view.texts.fatherFactors.includes('遺傳採計最高 2 枚'));
    });

    return suite;
}
