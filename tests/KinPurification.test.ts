/**
 * KinPurification.test.ts — 外戚血脈純化（PROG-2-1819）
 *
 * 鎖住：共祖列表、只算共祖藍因子、上限 5★、每胎一項、同血脈不走、中了不再判連攜、畫面文字。
 */
import { assert, TestSuite } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { applyKinPurification, KIN_PURIFICATION_CHANCE, kinPurificationHint, kinPurificationLine, kinPurificationTargetsOf } from '../assets/scripts/core/systems/KinPurification';
import type { InheritedFactor } from '../assets/scripts/core/systems/FactorInheritance';
import type { GeneralConfig, GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';

const gene = (id: string, displayName = id, type = 'blue'): GeneralGeneConfig => ({ id, type, level: 3, displayName, isLocked: true, discoveryLevel: 1 } as unknown as GeneralGeneConfig);
const factor = (id: string, level: number): InheritedFactor => ({ id, color: 'blue', level, generation: 1, sourceUids: ['x'] });
const person = (id: string, gender: string, genes: GeneralGeneConfig[], fatherId = '', extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: id, faction: 'player', gender, age: 30, ep: 60, role: 'Combat', vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, hp: 1000, genes, fatherId, motherId: '', ...extra,
} as unknown as GeneralConfig);
const target = (id: string, ancestorName = '老祖') => ({ gene: gene(id), ancestorName });
const HIT = () => KIN_PURIFICATION_CHANCE - 0.01;
const MISS = () => 0.99;
/** 老祖往下各傳四代到 lord 與 bride：共祖距離 4，過得了 3 代封鎖 */
const clan = (bride: GeneralGeneConfig[], lord: GeneralGeneConfig[], extra: Record<string, unknown> = {}): GeneralConfig[] => [
    person('anc', '男', [gene('祖傳', '祖傳絕學')]),
    person('a1', '男', [], 'anc'), person('a2', '男', [], 'a1'), person('a3', '男', [], 'a2'), person('lord', '男', lord, 'a3', extra),
    person('b1', '男', [], 'anc'), person('b2', '男', [], 'b1'), person('b3', '男', [], 'b2'), person('bride', '女', bride, 'b3', extra),
];

export function createKinPurificationSuite(): TestSuite {
    const suite = new TestSuite('KinPurification (外戚血脈純化 PROG-2-1819)');

    suite.test('共祖列表由近到遠，不含本人與不相干的人', () => {
        const graph = new BloodlineGraph();
        const generals = clan([], []);
        const service = new BreedingService(new InMemoryRosterStore(generals), graph, { random: MISS });
        service.syncGraphFromRoster();
        assert.equals('anc', graph.commonAncestors('lord', 'bride', 4).join(','));
        assert.lengthEquals(0, graph.commonAncestors('lord', 'bride', 3));
        assert.lengthEquals(0, graph.commonAncestors('lord', 'lord', 4));
    });

    suite.test('只列共祖的藍因子；同項取最近的共祖', () => {
        const near = person('near', '男', [gene('a'), gene('r', 'r', 'red')]);
        const far = person('far', '男', [gene('a'), gene('b')]);
        const lookup = (uid: string) => [near, far].find((g) => g.id === uid);
        const targets = kinPurificationTargetsOf(['near', 'far', 'gone'], lookup);
        assert.equals('a:near,b:far', targets.map((t) => `${t.gene.id}:${t.ancestorName}`).join(','));
    });

    suite.test('擲中 ★+1，上限 5★；擲不中或沒得判時不動', () => {
        const hit = applyKinPurification([factor('a', 4)], [target('a')], { random: HIT });
        assert.equals(5, hit.factors[0].level);
        assert.equals('老祖', hit.outcome!.ancestorName);
        const factors = [factor('a', 4)];
        assert.isTrue(applyKinPurification(factors, [target('a')], { random: MISS }).factors === factors);
        let rolls = 0;
        const random = () => { rolls++; return 0; };
        assert.isTrue(applyKinPurification([factor('a', 5)], [target('a')], { random }).outcome === null);
        assert.isTrue(applyKinPurification([factor('b', 1)], [target('a')], { random }).outcome === null);
        assert.equals(0, rolls);
    });

    suite.test('每胎一項：預設最高星，鎖定的優先', () => {
        const factors = [factor('a', 3), factor('b', 2)];
        const targets = [target('a'), target('b')];
        assert.equals('4,2', applyKinPurification(factors, targets, { random: HIT }).factors.map((f) => f.level).join(','));
        assert.equals('3,3', applyKinPurification(factors, targets, { random: HIT, priorityId: 'b' }).factors.map((f) => f.level).join(','));
    });

    suite.test('結緣：有共祖且帶到因子時升星；中了不再判門風連攜', async () => {
        const held = [gene('祖傳', '祖傳絕學')];
        const service = new BreedingService(new InMemoryRosterStore(clan(held, held)), new BloodlineGraph(), { random: () => 0.25 });
        await service.syncGraphFromRoster();
        const result = service.breed('lord', 'bride');
        assert.equals('conceived', result.outcome);
        assert.equals('祖傳', result.kinPurification!.factorId);
        assert.isTrue(result.lineageSynergyFactorId === undefined);
    });

    suite.test('同血脈不走外戚純化', async () => {
        const held = [gene('祖傳', '祖傳絕學')];
        const service = new BreedingService(new InMemoryRosterStore(clan(held, held, { bloodlineId: 'same' })), new BloodlineGraph(), { random: () => 0.25 });
        await service.syncGraphFromRoster();
        assert.lengthEquals(0, service.kinPurificationTargets('lord', 'bride'));
        assert.isTrue(service.breed('lord', 'bride').kinPurification === undefined);
    });

    suite.test('畫面：預覽列出共祖與因子，出生提示顯示純化句', async () => {
        const held = [gene('祖傳', '祖傳絕學')];
        const roster = new InMemoryRosterStore(clan(held, held));
        const service = new BreedingService(roster, new BloodlineGraph(), { random: () => 0.25 });
        const flow = new BondingSetupController({ roster, breeding: service, prepare: async () => service.syncGraphFromRoster(), persist: async () => undefined });
        flow.selectFather('lord');
        flow.selectMother('bride');
        await flow.open();
        assert.isTrue(flow.getView().texts.inbreedingLabel.includes('血脈純化：外戚共祖 anc（祖傳絕學）'));
        await flow.confirm();
        assert.isTrue(flow.getView().texts.bondNotice.includes(kinPurificationLine({ factorId: '祖傳', factorName: '祖傳絕學', ancestorName: 'anc', star: 4 })));
    });

    suite.test('沒有共祖因子時預覽不顯示', () => {
        assert.isTrue(kinPurificationHint([]) === null);
    });

    return suite;
}
