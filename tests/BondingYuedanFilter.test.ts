import { TestSuite, assert } from './TestRunner';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const general = (id: string, gender: '男' | '女', ep: number, extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: id, faction: 'shu', gender, age: 30, hp: 1000, ep,
    vitality: 100, maxVitality: 100,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    ...extra,
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

/** 10 人取前 20%：m-top、f-top 上榜 */
function bothSides(): GeneralConfig[] {
    const list = [general('m-top', '男', 99), general('f-top', '女', 98)];
    for (let i = 0; i < 4; i++) list.push(general(`m${i}`, '男', 40 + i), general(`f${i}`, '女', 40 + i));
    return list;
}

export function createBondingYuedanFilterSuite(): TestSuite {
    const suite = new TestSuite('BondingYuedanFilter');

    suite.test('預設顯示全部，切換後只剩榜上人物並換到榜上配對', () => {
        const flow = makeFlow(bothSides());
        assert.lengthEquals(5, flow.fathers());
        flow.selectFather('m0');
        flow.selectMother('f0');
        flow.toggleYuedanFilter();
        assert.equals('m-top', flow.fathers().map((g) => g.id).join());
        assert.equals('f-top', flow.mothers().map((g) => g.id).join());
        const view = flow.getView();
        assert.equals('m-top', view.fatherId ?? '');
        assert.equals('f-top', view.motherId ?? '');
        assert.equals('顯示全部', view.texts.yuedanFilterLabel);
        assert.equals('', view.texts.bondNotice);
    });

    suite.test('再按一次回到全部', () => {
        const flow = makeFlow(bothSides());
        flow.toggleYuedanFilter();
        flow.toggleYuedanFilter();
        assert.lengthEquals(5, flow.fathers());
        assert.equals('只看月旦評', flow.getView().texts.yuedanFilterLabel);
    });

    suite.test('一方榜上沒人時那一方仍顯示全部，並說明', () => {
        const list = [general('m-top', '男', 99), general('m-next', '男', 98)];
        for (let i = 0; i < 4; i++) list.push(general(`m${i}`, '男', 40 + i), general(`f${i}`, '女', 40 + i));
        const flow = makeFlow(list);
        flow.toggleYuedanFilter();
        assert.lengthEquals(2, flow.fathers());
        assert.lengthEquals(4, flow.mothers());
        assert.isTrue(flow.getView().texts.bondNotice.indexOf('沒有母方人選') >= 0);
    });

    suite.test('榜上沒有人時按鈕不能按', () => {
        const flow = makeFlow([general('m', '男', 50, { breedingCount: 1 }), general('f', '女', 50, { breedingCount: 1 })]);
        assert.isFalse(flow.getView().enabled.btnYuedanFilter);
    });

    suite.test('有人上榜時按鈕可以按', () => {
        assert.isTrue(makeFlow(bothSides()).getView().enabled.btnYuedanFilter);
    });

    return suite;
}
