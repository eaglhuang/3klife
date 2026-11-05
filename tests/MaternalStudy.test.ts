/**
 * MaternalStudy.test.ts — 母門擇承（PROG-2-1817）
 *
 * 鎖住：認母親與舅氏、只開第 1 回合、只看第一位教官、1★ 寫入、走 3 回合、與家學研習名額分開、出生定值。
 */
import { assert, TestSuite } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { GeneralConfig, GeneralGeneConfig, MaternalLine } from '../assets/scripts/core/models/GeneralUnit';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { isMaternalTutor, maternalCandidates, maternalHint, maternalLineText } from '../assets/scripts/core/systems/MaternalStudy';
import { spendRoundsWithoutTraining } from '../assets/scripts/core/systems/NurtureSystem';
import { unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { NurtureFlowController } from '../assets/scripts/ui/core/NurtureFlowController';

const blue = (id: string, level: number): GeneralGeneConfig => ({ id, displayName: id, type: 'blue', level } as unknown as GeneralGeneConfig);
/** 祖先的因子已覺醒（isLocked: false），寫給子嗣時不能跟著覺醒 */
const LINE: MaternalLine = { motherId: 'mom', motherParentIds: ['gpa', 'gma'], factors: [{ gene: { ...blue('外家', 3), isLocked: false }, ancestorName: '外祖' }, { gene: blue('甲', 3), ancestorName: '母' }] };
const person = (id: string, gender: string, genes: GeneralGeneConfig[], extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: id, faction: 'player', gender, age: 30, ep: 60, role: 'Combat', vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, hp: 1000, genes, ...extra,
} as unknown as GeneralConfig);
const conceiveOnly = (): (() => number) => { let call = 0; return () => (call++ === 0 ? 0.01 : 0.99); };
const card = (id: string, parentUids: [string, string]): MentorCard => ({
    uid: `mentor-${id}`, sourceGeneralId: id, name: id, faction: 'shu', retiredAge: 65, retiredSeason: 0, retiredYear: 0, ep_snapshot: 60, gene_refs: [], parentUids,
    generalSnapshot: { id, name: id, str: 60, int: 50, lea: 50, pol: 50, cha: 50 },
} as unknown as MentorCard);

function rig(genes: GeneralGeneConfig[], cards: MentorCard[], extra: Record<string, unknown> = {}) {
    const kid = unveilGeneral({
        id: 'kid', name: 'kid', faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'], genes, maternalLine: LINE, ...extra,
    } as unknown as UnveilingGeneral).general;
    const roster = new InMemoryRosterStore([kid as unknown as GeneralConfig]);
    const unveiling = new UnveilingService(roster, () => 0.5);
    unveiling.choose('kid', 'accept');
    const nurture = new NurtureService(roster, { random: () => 0.5, currentSeason: () => 3, currentMode: () => GameTimeMode.Nurture, requireNurtureMode: true });
    nurture.startWithCards('kid', cards);
    const flow = new NurtureFlowController({ roster, unveiling, nurture, familyStudy: nurture, loadMentorCards: async () => [] });
    return { roster, nurture, flow };
}

