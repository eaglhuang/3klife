/**
 * RivalHegemony.test.ts — 霸權判定與反霸權同盟（他國 AI E-8、F-4、F-5，PROG-2-1472）
 */
import {
    coalitionStatusOf, decayRelation, domainRatioOf, findHegemon,
    shouldApplyRebellionPressure, shouldStartCoalition,
} from '../assets/scripts/core/systems/RivalHegemony';
import { TestSuite, assert } from './TestRunner';

const WORLD = [
    { id: 'wei', territories: 6 },
    { id: 'shu', territories: 2 },
    { id: 'wu', territories: 2 },
];

export function createRivalHegemonySuite(): TestSuite {
    const suite = new TestSuite('RivalHegemony (霸權反制 E-8 F-4 F-5 PROG-2-1472)');

    suite.test('領土佔比；全部為 0 時佔比 0', () => {
        assert.equals(0.6, domainRatioOf(WORLD[0], WORLD));
        assert.equals(0, domainRatioOf({ id: 'a', territories: 0 }, [{ id: 'a', territories: 0 }]));
    });

    suite.test('30% 起反霸權同盟、40% 起叛亂壓力', () => {
        assert.isTrue(shouldStartCoalition(0.3));
        assert.isTrue(!shouldStartCoalition(0.29));
        assert.isTrue(shouldApplyRebellionPressure(0.4));
        assert.isTrue(!shouldApplyRebellionPressure(0.39));
    });

    suite.test('霸主：佔比 ≥ 30% 中最高者；都不到時 null', () => {
        assert.equals('wei', findHegemon(WORLD)?.id);
        const tie = [{ id: 'a', territories: 3 }, { id: 'b', territories: 3 }, { id: 'c', territories: 4 }];
        assert.equals('c', findHegemon(tie)?.id);
        const even = [{ id: 'a', territories: 1 }, { id: 'b', territories: 1 }, { id: 'c', territories: 1 }, { id: 'd', territories: 1 }];
        assert.equals(null, findHegemon(even));
    });

    suite.test('非霸主自動加入聯盟、衰減 4；霸主本身與無霸主時衰減 2', () => {
        const shu = coalitionStatusOf('shu', WORLD);
        assert.equals('FORCED_MEMBER', shu.state);
        assert.equals('wei', shu.hegemonId);
        assert.equals(4, shu.relationDecayRate);
        const wei = coalitionStatusOf('wei', WORLD);
        assert.equals('NONE', wei.state);
        assert.equals(2, wei.relationDecayRate);
        assert.equals(null, coalitionStatusOf('a', [{ id: 'a', territories: 1 }, { id: 'b', territories: 1 }, { id: 'c', territories: 1 }, { id: 'd', territories: 1 }]).hegemonId);
    });

    suite.test('邦交衰減向 0 回歸且不越過 0', () => {
        assert.equals(8, decayRelation(10));
        assert.equals(-6, decayRelation(-10, 4));
        assert.equals(0, decayRelation(1, 4));
        assert.equals(0, decayRelation(-3, 4));
        assert.equals(0, decayRelation(0));
    });

    return suite;
}
