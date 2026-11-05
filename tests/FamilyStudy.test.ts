import { TestSuite, assert } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { familyStudyBlock, familyStudyCandidates, familyStudyHint, familyStudyLine } from '../assets/scripts/core/systems/FamilyStudy';
import { NURTURE_TOTAL_ROUNDS, spendRoundsWithoutTraining, type NurtureSession } from '../assets/scripts/core/systems/NurtureSystem';
import { unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { NurtureFlowController } from '../assets/scripts/ui/core/NurtureFlowController';

const blue = (id: string, level: number) => ({ id, displayName: id, type: 'blue', level });

function rig() {
    const kid = unveilGeneral({
        id: 'kid', name: 'kid', faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'], genes: [blue('甲', 2), blue('乙', 1), blue('丙', 3)],
    } as unknown as UnveilingGeneral).general;
    const roster = new InMemoryRosterStore([kid as unknown as GeneralConfig]);
    const unveiling = new UnveilingService(roster, () => 0.5);
    unveiling.choose('kid', 'accept');
    const nurture = new NurtureService(roster, { random: () => 0.5, currentSeason: () => 3 });
    nurture.start('kid', []);
    const flow = new NurtureFlowController({ roster, unveiling, nurture, familyStudy: nurture, loadMentorCards: async () => [] });
    return { roster, nurture, flow };
}

const levelOf = (roster: InMemoryRosterStore, id: string) => roster.getAll()[0].genes!.find((g) => g.id === id)!.level;

export function createFamilyStudySuite(): TestSuite {
    const suite = new TestSuite('FamilyStudy');

    suite.test('候選只有未鎖定的 1★、2★ 藍因子，補 1 星', () => {
        const list = familyStudyCandidates([blue('a', 1), blue('b', 2), blue('c', 3), blue('d', 0), { id: 'r', type: 'red', level: 1 }, { ...blue('e', 1), isLocked: true }]);
        assert.equals('a,b', list.map((c) => c.geneId).join(','));
        assert.equals(2, list[0].starAfter);
        assert.equals(3, list[1].starAfter);
        assert.lengthEquals(1, familyStudyCandidates([{ id: 'old', type: '統率', level: 2 }]));
    });

    suite.test('擋下原因：結束、已用、負傷、回合不足、沒候選', () => {
        const active = { status: 'active', round: 10 };
        assert.equals('inactive', familyStudyBlock({ ...active, status: 'completed' }, 36, false, 1)!);
        assert.equals('used', familyStudyBlock(active, 36, true, 1)!);
        assert.equals('injured', familyStudyBlock({ ...active, skipRounds: 1 }, 36, false, 1)!);
        assert.equals('rounds', familyStudyBlock({ status: 'active', round: 35 }, 36, false, 1)!);
        assert.equals('no-candidate', familyStudyBlock(active, 36, false, 0)!);
        assert.isTrue(familyStudyBlock({ status: 'active', round: 34 }, 36, false, 1) === null);
    });

    suite.test('文案照 §G、§H', () => {
        const c = { geneId: 'x', displayName: '統御', starBefore: 2, starAfter: 3 };
        assert.equals('雖先天【統御】僅得二星之資，然經苦讀先祖兵書研習，終補全根基，晉升三星！', familyStudyLine(c));
        assert.equals('家學研習（消耗 2 季課業，確定將 統御 由 2★ 補救至 3★，上限 3★）', familyStudyHint(c));
    });

    suite.test('走兩回合不扣精力不加屬性；走到第 36 回合即完成', () => {
        const base = { sessionId: 's', status: 'active', round: 10, vigor: 33, tp: 7, mentors: [], log: [], mentorSlots: {} } as unknown as NurtureSession;
        const next = spendRoundsWithoutTraining(base, 2, () => 0.5);
        assert.equals(12, next.round);
        assert.equals(33, next.vigor);
        assert.equals(7, next.tp);
        assert.equals('active', next.status);
        assert.lengthEquals(2, next.log);
        assert.lengthEquals(0, base.log);
        assert.equals('completed', spendRoundsWithoutTraining({ ...base, round: NURTURE_TOTAL_ROUNDS - 2 }, 2, () => 0.5).status);
    });

    suite.test('服務：補星、記已用、走兩回合，不能再用，指定不能補的因子會擋', () => {
        const { roster, nurture } = rig();
        assert.isTrue(throws(() => nurture.familyStudy('kid', '丙')));
        const done = nurture.familyStudy('kid', '甲');
        assert.equals(3, done.starAfter);
        assert.equals(3, levelOf(roster, '甲'));
        assert.equals(1, levelOf(roster, '乙'));
        assert.equals(2, nurture.getSession('kid')!.round);
        assert.isTrue(roster.getAll()[0].familyStudyUsed === true);
        assert.equals('used', nurture.familyStudyStatus('kid').blocked!);
        assert.isTrue(throws(() => nurture.familyStudy('kid', '乙')));
    });

    suite.test('畫面：按鈕顯示目前因子，切換後顯示提示，研習後顯示劇本句並停用', async () => {
        const { roster, flow } = rig();
        flow.select('kid');
        let view = flow.getView();
        assert.equals('train', view.mode);
        assert.equals('家學研習：甲 2→3★', view.texts.familyStudyLabel);
        assert.isTrue(view.enabled.btnFamilyStudy);
        assert.isTrue(view.enabled.btnNextStudyFactor);
        flow.cycleStudyFactor();
        view = flow.getView();
        assert.equals('家學研習：乙 1→2★', view.texts.familyStudyLabel);
        await flow.familyStudy();
        assert.equals(2, levelOf(roster, '乙'));
        view = flow.getView();
        assert.equals('家學研習：此子已研習過', view.texts.familyStudyLabel);
        assert.isFalse(view.enabled.btnFamilyStudy);
        assert.isFalse(view.enabled.btnNextStudyFactor);
    });

    return suite;
}

function throws(run: () => unknown): boolean {
    try {
        run();
        return false;
    } catch {
        return true;
    }
}
