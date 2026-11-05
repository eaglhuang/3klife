import { TestSuite, assert } from './TestRunner';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { matchesRumorRoute, nextRumorRoute, rumorRouteFiltered, rumorRouteName, rumorTopTrait } from '../assets/scripts/core/systems/MatchRumor';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const BRAVE = { str: 90, int: 40, lea: 50, pol: 30, cha: 40 };
const WISE = { str: 30, int: 90, lea: 50, pol: 40, cha: 40 };
const ALLROUND = { str: 85, int: 80, lea: 80, pol: 75, cha: 75 };

const general = (id: string, gender: '男' | '女', stats: Record<string, number>, ep = 50): GeneralConfig => ({
    id, name: id, faction: 'shu', gender, age: 30, hp: 1000, ep,
    vitality: 100, maxVitality: 100, luk: 40,
    ...stats,
} as unknown as GeneralConfig);

function makeFlow(generals: GeneralConfig[]): BondingSetupController {
    const roster = new InMemoryRosterStore(generals);
    const service = new BreedingService(roster, new BloodlineGraph(), { random: () => 0.01 });
    return new BondingSetupController({
        roster,
        breeding: service,
        prepare: async () => service.syncGraphFromRoster(),
        persist: async () => undefined,
    });
}

const mixed = (): GeneralConfig[] => [
    general('m-brave', '男', BRAVE), general('m-wise', '男', WISE), general('m-all', '男', ALLROUND),
    general('f-brave', '女', BRAVE), general('f-wise', '女', WISE), general('f-all', '女', ALLROUND),
];

function cycleTo(flow: BondingSetupController, label: string): void {
    for (let i = 0; i < 7 && flow.getView().texts.rumorRouteLabel !== label; i++) flow.cycleRumorRoute();
    assert.equals(label, flow.getView().texts.rumorRouteLabel);
}

export function createBondingRumorRouteSuite(): TestSuite {
    const suite = new TestSuite('BondingRumorRoute');

    suite.test('路線循環一圈回到不限', () => {
        const names: string[] = [];
        let route = nextRumorRoute(null);
        while (route !== null) { names.push(rumorRouteName(route)); route = nextRumorRoute(route); }
        assert.equals('全才,武骨,才思,統御,治才,風儀', names.join());
        assert.equals('不限', rumorRouteName(null));
    });

    suite.test('單項路線看最高單項，全才看五維總和', () => {
        assert.isTrue(matchesRumorRoute(BRAVE, 'str'));
        assert.isFalse(matchesRumorRoute(BRAVE, 'int'));
        assert.isTrue(matchesRumorRoute(ALLROUND, 'total'));
        assert.isFalse(matchesRumorRoute(WISE, 'total'));
        assert.isTrue(matchesRumorRoute(WISE, null));
    });

    suite.test('最高單項同分時，篩選與風聞句看同一項', () => {
        const tied = { str: 70, int: 70, lea: 10, pol: 10, cha: 10 };
        assert.isTrue(rumorTopTrait(tied).indexOf('武骨') === 0);
        assert.isTrue(matchesRumorRoute(tied, 'str'));
        assert.isFalse(matchesRumorRoute(tied, 'int'));
    });

    suite.test('篩不到人時保留全部', () => {
        assert.lengthEquals(1, rumorRouteFiltered([BRAVE], 'str'));
        assert.lengthEquals(1, rumorRouteFiltered([BRAVE], 'int'));
    });

    suite.test('切到才思路線，兩方都只剩才思並換到符合的配對', () => {
        const flow = makeFlow(mixed());
        assert.lengthEquals(3, flow.fathers());
        flow.selectFather('m-brave');
        flow.selectMother('f-brave');
        cycleTo(flow, '路線：才思');
        assert.equals('m-wise', flow.fathers().map((g) => g.id).join());
        assert.equals('f-wise', flow.mothers().map((g) => g.id).join());
        const view = flow.getView();
        assert.equals('m-wise', view.fatherId ?? '');
        assert.equals('f-wise', view.motherId ?? '');
    });

    suite.test('一方篩不到人時那一方保留全部並提示', () => {
        const flow = makeFlow([general('m-wise', '男', WISE), general('m-brave', '男', BRAVE), general('f-brave', '女', BRAVE), general('f-brave2', '女', BRAVE)]);
        cycleTo(flow, '路線：才思');
        assert.equals('m-wise', flow.fathers().map((g) => g.id).join());
        assert.lengthEquals(2, flow.mothers());
        assert.equals('沒有才思路線的母方人選，這邊不篩路線。', flow.getView().texts.bondNotice);
    });

    suite.test('可與只看月旦評疊加', () => {
        const list = mixed();
        list.push(general('m-top-wise', '男', WISE, 99), general('f-top-wise', '女', WISE, 98), general('m-top-brave', '男', BRAVE, 97), general('f-top-brave', '女', BRAVE, 96));
        for (let i = 0; i < 5; i++) list.push(general(`m${i}`, '男', BRAVE, 20 + i), general(`f${i}`, '女', BRAVE, 20 + i));
        const flow = makeFlow(list);
        flow.toggleYuedanFilter();
        cycleTo(flow, '路線：才思');
        assert.equals('m-top-wise', flow.fathers().map((g) => g.id).join());
        assert.equals('f-top-wise', flow.mothers().map((g) => g.id).join());
    });

    return suite;
}
