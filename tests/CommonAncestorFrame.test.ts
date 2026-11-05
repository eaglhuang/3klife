import { TestSuite, assert } from './TestRunner';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const general = (id: string, gender: '男' | '女', fatherId = '', motherId = '', age = 30): GeneralConfig => ({
    id, name: id, faction: 'shu', gender, age, hp: 1000,
    vitality: 100, maxVitality: 100, fatherId, motherId,
    str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
} as unknown as GeneralConfig);

/** 表親：兩人的父親是兄弟，共祖是祖父母 */
const cousins = (): GeneralConfig[] => [
    general('grandpa', '男', '', '', 80), general('grandma', '女', '', '', 78),
    general('uncle-a', '男', 'grandpa', 'grandma', 55), general('aunt-a', '女', '', '', 54),
    general('uncle-b', '男', 'grandpa', 'grandma', 53), general('aunt-b', '女', '', '', 52),
    general('heir', '男', 'uncle-a', 'aunt-a'), general('bride', '女', 'uncle-b', 'aunt-b'),
];

function makeRig(generals: GeneralConfig[]): { service: BreedingService; flow: BondingSetupController } {
    const roster = new InMemoryRosterStore(generals);
    const service = new BreedingService(roster, new BloodlineGraph(), { random: () => 0.01 });
    service.syncGraphFromRoster();
    const flow = new BondingSetupController({
        roster,
        breeding: service,
        prepare: async () => service.syncGraphFromRoster(),
        persist: async () => undefined,
    });
    return { service, flow };
}

const lit = (seats: boolean[]): number => seats.filter((shared) => shared).length;

export function createCommonAncestorFrameSuite(): TestSuite {
    const suite = new TestSuite('CommonAncestorFrame');

    suite.test('表親：祖父母兩席加上他們的自動開祖先四席，雙方各六席', () => {
        const { service } = makeRig(cousins());
        assert.equals(6, lit(service.commonAncestorSeats('heir', 'bride')));
        assert.equals(6, lit(service.commonAncestorSeats('bride', 'heir')));
    });

    suite.test('沒有血緣時一席都不亮', () => {
        const { service } = makeRig([general('m', '男'), general('f', '女')]);
        assert.equals(0, lit(service.commonAncestorSeats('m', 'f')));
    });

    suite.test('空席不算共祖', () => {
        const { service } = makeRig([general('m', '男', 'dad'), general('f', '女', '', 'mom')]);
        assert.lengthEquals(14, service.commonAncestorSeats('m', 'f'));
        assert.equals(0, lit(service.commonAncestorSeats('m', 'f')));
    });

    suite.test('結緣畫面：共祖才亮紅框，其餘 false', async () => {
        const { flow } = makeRig(cousins());
        await flow.open();
        flow.selectFather('heir');
        flow.selectMother('bride');
        const { actives, texts } = flow.getView();
        const seatOf = (side: string, name: string) => {
            for (let i = 0; i < 14; i++) if ((texts[`${side}Tree${i}`] ?? '').indexOf(name) >= 0) return i;
            return -1;
        };
        assert.isTrue(actives[`fatherTreeFrame${seatOf('father', 'grandpa')}`]);
        assert.isTrue(actives[`motherTreeFrame${seatOf('mother', 'grandma')}`]);
        assert.isFalse(actives[`fatherTreeFrame${seatOf('father', 'uncle-a')}`]);
        assert.equals(12, Object.keys(actives).filter((key) => key.indexOf('TreeFrame') > 0 && actives[key]).length);
    });

    suite.test('換成沒有血緣的對象後紅框熄滅', async () => {
        const { flow } = makeRig([...cousins(), general('stranger', '女')]);
        await flow.open();
        flow.selectFather('heir');
        flow.selectMother('bride');
        flow.selectMother('stranger');
        const { actives } = flow.getView();
        assert.equals(0, Object.keys(actives).filter((key) => key.indexOf('TreeFrame') > 0 && actives[key]).length);
    });

    return suite;
}
