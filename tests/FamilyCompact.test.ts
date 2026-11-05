/**
 * FamilyCompact.test.ts — 世交合譜（PROG-2-1813）
 *
 * 鎖住：K 折抵成本、共有因子、必傳不動亂數、受孕失敗不扣、對象帶家學因子進門。
 */
import { assert, TestSuite } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { applyCompactLock, compactCost, sharedFactorsOf } from '../assets/scripts/core/systems/FamilyCompact';
import { emptyFamilySynergyLedger, familyPairKey, PLAYER_FAMILY_UID, recordFinalizedChild, type FamilySynergyLedger } from '../assets/scripts/core/systems/FamilySynergy';
import { buildSuitorGeneral, normalizeMarriageProposal, rollMarriageProposal } from '../assets/scripts/core/systems/MarriageProposal';
import type { GeneralConfig, GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { InheritedFactor } from '../assets/scripts/core/systems/FactorInheritance';

const gene = (id: string, level: number, displayName: string, type = 'blue'): GeneralGeneConfig => ({ id, type, level, displayName, isLocked: true, discoveryLevel: 1 } as unknown as GeneralGeneConfig);
const person = (id: string, gender: string, genes: GeneralGeneConfig[], extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: id, faction: 'player', gender, age: 30, ep: 60, role: 'Combat', vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, hp: 1000, genes, ...extra,
} as unknown as GeneralConfig);
const WANG = '太原王';
const BRAVE = gene('factor-brave', 3, '勇烈');
const lord = (): GeneralConfig => person('lord', '男', [BRAVE, gene('factor-other', 2, '其他')]);
const bride = (): GeneralConfig => person('bride', '女', [gene('factor-brave', 2, '勇烈')], { familyUid: WANG });
/** 父方 6 項因子超過子嗣上限 5；同星時依 id 排序，factor-brave 排最後 */
const crowded = (): GeneralConfig[] => [
    person('lord', '男', [gene('a1', 3, 'A1'), gene('a2', 3, 'A2'), gene('a3', 3, 'A3'), gene('a4', 3, 'A4'), gene('a5', 3, 'A5'), BRAVE]),
    bride(),
];
const factor = (id: string, level: number): InheritedFactor => ({ id, color: 'blue', level, generation: 1, sourceUids: ['x'] });
/** 受孕用第一個亂數，其餘都擲不中 */
const conceiveOnly = (): (() => number) => { let call = 0; return () => (call++ === 0 ? 0.01 : 0.99); };
const fullLedger = (): FamilySynergyLedger => {
    let record = recordFinalizedChild(undefined, true);
    for (let i = 0; i < 3; i++) record = recordFinalizedChild(record, true);
    return { ...emptyFamilySynergyLedger(), pairs: { [familyPairKey(PLAYER_FAMILY_UID, WANG)]: record } };
};
const rig = (generals: GeneralConfig[], random: () => number, gold: number, ledger = emptyFamilySynergyLedger()) => {
    const roster = new InMemoryRosterStore(generals);
    const service = new BreedingService(roster, new BloodlineGraph(), { random });
    const wallet = { gold };
    const flow = new BondingSetupController({
        roster, breeding: service, prepare: async () => service.syncGraphFromRoster(), persist: async () => undefined,
        familySynergy: () => ledger,
        gold: () => wallet.gold,
        spendGold: (amount) => { if (wallet.gold < amount) return false; wallet.gold -= amount; return true; },
    });
    flow.selectFather('lord');
    flow.selectMother('bride');
    return { flow, wallet, service };
};

