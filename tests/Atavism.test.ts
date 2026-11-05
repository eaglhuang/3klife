/**
 * Atavism.test.ts — 隔代復興（PROG-2-1815）
 *
 * 鎖住：斷代判定、出生定值、祖先離開名冊仍接得上、衝刺期才開、與家學研習共用名額、保底 2 星。
 */
import { assert, TestSuite } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import type { AncestralPeak, GeneralConfig, GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';
import { atavismCandidates, atavismSeedsOf, peakFactorsOf, studyHintOf, studyLineOf } from '../assets/scripts/core/systems/Atavism';
import { spendRoundsWithoutTraining } from '../assets/scripts/core/systems/NurtureSystem';
import { unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { NurtureFlowController } from '../assets/scripts/ui/core/NurtureFlowController';

const blue = (id: string, level: number): GeneralGeneConfig => ({ id, displayName: id, type: 'blue', level } as unknown as GeneralGeneConfig);
const peak = (id: string, level: number, ancestorName = '老太公'): AncestralPeak => ({ gene: blue(id, level), ancestorName });
const person = (id: string, gender: string, genes: GeneralGeneConfig[], extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: id, faction: 'player', gender, age: 30, ep: 60, role: 'Combat', vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, hp: 1000, genes, ...extra,
} as unknown as GeneralConfig);
/** 受孕用第一個亂數，其餘都擲不中 */
const conceiveOnly = (): (() => number) => { let call = 0; return () => (call++ === 0 ? 0.01 : 0.99); };
const birth = (generals: GeneralConfig[]): GeneralConfig => {
    const service = new BreedingService(new InMemoryRosterStore(generals), new BloodlineGraph(), { random: conceiveOnly() });
    service.syncGraphFromRoster();
    const result = service.breed('father', 'mother');
    assert.equals('conceived', result.outcome);
    return result.child as GeneralConfig;
};

function rig(genes: GeneralGeneConfig[], seeds: AncestralPeak[], round: number) {
    const kid = unveilGeneral({
        id: 'kid', name: 'kid', faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'], genes, atavismSeeds: seeds,
    } as unknown as UnveilingGeneral).general;
    const roster = new InMemoryRosterStore([kid as unknown as GeneralConfig]);
    const unveiling = new UnveilingService(roster, () => 0.5);
    unveiling.choose('kid', 'accept');
    const nurture = new NurtureService(roster, { random: () => 0.5, currentSeason: () => 3 });
    const session = nurture.start('kid', []);
    (nurture as unknown as { _replace(next: unknown): void })._replace(spendRoundsWithoutTraining(session, round, () => 0.5));
    const flow = new NurtureFlowController({ roster, unveiling, nurture, familyStudy: nurture, loadMentorCards: async () => [] });
    return { roster, nurture, flow };
}

export function createAtavismSuite(): TestSuite {
    const suite = new TestSuite('Atavism (隔代復興 PROG-2-1815)');

    suite.test('高星只算 3★ 以上', () => {
        assert.equals('c', peakFactorsOf([blue('b', 2), blue('c', 3)], 'x').map((p) => p.gene.id).join(','));
        assert.lengthEquals(0, peakFactorsOf(undefined, 'x'));
    });

    suite.test('雙親斷代或 1★ 才算種子，任一方 2★ 不算；同因子留最高星', () => {
        const peaks = [peak('gone', 3), peak('weak', 3), peak('kept', 3), peak('gone', 4, '曾任名將')];
        const seeds = atavismSeedsOf(peaks, [blue('weak', 1)], [blue('kept', 2)]);
        assert.equals('gone,weak', seeds.map((s) => s.gene.id).join(','));
        assert.equals('曾任名將', seeds[0].ancestorName);
    });

    suite.test('出生定值：祖父在名冊裡，孫輩帶種子；雙親高星寫進 peakFactors', () => {
        const child = birth([
            person('gp', '男', [blue('祖傳', 3)]),
            person('father', '男', [blue('父長', 3)], { fatherId: 'gp' }),
            person('mother', '女', []),
        ]);
        assert.equals('祖傳', child.atavismSeeds![0].gene.id);
        assert.equals('gp', child.atavismSeeds![0].ancestorName);
        assert.equals('父長', child.peakFactors![0].gene.id);
    });

    suite.test('祖先已離開名冊，靠父親身上的紀錄仍接得上', () => {
        const child = birth([
            person('father', '男', [], { peakFactors: [peak('祖傳', 3)] }),
            person('mother', '女', []),
        ]);
        assert.equals('老太公', child.atavismSeeds![0].ancestorName);
    });

    suite.test('父親還有 2★ 就不算斷代；沒有高星祖先不寫欄位', () => {
        const kept = birth([
            person('gp', '男', [blue('祖傳', 3)]),
            person('father', '男', [blue('祖傳', 2)], { fatherId: 'gp' }),
            person('mother', '女', []),
        ]);
        assert.isTrue(kept.atavismSeeds === undefined);
        const plain = birth([person('father', '男', []), person('mother', '女', [])]);
        assert.isTrue(plain.peakFactors === undefined);
    });

    suite.test('衝刺期才開、回合要夠 3 回、已有 2★ 或欄位滿了不列', () => {
        const seeds = [peak('祖傳', 3)];
        assert.lengthEquals(0, atavismCandidates(23, 36, [], seeds));
        assert.equals(0, atavismCandidates(24, 36, [], seeds)[0].starBefore);
        assert.equals(2, atavismCandidates(33, 36, [], seeds)[0].starAfter);
        assert.lengthEquals(0, atavismCandidates(34, 36, [], seeds));
        assert.lengthEquals(0, atavismCandidates(24, 36, [blue('祖傳', 2)], seeds));
        const full = ['a', 'b', 'c', 'd', 'e'].map((id) => blue(id, 3));
        assert.lengthEquals(0, atavismCandidates(24, 36, full, seeds));
        assert.equals(1, atavismCandidates(24, 36, [blue('a', 3), blue('祖傳', 1)], seeds)[0].starBefore);
    });

    suite.test('服務：斷代因子補回 2★、走 3 回合、與家學研習共用名額', () => {
        const { roster, nurture } = rig([blue('甲', 1)], [peak('祖傳', 3)], 24);
        assert.equals('甲,祖傳', nurture.familyStudyStatus('kid').candidates.map((c) => c.geneId).join(','));
        const done = nurture.familyStudy('kid', '祖傳');
        assert.equals('老太公', done.ancestorName!);
        const gene = roster.getAll()[0].genes!.find((g) => g.id === '祖傳')!;
        assert.equals(2, gene.level!);
        assert.equals(27, nurture.getSession('kid')!.round);
        assert.equals('used', nurture.familyStudyStatus('kid').blocked!);
    });

    suite.test('先用家學研習就不能再隔代復興；同因子兩邊都能補時走家學研習', () => {
        const { nurture } = rig([blue('甲', 1)], [peak('甲', 3), peak('祖傳', 3)], 24);
        const list = nurture.familyStudyStatus('kid').candidates;
        assert.equals('甲,祖傳', list.map((c) => c.geneId).join(','));
        assert.isTrue(list[0].ancestorName === undefined);
        nurture.familyStudy('kid', '甲');
        assert.equals(26, nurture.getSession('kid')!.round);
        assert.equals('used', nurture.familyStudyStatus('kid').blocked!);
    });

    suite.test('衝刺期前按鈕看不到；畫面顯示隔代復興與劇本句', async () => {
        assert.equals('no-candidate', rig([], [peak('祖傳', 3)], 10).nurture.familyStudyStatus('kid').blocked!);
        const { flow } = rig([], [peak('祖傳', 3)], 24);
        flow.select('kid');
        assert.equals('隔代復興：祖傳 0→2★', flow.getView().texts.familyStudyLabel);
        assert.isTrue(flow.getView().enabled.btnFamilyStudy);
        await flow.familyStudy();
        assert.equals('家學研習：此子已研習過', flow.getView().texts.familyStudyLabel);
    });

    suite.test('文案照 §G', () => {
        const candidate = { geneId: 'x', displayName: '統御', starBefore: 0, starAfter: 2, ancestorName: '趙雲' };
        assert.equals('奇哉！此子父母雖未顯山露水，然其演武之姿，竟與昔年趙雲如出一轍！真乃【隔代復興，有乃祖之風】！', studyLineOf(candidate));
        assert.equals('隔代復興（消耗 3 季課業，與家學研習共用名額，重現 趙雲 的 統御，保底 2★）', studyHintOf(candidate));
    });

    return suite;
}
