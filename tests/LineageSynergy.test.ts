/**
 * LineageSynergy.test.ts — 門風連攜（PROG-2-1818）
 *
 * 鎖住：只算雙親同持的藍因子、上限 4★、每胎一項、合譜優先、同血脈不走、不合格不耗亂數。
 */
import { assert, TestSuite } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { applyLineageSynergy, LINEAGE_SYNERGY_CHANCE, lineageSynergyHint, lineageSynergyLine, sharedBlueGenesOf } from '../assets/scripts/core/systems/LineageSynergy';
import type { InheritedFactor } from '../assets/scripts/core/systems/FactorInheritance';
import type { GeneralConfig, GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';

const gene = (id: string, displayName = id, type = 'blue'): GeneralGeneConfig => ({ id, type, level: 3, displayName, isLocked: true, discoveryLevel: 1 } as unknown as GeneralGeneConfig);
const factor = (id: string, level: number): InheritedFactor => ({ id, color: 'blue', level, generation: 1, sourceUids: ['x'] });
const person = (id: string, gender: string, genes: GeneralGeneConfig[], extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: id, faction: 'player', gender, age: 30, ep: 60, role: 'Combat', vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, hp: 1000, genes, ...extra,
} as unknown as GeneralConfig);
const HIT = () => LINEAGE_SYNERGY_CHANCE - 0.01;
const MISS = () => 0.99;
/** 能受孕、因子進池、星數擲低標 3★，連攜也擲中 */
const ROLL = () => 0.25;

export function createLineageSynergySuite(): TestSuite {
    const suite = new TestSuite('LineageSynergy (門風連攜 PROG-2-1818)');

    suite.test('只算雙親都帶的藍因子', () => {
        const father = { genes: [gene('both'), gene('dad'), gene('red', 'red', 'red')] };
        const mother = { genes: [gene('both'), gene('mom'), gene('red', 'red', 'red')] };
        assert.equals('both', sharedBlueGenesOf(father, mother).map((g) => g.id).join(','));
    });

    suite.test('擲中 ★+1，擲不中原樣回傳', () => {
        const parents = { genes: [gene('a')] };
        const factors = [factor('a', 3)];
        const hit = applyLineageSynergy(factors, parents, parents, { random: HIT });
        assert.equals(4, hit.factors[0].level);
        assert.equals('a', hit.risen!.id);
        const miss = applyLineageSynergy(factors, parents, parents, { random: MISS });
        assert.isTrue(miss.factors === factors);
        assert.isTrue(miss.risen === null);
    });

    suite.test('已到 4★ 或因子上限時不判，也不耗亂數', () => {
        const parents = { genes: [gene('a')] };
        let rolls = 0;
        const random = () => { rolls++; return 0; };
        assert.isTrue(applyLineageSynergy([factor('a', 4)], parents, parents, { random }).risen === null);
        const dictionary = { get: () => ({ maxLevel: 3 }) } as unknown as Parameters<typeof applyLineageSynergy>[3]['dictionary'];
        assert.isTrue(applyLineageSynergy([factor('a', 3)], parents, parents, { random, dictionary }).risen === null);
        assert.isTrue(applyLineageSynergy([factor('b', 1)], parents, parents, { random }).risen === null);
        assert.equals(0, rolls);
    });

    suite.test('每胎一項：預設最高星，世交合譜鎖定的優先', () => {
        const parents = { genes: [gene('a'), gene('b')] };
        const factors = [factor('a', 3), factor('b', 2)];
        const auto = applyLineageSynergy(factors, parents, parents, { random: HIT });
        assert.equals('4,2', auto.factors.map((f) => f.level).join(','));
        const locked = applyLineageSynergy(factors, parents, parents, { random: HIT, priorityId: 'b' });
        assert.equals('3,3', locked.factors.map((f) => f.level).join(','));
    });

    suite.test('結緣：外婚擲中時子嗣升星；同血脈不走連攜', async () => {
        const breedWith = async (extra: Record<string, unknown>) => {
            const generals = [person('lord', '男', [gene('both')], extra), person('bride', '女', [gene('both')], extra)];
            const service = new BreedingService(new InMemoryRosterStore(generals), new BloodlineGraph(), { random: ROLL });
            await service.syncGraphFromRoster();
            return service.breed('lord', 'bride');
        };
        const open = await breedWith({});
        assert.equals('both', open.lineageSynergyFactorId!);
        assert.equals(4, open.child!.genes!.find((g) => g.id === 'both')!.level!);
        const inbred = await breedWith({ bloodlineId: 'same' });
        assert.isTrue(inbred.lineageSynergyFactorId === undefined);
    });

    suite.test('畫面：預覽列出可連攜因子，出生提示顯示連攜句', async () => {
        const generals = [person('lord', '男', [gene('both', '經緯')]), person('bride', '女', [gene('both', '經緯')])];
        const roster = new InMemoryRosterStore(generals);
        const service = new BreedingService(roster, new BloodlineGraph(), { random: ROLL });
        const flow = new BondingSetupController({ roster, breeding: service, prepare: async () => service.syncGraphFromRoster(), persist: async () => undefined });
        flow.selectFather('lord');
        flow.selectMother('bride');
        await flow.open();
        assert.isTrue(flow.getView().texts.epDetail.includes('門風連攜：經緯'));
        const result = await flow.confirm();
        assert.equals('both', result.lineageSynergyFactorId!);
        assert.isTrue(flow.getView().texts.bondNotice.includes(lineageSynergyLine('經緯')));
    });

    suite.test('沒有同持因子時預覽不顯示', () => {
        assert.isTrue(lineageSynergyHint([]) === null);
    });

    return suite;
}
