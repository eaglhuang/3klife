/**
 * AcademyLegacySupport — 先祖傳奇教官接進學府總控（doc_spec_0310 §2.1，PROG-2-1908）
 *
 * Unity 對照：EditMode Test 直接驗證總控純函式。
 */
import { assert, TestSuite } from './TestRunner';
import { AcademyControlMode, AcademyId, type AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { ACADEMY_GENERIC_RITE_OPTIONS, createAcademySnapshot, resolveAcademyAction } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { attachLegacySupport, type ILegendaryMentorCard } from '../assets/scripts/core/systems/GenerationalLegacy';

const MENTOR: ILegendaryMentorCard = {
    mentorId: 'MENTOR_ANCESTOR_zhao-yun', sourceGeneralUid: 'zhao-yun', generalName: '趙雲（先祖）', finalRank: 5,
    inherentTacticId: 'TAC_LONGDAN', inherentTraitId: 'TRT_GANGYI_GUOGAN', statBonusPct: { str: 20, lea: 15 }, initialAffinity: 50,
};

function enroll(childId = 'child'): AcademyStateSnapshot {
    return createAcademySnapshot({
        worldSeed: 'legacy-world', clanUuid: 'clan', childId, academyId: AcademyId.YINGCHUAN, admissionTurn: 1,
        controlMode: AcademyControlMode.MANUAL, initialStats: { str: 30, lea: 30, int: 30, pol: 30, cha: 30 },
    });
}

/** 休息推進到弱冠禮；其他打斷點選第一個選項 */
function toComingOfAge(state: AcademyStateSnapshot): AcademyStateSnapshot {
    for (let guard = 0; guard < 200; guard++) {
        if (state.pendingInterrupt === 'COMING_OF_AGE') return state;
        state = state.pendingInterrupt
            ? resolveAcademyAction(state, { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: state.interruptOptions[0] })
            : resolveAcademyAction(state, { actionType: 'REST' });
    }
    throw new Error('沒有走到弱冠禮');
}

export function createAcademyLegacySupportSuite(): TestSuite {
    const suite = new TestSuite('AcademyLegacySupport (先祖傳承接學府 PROG-2-1908)');

    suite.test('掛上先祖支援：同屬性取最高、特質去重、只能入學當下掛、不改輸入', () => {
        const s0 = enroll();
        const s1 = attachLegacySupport(s0, [MENTOR, { ...MENTOR, statBonusPct: { str: 15, int: 20 } }]);
        assert.equals(20, s1.legacySupport!.statBonusPct.str);
        assert.equals(20, s1.legacySupport!.statBonusPct.int);
        assert.equals(15, s1.legacySupport!.statBonusPct.lea);
        assert.equals('TRT_GANGYI_GUOGAN', s1.legacySupport!.traitSeeds.join(','));
        assert.equals(undefined, s0.legacySupport);
        const moved = resolveAcademyAction(s0, { actionType: 'REST' });
        assert.throws(() => attachLegacySupport(moved, [MENTOR]));
    });

    suite.test('訓練加成：同一種子練武力，有先祖 +20% 的增益較高，練政治不受影響', () => {
        const plain = resolveAcademyAction(enroll(), { actionType: 'TRAIN', targetStat: 'str' });
        const boosted = resolveAcademyAction(attachLegacySupport(enroll(), [MENTOR]), { actionType: 'TRAIN', targetStat: 'str' });
        const base = plain.stats.str - 30;
        assert.isTrue(base > 0);
        const gain = boosted.stats.str - 30;
        assert.isTrue(gain > base && gain >= Math.floor(base * 1.2) && gain <= Math.ceil((base + 1) * 1.2), `${base} → ${gain}`);
        const polPlain = resolveAcademyAction(enroll(), { actionType: 'TRAIN', targetStat: 'pol' });
        const polBoost = resolveAcademyAction(attachLegacySupport(enroll(), [MENTOR]), { actionType: 'TRAIN', targetStat: 'pol' });
        assert.equals(polPlain.stats.pol, polBoost.stats.pol);
    });

    suite.test('弱冠禮：先祖特質依機率列入候選，選了寫入特質；候選數不變、結果可重播', () => {
        let hit = 0;
        let miss = 0;
        for (let i = 0; i < 12; i++) {
            const rite = toComingOfAge(attachLegacySupport(enroll(`child-${i}`), [MENTOR]));
            assert.equals(ACADEMY_GENERIC_RITE_OPTIONS.length, rite.interruptOptions.length);
            const again = toComingOfAge(attachLegacySupport(enroll(`child-${i}`), [MENTOR]));
            assert.equals(rite.interruptOptions.join(','), again.interruptOptions.join(','));
            if (rite.interruptOptions[0] === 'TRT_GANGYI_GUOGAN') {
                hit++;
                const done = resolveAcademyAction(rite, { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: 'TRT_GANGYI_GUOGAN' });
                assert.isTrue(done.learnedTraits.indexOf('TRT_GANGYI_GUOGAN') >= 0);
                assert.equals(-1, done.learnedTactics.indexOf('TRT_GANGYI_GUOGAN'));
            } else {
                miss++;
                assert.equals(-1, rite.interruptOptions.indexOf('TRT_GANGYI_GUOGAN'));
            }
        }
        assert.isTrue(hit > 0 && miss > 0, `中 ${hit}／未中 ${miss}`);
        const noLegacy = toComingOfAge(enroll('child-0'));
        assert.equals(ACADEMY_GENERIC_RITE_OPTIONS.join(','), noLegacy.interruptOptions.join(','));
    });

    return suite;
}