export function createFamilyCompactSuite(): TestSuite {
    const suite = new TestSuite('FamilyCompact (世交合譜 PROG-2-1813)');

    suite.test('K 折抵成本，最高 50%', () => {
        assert.equals(1000, compactCost(0));
        assert.equals(750, compactCost(0.5));
        assert.equals(500, compactCost(1));
        assert.equals(500, compactCost(2));
    });

    suite.test('共有因子取較低星數', () => {
        const shared = sharedFactorsOf(lord(), bride());
        assert.equals('factor-brave', shared.map((g) => g.id).join());
        assert.equals(2, shared[0].level ?? 0);
    });

    suite.test('因子滿額時擠掉最後一項，已傳下來就不動', () => {
        const options = { maxFactors: 2 };
        const full = [factor('a', 3), factor('b', 1)];
        assert.equals('a,factor-brave', applyCompactLock(full, 'factor-brave', lord(), bride(), options).map((f) => f.id).join());
        const has = [factor('factor-brave', 3), factor('b', 1)];
        assert.isTrue(applyCompactLock(has, 'factor-brave', lord(), bride(), options) === has);
    });

    suite.test('雙親不共有或顏色未開放時不補', () => {
        assert.lengthEquals(0, applyCompactLock([], 'factor-other', lord(), bride(), { maxFactors: 3 }));
        assert.lengthEquals(0, applyCompactLock([], 'factor-brave', lord(), bride(), { maxFactors: 3, enabledColors: ['pink'] }));
    });

    suite.test('候選滿額時合譜保住因子並收費；同一組亂數沒合譜就被擠掉', async () => {
        const plain = rig(crowded(), conceiveOnly(), 2000);
        const without = await plain.flow.confirm();
        assert.equals('conceived', without.outcome);
        assert.isFalse((without.factors ?? []).some((f) => f.id === 'factor-brave'));
        assert.equals(2000, plain.wallet.gold);

        const locked = rig(crowded(), conceiveOnly(), 2000);
        locked.flow.cycleCompact();
        const result = await locked.flow.confirm();
        assert.isTrue((result.child?.genes ?? []).some((g) => g.id === 'factor-brave' && g.level === 2));
        assert.equals(1000, locked.wallet.gold);
        assert.isTrue(locked.flow.getView().texts.bondNotice.indexOf('世交合譜：保住了 勇烈，耗黃金 1000') >= 0);
        assert.equals('門風：不用', locked.flow.getView().texts.compactLabel);
    });

    suite.test('本來就傳得下去時不收費', async () => {
        const { flow, wallet } = rig([lord(), bride()], conceiveOnly(), 2000);
        flow.cycleCompact();
        const result = await flow.confirm();
        assert.isTrue((result.factors ?? []).some((f) => f.id === 'factor-brave'));
        assert.equals(2000, wallet.gold);
        assert.isTrue(flow.getView().texts.bondNotice.indexOf('本就傳下，未耗黃金') >= 0);
    });

    suite.test('滿額 K 只收一半', async () => {
        const { flow, wallet } = rig(crowded(), conceiveOnly(), 2000, fullLedger());
        flow.cycleCompact();
        assert.isTrue(flow.getView().texts.inbreedingLabel.indexOf('世交合譜：鎖定 勇烈，被擠掉時才耗黃金 500') >= 0);
        await flow.confirm();
        assert.equals(1500, wallet.gold);
    });

    suite.test('受孕失敗不扣', async () => {
        const { flow, wallet } = rig(crowded(), () => 0.999, 2000);
        flow.cycleCompact();
        const result = await flow.confirm();
        assert.equals('failed', result.outcome);
        assert.equals(2000, wallet.gold);
    });

    suite.test('黃金不足時不鎖也不扣，並提示', async () => {
        const { flow, wallet } = rig(crowded(), conceiveOnly(), 100);
        flow.cycleCompact();
        assert.isTrue(flow.getView().texts.inbreedingLabel.indexOf('（不足）') >= 0);
        const result = await flow.confirm();
        assert.isFalse((result.factors ?? []).some((f) => f.id === 'factor-brave'));
        assert.equals(100, wallet.gold);
        assert.isTrue(flow.getView().texts.bondNotice.indexOf('黃金不足') >= 0);
    });

    suite.test('雙親都不是名門或沒有共有因子時不能合譜，只剩家傳', () => {
        const noFamily = rig([lord(), person('bride', '女', [gene('factor-brave', 2, '勇烈')])], conceiveOnly(), 2000);
        noFamily.flow.cycleCompact();
        assert.equals('家傳：勇烈', noFamily.flow.getView().texts.compactLabel);
        const noShared = rig([lord(), person('bride', '女', [], { familyUid: WANG })], conceiveOnly(), 2000);
        noShared.flow.cycleCompact();
        assert.equals('家傳：勇烈', noShared.flow.getView().texts.compactLabel);
    });

    suite.test('循環回到不用，換配對後選擇失效', () => {
        const { flow } = rig([lord(), bride(), person('plain', '女', [])], conceiveOnly(), 2000);
        assert.isTrue(flow.getView().enabled.btnCompact);
        flow.cycleCompact();
        assert.equals('合譜：勇烈', flow.getView().texts.compactLabel);
        flow.selectMother('plain');
        assert.equals('門風：不用', flow.getView().texts.compactLabel);
        flow.selectMother('bride');
        flow.cycleCompact();
        assert.equals('家傳：勇烈', flow.getView().texts.compactLabel);
        flow.cycleCompact();
        assert.equals('家傳：其他', flow.getView().texts.compactLabel);
        flow.cycleCompact();
        assert.equals('門風：不用', flow.getView().texts.compactLabel);
    });

    suite.test('名門對象帶子弟的最高星因子進門，最多 2★，金因子不算', () => {
        const heir = person('heir', '男', [gene('factor-gold', 5, '宗脈', 'gold'), BRAVE, gene('factor-other', 1, '其他')], { fatherId: 'lord', age: 22 });
        const proposal = rollMarriageProposal([heir], 2, 'suitor-1', () => 0);
        assert.equals('factor-brave', proposal?.heirloom?.id ?? '');
        assert.equals(2, proposal?.heirloom?.level ?? 0);
        const suitor = buildSuitorGeneral(proposal!);
        assert.equals('factor-brave', (suitor.genes ?? []).map((g) => g.id).join());
        assert.equals('factor-brave', normalizeMarriageProposal(JSON.parse(JSON.stringify(proposal)))?.heirloom?.id ?? '');
    });

    suite.test('名門對象有完整精力，結緣後上限不歸零', async () => {
        const heir = person('lord', '男', [BRAVE], { fatherId: 'elder', age: 22 });
        const suitor = buildSuitorGeneral(rollMarriageProposal([heir], 2, 'bride', () => 0)!);
        assert.equals(100, suitor.maxVitality ?? 0);
        const { flow } = rig([heir, suitor], conceiveOnly(), 0);
        flow.selectMother(suitor.id);
        const result = await flow.confirm();
        assert.equals('conceived', result.outcome);
        assert.equals(100, result.mother.maxVitality ?? 0);
    });

    suite.test('子弟沒有因子時對象也沒有；舊存檔的提親照常', () => {
        const proposal = rollMarriageProposal([person('heir', '男', [], { fatherId: 'lord', age: 22 })], 2, 'suitor-1', () => 0);
        assert.isTrue(proposal !== null && proposal.heirloom === undefined);
        assert.lengthEquals(0, buildSuitorGeneral(proposal!).genes ?? []);
    });

    return suite;
}