export function createMaternalStudySuite(): TestSuite {
    const suite = new TestSuite('MaternalStudy (母門擇承 PROG-2-1817)');

    suite.test('母親本人與同父或同母的舅氏才算；空字串父母不算', () => {
        assert.isTrue(isMaternalTutor({ generalId: 'mom', parentUids: [] }, LINE));
        assert.isTrue(isMaternalTutor({ generalId: 'uncle', parentUids: ['gpa', 'x'] }, LINE));
        assert.isTrue(isMaternalTutor({ generalId: 'half', parentUids: ['y', 'gma'] }, LINE));
        assert.isFalse(isMaternalTutor({ generalId: 'other', parentUids: ['y', 'z'] }, LINE));
        assert.isFalse(isMaternalTutor({ generalId: 'other', parentUids: ['', ''] }, { ...LINE, motherParentIds: [''] }));
        assert.isFalse(isMaternalTutor(undefined, LINE));
    });

    suite.test('只開第 1 回合，已用過不列，子嗣已有的不列，欄位滿了不列', () => {
        const tutor = { generalId: 'mom', parentUids: [] };
        assert.equals('外家,甲', maternalCandidates(0, false, [], LINE, tutor).map((c) => c.geneId).join(','));
        assert.lengthEquals(0, maternalCandidates(1, false, [], LINE, tutor));
        assert.lengthEquals(0, maternalCandidates(0, true, [], LINE, tutor));
        assert.equals('外家', maternalCandidates(0, false, [blue('甲', 1)], LINE, tutor).map((c) => c.geneId).join(','));
        assert.lengthEquals(0, maternalCandidates(0, false, ['a', 'b', 'c', 'd', 'e'].map((id) => blue(id, 1)), LINE, tutor));
    });

    suite.test('出生定值：母親與外祖父的高星因子都進來，並記下母親的父母', () => {
        const generals = [
            person('gpa', '男', [blue('外家', 3)]),
            person('father', '男', []),
            person('mother', '女', [blue('母長', 4)], { fatherId: 'gpa' }),
        ];
        const service = new BreedingService(new InMemoryRosterStore(generals), new BloodlineGraph(), { random: conceiveOnly() });
        service.syncGraphFromRoster();
        const line = (service.breed('father', 'mother').child as GeneralConfig).maternalLine!;
        assert.equals('mother', line.motherId);
        assert.equals('gpa', line.motherParentIds.join(','));
        assert.equals('母長,外家', line.factors.map((f) => f.gene.id).join(','));
        assert.equals('gpa', line.factors[1].ancestorName);
    });

    suite.test('母系沒有高星因子時不寫欄位', () => {
        const service = new BreedingService(new InMemoryRosterStore([person('father', '男', [blue('父', 3)]), person('mother', '女', [])]), new BloodlineGraph(), { random: conceiveOnly() });
        service.syncGraphFromRoster();
        assert.isTrue((service.breed('father', 'mother').child as GeneralConfig).maternalLine === undefined);
    });

    suite.test('服務：第一位教官是舅氏才列；1★ 寫入、走 3 回合、家學研習名額還在', () => {
        const { roster, nurture } = rig([blue('乙', 1)], [card('uncle', ['gpa', ''])]);
        assert.equals('乙,外家,甲', nurture.familyStudyStatus('kid').candidates.map((c) => c.geneId).join(','));
        const done = nurture.familyStudy('kid', '外家');
        assert.equals('外祖', done.maternalFrom!);
        const child = roster.getAll()[0];
        const written = child.genes!.find((g) => g.id === '外家')!;
        assert.equals(1, written.level!);
        assert.isTrue(written.isLocked === true);
        assert.isTrue(child.maternalStudyUsed === true);
        assert.isFalse(child.familyStudyUsed === true);
        assert.equals(3, nurture.getSession('kid')!.round);
        const after = nurture.familyStudyStatus('kid');
        assert.isTrue(after.blocked === null);
        assert.equals('乙', after.candidates.map((c) => c.geneId).join(','));
    });

    suite.test('第一位教官不是母系就不列，第二位是也不算', () => {
        const { nurture } = rig([], [card('other', ['y', 'z']), card('mom', ['gpa', 'gma'])]);
        assert.equals('no-candidate', nurture.familyStudyStatus('kid').blocked!);
    });

    suite.test('家學研習用過，第 1 回合仍可母門擇承（重修），家學研習不再列出', () => {
        const { nurture } = rig([blue('乙', 1)], [card('mom', ['gpa', 'gma'])], { familyStudyUsed: true });
        const status = nurture.familyStudyStatus('kid');
        assert.isTrue(status.blocked === null);
        assert.equals('外家,甲', status.candidates.map((c) => c.geneId).join(','));
    });

    suite.test('過了第 1 回合就關閉', () => {
        const { nurture } = rig([], [card('mom', ['gpa', 'gma'])]);
        const session = nurture.getSession('kid')!;
        (nurture as unknown as { _replace(next: unknown): void })._replace(spendRoundsWithoutTraining(session, 1, () => 0.5));
        assert.equals('no-candidate', nurture.familyStudyStatus('kid').blocked!);
    });

    suite.test('畫面：按鈕顯示母門擇承，切換可看提示，選後寫入劇本句', async () => {
        const { flow } = rig([], [card('mom', ['gpa', 'gma'])]);
        flow.select('kid');
        assert.equals('母門擇承：外家 0→1★', flow.getView().texts.familyStudyLabel);
        assert.isTrue(flow.getView().enabled.btnNextStudyFactor);
        await flow.familyStudy();
        assert.equals('家學研習：無可補救的因子', flow.getView().texts.familyStudyLabel);
    });

    suite.test('文案', () => {
        const candidate = { geneId: 'x', displayName: '統御', starBefore: 0, starAfter: 1, maternalFrom: '夏侯淵' };
        assert.equals('母門擇承（消耗開蒙首 3 季課業，向外家請益，承襲 夏侯淵 的 統御，1★）', maternalHint(candidate));
        assert.equals('外家學問淵源有自，此子開蒙便得夏侯淵一脈真傳，【統御】自此入門！', maternalLineText(candidate));
    });

    return suite;
}
