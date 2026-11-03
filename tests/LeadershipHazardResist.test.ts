import { hazardDamageTakenOf } from '../assets/scripts/battle/shared/StageSalvage';
import { TestSuite, assert } from './TestRunner';

export function createLeadershipHazardResistSuite(): TestSuite {
    const suite = new TestSuite('LeadershipHazardResist (統率抗地形懲罰 PROG-2-1607)');

    suite.test('每點統率減 0.2%，100 封頂 −20%，缺值不減', () => {
        assert.equals(1, hazardDamageTakenOf(undefined));
        assert.equals(0.9, hazardDamageTakenOf(50));
        assert.equals(0.8, hazardDamageTakenOf(100));
        assert.equals(0.8, hazardDamageTakenOf(140));
    });

    return suite;
}
