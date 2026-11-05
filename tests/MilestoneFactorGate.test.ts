import { TestSuite, assert } from './TestRunner';
import { BondingSetupController, type BondingView } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { G1_FACTOR_TEXT, type MilestoneStage } from '../assets/scripts/core/systems/FamilyMilestone';
import { emptyFamilySynergyLedger } from '../assets/scripts/core/systems/FamilySynergy';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const brave = { id: 'factor-brave', displayName: '勇烈', type: 'blue', level: 3, discoveryLevel: 1 };

const general = (id: string, gender: '男' | '女'): GeneralConfig => ({
    id, name: id, faction: 'shu', gender, age: 30, hp: 1000,
    vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, ep: 95, familyUid: 'qa-house', genes: [brave],
} as unknown as GeneralConfig);

async function viewAt(stage: MilestoneStage | null): Promise<BondingView> {
    const roster = new InMemoryRosterStore([general('m', '男'), general('f', '女')]);
    const service = new BreedingService(roster, new BloodlineGraph(), { random: () => 0.01 });
    const controller = new BondingSetupController({
        roster,
        breeding: service,
        prepare: async () => service.syncGraphFromRoster(),
        persist: async () => undefined,
        spendGold: () => true,
        probeStat: async () => true,
        familySynergy: () => emptyFamilySynergyLedger(),
        ...(stage === null ? {} : { milestoneStage: () => stage }),
    });
    await controller.open();
    return controller.getView();
}

export function createMilestoneFactorGateSuite(): TestSuite {
    const suite = new TestSuite('MilestoneFactorGate');

    suite.test('G1：因子、連攜與上限隱藏，沒有合譜與單維細查', async () => {
        const view = await viewAt(1);
        assert.equals(G1_FACTOR_TEXT, view.texts.fatherFactors);
        assert.equals(G1_FACTOR_TEXT, view.texts.motherFactors);
        assert.equals('', view.texts.factorCapLabel);
        assert.equals('', view.texts.factorStage);
        assert.equals('', view.texts.statProbeLine);
        assert.isTrue(view.texts.epDetail.indexOf('勇烈') < 0);
        assert.isTrue(view.texts.fatherRumor.indexOf('★') < 0);
        assert.isTrue(view.texts.motherRumor.indexOf('★') < 0);
        assert.isTrue(view.texts.conceptionLabel.indexOf('世交') < 0);
        assert.isFalse(view.actives.btnYuedanFilter);
        assert.isFalse(view.actives.btnCompact);
        assert.isFalse(view.actives.btnCycleProbeStat);
        assert.isFalse(view.actives.btnProbeFatherStat);
        assert.isFalse(view.actives.btnProbeMotherStat);
    });

    suite.test('G2：顯示星級、上限與單維細查，合譜還沒有', async () => {
        const view = await viewAt(2);
        assert.equals('因子：勇烈 3★', view.texts.fatherFactors);
        assert.isTrue(view.texts.factorCapLabel.length > 0);
        assert.isTrue(view.actives.btnYuedanFilter);
        assert.isTrue(view.texts.conceptionLabel.indexOf('世交') < 0);
        assert.isTrue(view.texts.statProbeLine.length > 0);
        assert.isTrue(view.actives.btnProbeFatherStat);
        assert.isFalse(view.actives.btnCompact);
    });

    suite.test('G3：合譜按鈕出現', async () => {
        const view = await viewAt(3);
        assert.isTrue(view.actives.btnCompact);
        assert.isTrue(view.texts.conceptionLabel.indexOf('世交門風契合度') >= 0);
    });

    suite.test('沒有接階段時全部顯示', async () => {
        const view = await viewAt(null);
        assert.isTrue(view.actives.btnCompact);
        assert.isTrue(view.actives.btnProbeFatherStat);
        assert.equals('因子：勇烈 3★', view.texts.fatherFactors);
    });

    return suite;
}
