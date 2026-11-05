import { TestSuite, assert } from './TestRunner';
import { BondingSetupController, type BondingView } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { MilestoneStage } from '../assets/scripts/core/systems/FamilyMilestone';
import { awakenedOf, clanMeanPotential, potentialFill, potentialOf, rosterAncestorsOf } from '../assets/scripts/core/systems/PotentialBar';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const general = (id: string, gender: '男' | '女', extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: id, faction: 'shu', gender, age: 30, hp: 1000,
    vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, ...extra,
} as unknown as GeneralConfig);

const family = (): GeneralConfig[] => [
    general('grandpa', '男', { age: 70, str: 90 }),
    general('grandma', '女', { age: 70, str: 70 }),
    general('heir', '男', { fatherId: 'grandpa', motherId: 'grandma', prowess: { str: 1000, int: 0, lea: 0, pol: 0, cha: 0 } }),
    general('bride', '女'),
];

async function openAt(stage: MilestoneStage | null, open = true): Promise<BondingView> {
    const roster = new InMemoryRosterStore(family());
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
    if (open) flow.togglePotential();
    return flow.getView();
}

export function createPotentialBarSuite(): TestSuite {
    const suite = new TestSuite('PotentialBar');

    suite.test('P 是五維 × 20，封頂 2000', () => {
        assert.equals(1600, potentialOf({ id: 'a', str: 80 }, 'str'));
        assert.equals(2000, potentialOf({ id: 'a', str: 120 }, 'str'));
        assert.equals(0, potentialOf({ id: 'a' }, 'str'));
    });

    suite.test('A 不超過 P；沒走過培育時沒有 A，不拿 P 頂替', () => {
        assert.equals(1000, awakenedOf({ id: 'a', str: 80, prowess: { str: 1000 } }, 'str'));
        assert.equals(1600, awakenedOf({ id: 'a', str: 80, prowess: { str: 1900 } }, 'str'));
        assert.equals(null, awakenedOf({ id: 'a', str: 80 }, 'str'));
    });

    suite.test('條長：G2 只到每格 200 點，G3 起是實值，沒有 A 時覺醒段為 0', () => {
        const hero = { id: 'a', str: 82, prowess: { str: 1000 } };
        assert.equals(0.8, potentialFill(hero, 'str', 2).potential);
        assert.equals(0, potentialFill(hero, 'str', 2).awakened);
        assert.equals(0.82, potentialFill(hero, 'str', 3).potential);
        assert.equals(0.5, potentialFill(hero, 'str', 3).awakened);
        assert.equals(0, potentialFill({ id: 'b', str: 82 }, 'str', 4).awakened);
    });

    suite.test('歷代均值走父母連結，自己不算；循環不會卡住', () => {
        const roster = family() as unknown as Parameters<typeof rosterAncestorsOf>[1];
        const ancestors = rosterAncestorsOf(roster[2], roster);
        assert.lengthEquals(2, ancestors);
        assert.equals(1600, clanMeanPotential(ancestors, 'str'));
        assert.equals(null, clanMeanPotential([], 'str'));
        const loop = [{ id: 'a', fatherId: 'b' }, { id: 'b', fatherId: 'a' }];
        assert.lengthEquals(1, rosterAncestorsOf(loop[0], loop));
    });

    suite.test('G1：沒有按鈕，展開也不顯示', async () => {
        const view = await openAt(1);
        assert.isFalse(view.actives.btnPotential);
        assert.isFalse(view.actives.potentialPanel);
    });

    suite.test('G2：只有粗略條，沒有數字', async () => {
        const view = await openAt(2);
        assert.isTrue(view.actives.btnPotential);
        assert.isTrue(view.actives.potentialPanel);
        assert.isFalse(view.actives.btnCycleProbeStat);
        assert.equals('收起潛力', view.texts.potentialLabel);
        assert.isFalse(view.actives.estimateBox);
        assert.isFalse(view.actives.statProbeLine);
        assert.equals(0.8, view.fills.fatherPotentialP0);
        assert.equals('', view.texts.fatherPotentialValue0);
    });

    suite.test('G3：顯示 A／P；沒修業的寫未修業', async () => {
        const view = await openAt(3);
        assert.equals('1000／1600', view.texts.fatherPotentialValue0);
        assert.equals(0.5, view.fills.fatherPotentialA0);
        assert.equals('未修業／1600', view.texts.motherPotentialValue0);
    });

    suite.test('G4：加歷代均值；名冊沒有祖先時寫無記', async () => {
        const view = await openAt(4);
        assert.equals('1000／1600｜歷代 1600', view.texts.fatherPotentialValue0);
        assert.equals('未修業／1600｜歷代 無記', view.texts.motherPotentialValue0);
    });

    suite.test('沒按按鈕時面板收著，預估區照常', async () => {
        const view = await openAt(4, false);
        assert.isFalse(view.actives.potentialPanel);
        assert.isTrue(view.actives.estimateBox);
        assert.isTrue(view.actives.btnCycleProbeStat);
        assert.equals('潛力條', view.texts.potentialLabel);
    });

    return suite;
}
