/**
 * GenerationalLegacy — 先祖教官傳承萃取與雙柱血脈共鳴（doc_spec_0310 TC-LEGACY-01、03，PROG-2-1906）
 *
 * Unity 對照：EditMode Test 直接驗證 Factory 與配方表。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import {
    applyLegacyTrainBonus,
    extractLegendaryMentor,
    legendaryMentorToYingchuan,
    resolveDualPillarResonance,
    topTwoLegacyStats,
} from '../assets/scripts/core/systems/GenerationalLegacy';
import { EssayCardCategory, yingchuanStateOf, assignYingchuanMentors, YINGCHUAN_GIMMICK } from '../assets/scripts/core/systems/nurture/YingchuanAcademy';
import { AcademyControlMode, AcademyId } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { createAcademySnapshot } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';

function zhaoYunCard(): MentorCard {
    const g = {
        id: 'zhao-yun', name: '趙雲', str: 96, int: 76, lea: 91, pol: 65, cha: 88,
        generalRank: 5, tacticId: 'TAC_BASE', learnedTactics: ['TAC_LONGDAN'], coreFactorTag: 'TRT_GANGYI_GUOGAN',
    } as unknown as GeneralConfig;
    return {
        uid: 'mentor-zhao-yun', sourceGeneralId: 'zhao-yun', name: '趙雲', faction: 'shu',
        retiredAge: 65, retiredSeason: 0, retiredYear: 0, ep_snapshot: 90, gene_refs: [], parentUids: ['', ''],
        generalSnapshot: g,
    } as unknown as MentorCard;
}

export function createGenerationalLegacySuite(): TestSuite {
    const suite = new TestSuite('GenerationalLegacy (世代傳承教官 PROG-2-1906)');

    suite.test('TC-LEGACY-01：趙雲退役 → 起始羈絆 50、固有戰法龍膽、加成含武力與統率', () => {
        const m = extractLegendaryMentor(zhaoYunCard(), { isBloodline: true });
        assert.equals(50, m.initialAffinity);
        assert.equals('TAC_LONGDAN', m.inherentTacticId);
        assert.equals('TRT_GANGYI_GUOGAN', m.inherentTraitId);
        assert.equals(20, m.statBonusPct.str);
        assert.equals(15, m.statBonusPct.lea);
        assert.equals(5, m.finalRank);
        assert.equals('趙雲（先祖）', m.generalName);
        assert.equals(0, extractLegendaryMentor(zhaoYunCard(), { isBloodline: false }).initialAffinity);
        assert.equals('TAC_X', extractLegendaryMentor(zhaoYunCard(), { isBloodline: true, tacticId: 'TAC_X' }).inherentTacticId);
    });

    suite.test('五維最高兩項同分依固定順序；訓練加成只套對應屬性', () => {
        assert.equals('str,int', topTwoLegacyStats({ str: 50, int: 50, lea: 50 } as unknown as GeneralConfig).join(','));
        const m = extractLegendaryMentor(zhaoYunCard(), { isBloodline: true });
        assert.equals(12, applyLegacyTrainBonus(10, 'str', m));
        assert.equals(12, applyLegacyTrainBonus(10, 'lea', m));
        assert.equals(10, applyLegacyTrainBonus(10, 'int', m));
    });

    suite.test('先祖教官進潁川書院：起始羈絆 50', () => {
        const def = legendaryMentorToYingchuan(extractLegendaryMentor(zhaoYunCard(), { isBloodline: true }))!;
        assert.equals(EssayCardCategory.SKY, def.category);
        assert.equals('TAC_LONGDAN', def.signatureTactic);
        const s0 = createAcademySnapshot({ worldSeed: 'w', clanUuid: 'clan', childId: 'child', academyId: AcademyId.YINGCHUAN, admissionTurn: 60,
            controlMode: AcademyControlMode.MANUAL, initialStats: { str: 10, lea: 10, int: 10, pol: 10, cha: 10 } }, YINGCHUAN_GIMMICK);
        const s1 = assignYingchuanMentors(s0, [def]);
        assert.equals(50, yingchuanStateOf(s1).mentors[0].bond);
        const none = { ...extractLegendaryMentor(zhaoYunCard(), { isBloodline: true }), inherentTacticId: null };
        assert.equals(null, legendaryMentorToYingchuan(none));
    });

    suite.test('TC-LEGACY-03：龍膽＋神算、親密度 ≥80、EP ≥85 → 七星龍膽破', () => {
        const ok = resolveDualPillarResonance({ paternalFactor: '龍膽', maternalFactor: '神算', paternalAffinity: 80, maternalAffinity: 90, ep: 85 });
        assert.equals('七星龍膽破', ok!.name);
        const swapped = resolveDualPillarResonance({ paternalFactor: '神算', maternalFactor: '龍膽', paternalAffinity: 80, maternalAffinity: 80, ep: 90 });
        assert.equals('ULT_QIXING_LONGDAN_PO', swapped!.ultimateId);
        assert.equals(null, resolveDualPillarResonance({ paternalFactor: '龍膽', maternalFactor: '神算', paternalAffinity: 79, maternalAffinity: 90, ep: 90 }));
        assert.equals(null, resolveDualPillarResonance({ paternalFactor: '龍膽', maternalFactor: '神算', paternalAffinity: 90, maternalAffinity: 90, ep: 84 }));
        assert.equals(null, resolveDualPillarResonance({ paternalFactor: '龍膽', maternalFactor: '武聖', paternalAffinity: 90, maternalAffinity: 90, ep: 90 }));
        assert.equals('青龍鎮國策', resolveDualPillarResonance({ paternalFactor: '武聖', maternalFactor: '王佐', paternalAffinity: 90, maternalAffinity: 90, ep: 90 })!.name);
    });

    return suite;
}
