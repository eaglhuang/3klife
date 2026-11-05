/**
 * BondingStoryLines.test.ts — 結緣四句劇本（PROG-2-1828）
 */
import { TestSuite, assert } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { BondingSetupController, type BondingSetupDeps } from '../assets/scripts/ui/core/BondingSetupController';
import { bloodlineBirthLines } from '../assets/scripts/core/systems/BloodlineBirthLines';
import { compactCeremonyLine, kinWarningLine, outcrossMedicLine, synergyWeddingLine } from '../assets/scripts/core/systems/BondingStoryLines';
import { compactSynergyFull } from '../assets/scripts/core/systems/FamilyCompact';
import { emptyFamilySynergyLedger, familyPairKey, PLAYER_FAMILY_UID } from '../assets/scripts/core/systems/FamilySynergy';

const person = (id: string, gender: string, extra: object = {}): GeneralConfig => ({
    id, name: id, faction: 'player', gender, age: 30, ep: 60, role: 'Combat', vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, hp: 1000, genes: [], ...extra,
} as unknown as GeneralConfig);
const clean = { before: 1, after: 0, inbred: false, frail: false };

export function createBondingStoryLinesSuite(): TestSuite {
    const suite = new TestSuite('BondingStoryLines');

    suite.test('大禮句只有 K 滿額才提累世通家', () => {
        assert.isTrue(compactCeremonyLine('王佐之才', true).indexOf('累世通家') >= 0);
        assert.isTrue(compactCeremonyLine('王佐之才', false).indexOf('累世通家') < 0);
        assert.isTrue(compactCeremonyLine('王佐之才', false).indexOf('【王佐之才】') >= 0);
    });

    suite.test('K 滿額判定看這一家的滑動窗', () => {
        const ledger = emptyFamilySynergyLedger();
        assert.isFalse(compactSynergyFull('王', ledger));
        ledger.pairs[familyPairKey(PLAYER_FAMILY_UID, '王')] = { recentCount: 8, recentBitmap: 255 } as never;
        assert.isTrue(compactSynergyFull('王', ledger));
        assert.isFalse(compactSynergyFull('謝', ledger));
    });

    suite.test('連攜受孕時出合巹句，名稱取自父方因子', () => {
        const father = { name: '父', genes: [{ id: 'a', displayName: '經緯之才' }] };
        const lines = bloodlineBirthLines({ father, mother: { name: '母' }, lineageSynergyFactorId: 'a' }, () => null);
        assert.isTrue(lines.indexOf(synergyWeddingLine('經緯之才')) >= 0);
        assert.lengthEquals(0, bloodlineBirthLines({ father, mother: { name: '母' } }, () => null));
    });

    suite.test('醫官句點名帶微躁的親代，排在系統提示前', () => {
        const lines = bloodlineBirthLines({ bloodFatigue: clean, father: { name: '父', bloodFatigue: 1 }, mother: { name: '母' } }, () => null);
        assert.equals(outcrossMedicLine('父', '母'), lines[0]);
        assert.isTrue(lines[1].indexOf('【異姓復壯】') >= 0);
        const mother = bloodlineBirthLines({ bloodFatigue: clean, father: { name: '父' }, mother: { name: '母', bloodFatigue: 2 } }, () => null);
        assert.equals(outcrossMedicLine('母', '父'), mother[0]);
        const both = bloodlineBirthLines({ bloodFatigue: clean, father: { name: '父', bloodFatigue: 1 }, mother: { name: '母', bloodFatigue: 1 } }, () => null);
        assert.equals(outcrossMedicLine('雙親', null), both[0]);
    });

    suite.test('沒有微躁、近親或先天不足時沒有醫官句', () => {
        const parents = { father: { name: '父', bloodFatigue: 1 }, mother: { name: '母' } };
        const hasMedic = (bloodFatigue: typeof clean): boolean => bloodlineBirthLines({ bloodFatigue, ...parents }, () => null).some((line) => line.indexOf('醫官') >= 0);
        assert.isFalse(hasMedic({ ...clean, before: 0 }));
        assert.isFalse(hasMedic({ ...clean, inbred: true }));
        assert.isFalse(hasMedic({ ...clean, frail: true }));
    });

    const kinRig = (level: number): { flow: BondingSetupController; lines: string[] } => {
        const lines: string[] = [];
        const breeding = {
            kinPurificationTargets: (fatherId: string) => (fatherId === 'kin' ? [{ gene: { id: 'x', discoveryLevel: 2 }, ancestorName: '趙雲' }] : []),
        } as unknown as BondingSetupDeps['breeding'];
        const flow = new BondingSetupController({
            roster: new InMemoryRosterStore([person('kin', '男'), person('other', '男'), person('bride', '女')]),
            breeding,
            playerDiscoveryLevel: () => level,
            announce: (line) => lines.push(line),
        });
        return { flow, lines };
    };

    suite.test('譜牒官預警：開畫面載入血統圖前不判，重開再提一次', async () => {
        const { flow, lines } = kinRig(2);
        flow.selectFather('kin');
        flow.selectMother('bride');
        flow.announcePairWarning();
        assert.lengthEquals(0, lines);
        await flow.open();
        flow.announcePairWarning();
        assert.lengthEquals(1, lines);
        await flow.open();
        flow.announcePairWarning();
        assert.lengthEquals(2, lines);
    });

    suite.test('譜牒官預警：同一對只提一次，換回來再提', async () => {
        const { flow, lines } = kinRig(2);
        await flow.open();
        flow.selectFather('kin');
        flow.selectMother('bride');
        flow.announcePairWarning();
        flow.announcePairWarning();
        assert.lengthEquals(1, lines);
        assert.equals(kinWarningLine('kin', 'bride', '趙雲'), lines[0]);
        flow.selectFather('other');
        flow.announcePairWarning();
        assert.lengthEquals(1, lines);
        flow.selectFather('kin');
        flow.announcePairWarning();
        assert.lengthEquals(2, lines);
    });

    suite.test('譜牒官預警：看不到的因子不預警', async () => {
        const { flow, lines } = kinRig(1);
        await flow.open();
        flow.selectFather('kin');
        flow.selectMother('bride');
        flow.announcePairWarning();
        assert.lengthEquals(0, lines);
    });

    const brave = { id: 'brave', type: 'blue', level: 2, displayName: '勇烈', isLocked: true, discoveryLevel: 1 };
    const compactRig = (gold: number): { flow: BondingSetupController; lines: string[] } => {
        const lines: string[] = [];
        const roster = new InMemoryRosterStore([person('lord', '男', { genes: [brave] }), person('bride', '女', { genes: [brave], familyUid: '王' })]);
        const flow = new BondingSetupController({
            roster,
            breeding: new BreedingService(roster, new BloodlineGraph(), { random: () => 0.01 }),
            gold: () => gold,
            spendGold: () => true,
            familySynergy: () => emptyFamilySynergyLedger(),
            announce: (line) => lines.push(line),
        });
        return { flow, lines };
    };

    suite.test('行世交合譜時出宗老句；黃金不足沒有合譜就不出', async () => {
        const paid = compactRig(5000);
        paid.flow.cycleCompact();
        assert.equals('conceived', (await paid.flow.confirm()).outcome);
        assert.equals(compactCeremonyLine('勇烈', false), paid.lines[0]);
        assert.isTrue(paid.flow.getView().texts.bondNotice.length > 0);
        assert.equals('', paid.flow.getView().texts.factorCapLabel);
        const poor = compactRig(0);
        poor.flow.cycleCompact();
        await poor.flow.confirm();
        assert.lengthEquals(0, poor.lines);
    });

    return suite;
}
