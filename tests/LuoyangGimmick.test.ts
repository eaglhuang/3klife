/**
 * LuoyangGimmick — 洛陽太學接入學府訓練引擎（doc_spec_0306；PROG-2-2016）
 */
import { assert, TestSuite } from './TestRunner';
import { AcademyControlMode, AcademyId, type AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { createAcademySnapshot, resolveAcademyAction } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { LUOYANG_GIMMICK, luoyangPayloadOf } from '../assets/scripts/core/systems/nurture/LuoyangGimmick';

const G = LUOYANG_GIMMICK;

function fresh(): AcademyStateSnapshot {
    return createAcademySnapshot({ worldSeed: 'ly', clanUuid: 'clan', childId: 'c1', academyId: AcademyId.LUOYANG, admissionTurn: 1,
        controlMode: AcademyControlMode.MANUAL, initialStats: { str: 10, lea: 10, int: 10, pol: 40, cha: 40 } }, G);
}

function act(s: AcademyStateSnapshot, id: string): AcademyStateSnapshot {
    return resolveAcademyAction(s, { actionType: 'GIMMICK_INTERACT', selectedOptionId: id }, G);
}

export function createLuoyangGimmickSuite(): TestSuite {
    const suite = new TestSuite('LuoyangGimmick (洛陽太學接線 doc_spec_0306 PROG-2-2016)');

    suite.test('訓練推進對應經卷並累積名望', () => {
        const s = resolveAcademyAction(fresh(), { actionType: 'TRAIN', targetStat: 'cha' }, G);
        assert.equals(20, luoyangPayloadOf(s).classicsProgress.SHIJING);
        assert.equals(30, luoyangPayloadOf(s).prestige);
    });

    suite.test('請益、拜謁、晉升串成一條路', () => {
        let s = fresh();
        luoyangPayloadOf(s).classicsProgress.SHIJING = 100;
        luoyangPayloadOf(s).prestige = 100;
        s = act(act(act(s, 'PETITION:SHIJING'), 'VISIT'), 'PROMOTE');
        assert.equals(7, luoyangPayloadOf(s).officialRank);
        assert.equals(0, luoyangPayloadOf(s).prestige);
        assert.isTrue(s.chronicles.some((c) => c.title === '官聲晉升'));
        let threw = false;
        try { act(s, 'PROMOTE'); } catch { threw = true; }
        assert.isTrue(threw);
    });

    suite.test('三品以上第 12 回合訓練借遺物', () => {
        const s = fresh();
        s.currentTurn = 12;
        luoyangPayloadOf(s).officialRank = 3;
        const r = G.onTrain(s, 'pol', undefined as never);
        assert.equals(240, r.statBonusPct);
        assert.equals(1, luoyangPayloadOf(s).relicsBorrowed.length);
        s.currentTurn = 13;
        assert.equals(205, G.onTrain(s, 'pol', undefined as never).statBonusPct);
        assert.equals(100, G.onTrain(s, 'str', undefined as never).statBonusPct);
    });

    suite.test('急功近利加政治並擲彈劾', () => {
        const before = fresh().stats.pol;
        const s = act(fresh(), 'SHORTCUT');
        assert.equals(before + 15, s.stats.pol);
        assert.equals(1, luoyangPayloadOf(s).shortcutCount);
    });

    suite.test('結業發放專屬戰法與特質', () => {
        const s = fresh();
        s.stats.cha = 90; s.stats.pol = 88;
        luoyangPayloadOf(s).officialRank = 1;
        G.onGraduate!(s);
        assert.equals('TAC_JIUPIN_ZHONGZHENG,TAC_GONGQING_WEIYI', s.learnedTactics.join(','));
        assert.equals('TRT_GUANMIAN_SHIZU', s.learnedTraits.join(','));
    });

    return suite;
}
