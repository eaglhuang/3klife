/**
 * AcademyPrestigeBenefit — 祠堂福祉接學府：精力上限 110、第 4 教官插槽（doc_spec_0310 §3；PROG-2-1914）
 */
import { assert, TestSuite } from './TestRunner';
import { AcademyControlMode, AcademyId, type AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { createAcademySnapshot, resolveAcademyAction } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { EssayCardCategory, assignYingchuanMentors, type YingchuanMentorDef } from '../assets/scripts/core/systems/nurture/YingchuanAcademy';
import { applyClanPrestigeToAcademy } from '../assets/scripts/core/systems/MvpLoopController';

function enroll(): AcademyStateSnapshot {
    return createAcademySnapshot({
        worldSeed: 'w', clanUuid: 'c', childId: 'kid', academyId: AcademyId.YINGCHUAN, admissionTurn: 1,
        controlMode: AcademyControlMode.MANUAL, initialStats: { str: 30, lea: 30, int: 30, pol: 30, cha: 30 },
    });
}

const mentor = (id: string): YingchuanMentorDef => ({ generalId: id, name: id, category: EssayCardCategory.SKY, signatureTactic: `TAC_${id}` });

export function createAcademyPrestigeBenefitSuite(): TestSuite {
    const suite = new TestSuite('AcademyPrestigeBenefit (祠堂福祉接學府 PROG-2-1914)');

    suite.test('Lv.3：精力上限 110 並補滿，休息可回到 110 以上 100', () => {
        const s = applyClanPrestigeToAcademy(enroll(), 3);
        assert.equals(110, s.energyMax);
        assert.equals(110, s.energy);
        const trained = resolveAcademyAction(s, { actionType: 'TRAIN', targetStat: 'str' });
        assert.isTrue(trained.energy < 110);
        const rested = resolveAcademyAction(trained, { actionType: 'REST' });
        assert.isTrue(rested.energy > 100 || rested.energy === Math.min(110, trained.energy + 30), `${trained.energy} → ${rested.energy}`);
        assert.isTrue(rested.energy <= 110);
        assert.equals(undefined, s.mentorSlots);
    });

    suite.test('Lv.4：可指派 4 位教官；未套用時 4 位被拒', () => {
        const four = [mentor('a'), mentor('b'), mentor('c'), mentor('d')];
        assert.throws(() => assignYingchuanMentors(enroll(), four));
        const s = applyClanPrestigeToAcademy(enroll(), 4);
        assert.equals(4, s.mentorSlots);
        assignYingchuanMentors(s, four);
        assert.throws(() => assignYingchuanMentors(s, [...four, mentor('e')]));
    });

    suite.test('Lv.1、2 不變；行動後再套用拋錯；不改輸入', () => {
        const base = enroll();
        assert.equals(JSON.stringify(base), JSON.stringify(applyClanPrestigeToAcademy(base, 2)));
        applyClanPrestigeToAcademy(base, 5);
        assert.equals(undefined, base.energyMax);
        assert.throws(() => applyClanPrestigeToAcademy(resolveAcademyAction(base, { actionType: 'REST' }), 5));
    });

    return suite;
}
