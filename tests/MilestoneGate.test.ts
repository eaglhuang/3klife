import { TestSuite, assert } from './TestRunner';
import { BondingSetupController, type BondingView } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { outcrossRecoveryLine } from '../assets/scripts/core/systems/BloodFatigue';
import { KIN_TEXT_WARNING, MILESTONE_G1_HINT, type MilestoneStage } from '../assets/scripts/core/systems/FamilyMilestone';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const general = (id: string, gender: '男' | '女', extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: id, faction: 'shu', gender, age: 30, hp: 1000,
    vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, ...extra,
} as unknown as GeneralConfig);

const cousins = (): GeneralConfig[] => [
    general('grandpa', '男', { age: 80 }), general('grandma', '女', { age: 78 }),
    general('uncle-a', '男', { age: 55, fatherId: 'grandpa', motherId: 'grandma' }), general('aunt-a', '女', { age: 54 }),
    general('uncle-b', '男', { age: 53, fatherId: 'grandpa', motherId: 'grandma' }), general('aunt-b', '女', { age: 52 }),
    general('heir', '男', { fatherId: 'uncle-a', motherId: 'aunt-a', bloodFatigue: 2 }), general('bride', '女', { fatherId: 'uncle-b', motherId: 'aunt-b' }),
];

async function viewAt(stage: MilestoneStage | null): Promise<BondingView> {
    const roster = new InMemoryRosterStore(cousins());
    const service = new BreedingService(roster, new BloodlineGraph(), { random: () => 0.01 });
    const flow = new BondingSetupController({
        roster,
        breeding: service,
        prepare: async () => service.syncGraphFromRoster(),
        persist: async () => undefined,
        ...(stage === null ? {} : { milestoneStage: () => stage }),
    });
    await flow.open();
    flow.selectFather('heir');
    flow.selectMother('bride');
    return flow.getView();
}

const litFrames = (view: BondingView): number => Object.keys(view.actives).filter((key) => key.indexOf('TreeFrame') > 0 && view.actives[key]).length;

export function createMilestoneGateSuite(): TestSuite {
    const suite = new TestSuite('MilestoneGate');

    suite.test('G1：只有父母兩席，近親風險隱藏，顯示初創提示', async () => {
        const view = await viewAt(1);
        assert.isTrue(view.texts.fatherTree0.indexOf('uncle-a') >= 0);
        assert.isTrue(view.texts.fatherTree1.indexOf('aunt-a') >= 0);
        assert.equals('', view.texts.fatherTree2);
        assert.equals('', view.texts.motherTree13);
        assert.equals(0, litFrames(view));
        assert.equals(MILESTONE_G1_HINT, view.texts.kinshipLampLine);
        assert.equals(-1, view.texts.inbreedingLabel.indexOf('近親'));
        assert.equals(-1, view.texts.inbreedingLabel.indexOf('多樣性'));
    });

    suite.test('G2：14 席全開，但只有文字警告，沒有燈號與紅框', async () => {
        const view = await viewAt(2);
        assert.isTrue(view.texts.fatherTree2.indexOf('grandpa') >= 0);
        assert.equals(0, litFrames(view));
        assert.equals('', view.texts.kinshipLampLine);
        assert.isTrue(view.texts.inbreedingLabel.indexOf(KIN_TEXT_WARNING) === 0);
        assert.equals(-1, view.texts.inbreedingLabel.indexOf('代內'));
    });

    suite.test('G3：紅框與燈號出現，多樣性與復壯世代還沒有', async () => {
        const view = await viewAt(3);
        assert.isTrue(litFrames(view) > 0);
        assert.isTrue(view.texts.kinshipLampLine.indexOf('🟠 血脈鬱結') === 0);
        assert.equals(-1, view.texts.kinshipLampLine.indexOf('外婚復壯需'));
        assert.equals(-1, view.texts.inbreedingLabel.indexOf('多樣性'));
    });

    suite.test('G4：加上多樣性折減與復壯世代', async () => {
        const view = await viewAt(4);
        assert.isTrue(view.texts.kinshipLampLine.indexOf('外婚復壯需 2 代') >= 0);
        assert.isTrue(view.texts.inbreedingLabel.indexOf('多樣性受損') >= 0);
    });

    suite.test('沒有接階段時全部顯示', async () => {
        const view = await viewAt(null);
        assert.isTrue(litFrames(view) > 0);
        assert.isTrue(view.texts.inbreedingLabel.indexOf('多樣性受損') >= 0);
    });

    suite.test('乾淨血脈不提復壯世代', () => {
        assert.equals('', outcrossRecoveryLine(0, 0));
        assert.equals('外婚復壯需 3 代', outcrossRecoveryLine(1, 3));
    });

    return suite;
}
