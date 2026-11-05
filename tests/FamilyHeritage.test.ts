/**
 * FamilyHeritage.test.ts — 父系家傳（PROG-2-1816）
 *
 * 鎖住：只列核心因子、被擠掉才補、不收費、與合譜互斥、受孕失敗不清選擇。
 */
import { assert, TestSuite } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { applyHeritageLock, heritageFactorsOf } from '../assets/scripts/core/systems/FamilyCompact';
import type { InheritedFactor } from '../assets/scripts/core/systems/FactorInheritance';
import type { GeneralConfig, GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';

const gene = (id: string, level: number, displayName: string, type = 'blue'): GeneralGeneConfig => ({ id, type, level, displayName, isLocked: true, discoveryLevel: 1 } as unknown as GeneralGeneConfig);
const person = (id: string, gender: string, genes: GeneralGeneConfig[], extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: id, faction: 'player', gender, age: 30, ep: 60, role: 'Combat', vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, hp: 1000, genes, ...extra,
} as unknown as GeneralConfig);
const BRAVE = gene('factor-brave', 4, '勇烈');
/** 父方 6 項因子超過子嗣上限 5；同星時依 id 排序，factor-brave 排最後 */
const crowded = (): GeneralConfig[] => [
    person('lord', '男', [gene('a1', 4, 'A1'), gene('a2', 4, 'A2'), gene('a3', 4, 'A3'), gene('a4', 4, 'A4'), gene('a5', 4, 'A5'), BRAVE]),
    person('bride', '女', []),
];
const factor = (id: string, level: number): InheritedFactor => ({ id, color: 'blue', level, generation: 1, sourceUids: ['x'] });
/** 受孕用第一個亂數，其餘都擲不中 */
const conceiveOnly = (): (() => number) => { let call = 0; return () => (call++ === 0 ? 0.01 : 0.99); };
const rig = (generals: GeneralConfig[], random: () => number) => {
    const roster = new InMemoryRosterStore(generals);
    const service = new BreedingService(roster, new BloodlineGraph(), { random });
    const wallet = { gold: 2000 };
    const flow = new BondingSetupController({
        roster, breeding: service, prepare: async () => service.syncGraphFromRoster(), persist: async () => undefined,
        gold: () => wallet.gold,
        spendGold: (amount) => { wallet.gold -= amount; return true; },
    });
    flow.selectFather('lord');
    flow.selectMother('bride');
    return { flow, wallet };
};
const pick = (flow: BondingSetupController, label: string): void => {
    for (let i = 0; i < 12 && flow.getView().texts.compactLabel !== label; i++) flow.cycleCompact();
    assert.equals(label, flow.getView().texts.compactLabel);
};

export function createFamilyHeritageSuite(): TestSuite {
    const suite = new TestSuite('FamilyHeritage (父系家傳 PROG-2-1816)');

    suite.test('只列藍、紅與自創金因子，順序照父親', () => {
        const father = { genes: [gene('b', 2, 'B'), gene('g', 2, 'G', 'green'), gene('r', 2, 'R', 'red'), gene('gold_clan_x', 2, 'X', 'white'), gene('w', 2, 'W', 'white')] };
        assert.equals('b,r,gold_clan_x', heritageFactorsOf(father).map((g) => g.id).join(','));
    });

    suite.test('已傳下不動；被擠掉時補回並照父親星數；父親沒有時不補', () => {
        const father = { id: 'lord', genes: [BRAVE] };
        const already = [factor('factor-brave', 1)];
        assert.isTrue(applyHeritageLock(already, 'factor-brave', father, { maxFactors: 5 }) === already);
        const full = ['a', 'b', 'c', 'd', 'e'].map((id) => factor(id, 3));
        const rescued = applyHeritageLock(full, 'factor-brave', father, { maxFactors: 5 });
        assert.equals('a,b,c,d,factor-brave', rescued.map((f) => f.id).join(','));
        assert.equals(4, rescued[4].level);
        assert.isTrue(applyHeritageLock(full, 'nope', father, { maxFactors: 5 }) === full);
    });

    suite.test('結緣：保住被擠掉的因子，不收費，提示寫保住，用完清掉選擇', async () => {
        const { flow, wallet } = rig(crowded(), conceiveOnly());
        pick(flow, '家傳：勇烈');
        assert.isTrue(flow.getView().texts.inbreedingLabel.indexOf('父系家傳：保 勇烈 傳給子嗣，不另收費') >= 0);
        const result = await flow.confirm();
        assert.isTrue((result.factors ?? []).some((f) => f.id === 'factor-brave'));
        assert.isTrue(result.heritageRescued === true);
        assert.isFalse(result.compactRescued === true);
        assert.equals(2000, wallet.gold);
        assert.isTrue(flow.getView().texts.bondNotice.indexOf('父系家傳：保住了 勇烈。') >= 0);
        assert.equals('門風：不用', flow.getView().texts.compactLabel);
    });

    suite.test('沒選就照舊被擠掉', async () => {
        const { flow } = rig(crowded(), conceiveOnly());
        const result = await flow.confirm();
        assert.isFalse((result.factors ?? []).some((f) => f.id === 'factor-brave'));
        assert.isFalse(result.heritageRescued === true);
    });

    suite.test('本來就傳下時提示本就傳下', async () => {
        const { flow } = rig([person('lord', '男', [BRAVE]), person('bride', '女', [])], conceiveOnly());
        pick(flow, '家傳：勇烈');
        const result = await flow.confirm();
        assert.isFalse(result.heritageRescued === true);
        assert.isTrue(flow.getView().texts.bondNotice.indexOf('父系家傳：勇烈 本就傳下。') >= 0);
    });

    suite.test('受孕失敗不清選擇', async () => {
        const { flow } = rig(crowded(), () => 0.999);
        pick(flow, '家傳：勇烈');
        const result = await flow.confirm();
        assert.equals('failed', result.outcome);
        assert.equals('家傳：勇烈', flow.getView().texts.compactLabel);
    });

    suite.test('服務層兩者都傳時合譜優先', () => {
        const generals = [person('lord', '男', [gene('a1', 4, 'A1'), gene('a2', 4, 'A2'), gene('a3', 4, 'A3'), gene('a4', 4, 'A4'), gene('a5', 4, 'A5'), BRAVE, gene('z-share', 1, '共')]), person('bride', '女', [gene('z-share', 1, '共')], { familyUid: '太原王' })];
        const service = new BreedingService(new InMemoryRosterStore(generals), new BloodlineGraph(), { random: conceiveOnly() });
        service.syncGraphFromRoster();
        const result = service.breed('lord', 'bride', undefined, 'z-share', 'factor-brave');
        assert.isTrue((result.factors ?? []).some((f) => f.id === 'z-share'));
        assert.isFalse((result.factors ?? []).some((f) => f.id === 'factor-brave'));
        assert.isTrue(result.compactRescued === true);
        assert.isFalse(result.heritageRescued === true);
    });

    return suite;
}
