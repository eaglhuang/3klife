import { TestSuite, assert } from './TestRunner';
import { advanceRivalSeason, createRivalWorld } from '../assets/scripts/core/systems/RivalNations';

function shuAfterSeason(playerTerritories?: number): number {
    const base = createRivalWorld();
    const world = { nations: base.nations.map(n => n.id === 'shu' ? { ...n, relation: 50, atWar: false, allied: false } : n) };
    const player = { troops: 0, food: 0, gold: 0, ...(playerTerritories === undefined ? {} : { territories: playerTerritories }) };
    const result = advanceRivalSeason(world, () => 0.999, player);
    return result.world.nations.find(n => n.id === 'shu')!.relation;
}

export function createRivalCoalitionDecaySuite(): TestSuite {
    const suite = new TestSuite('RivalCoalitionDecay (反霸權邦交衰減 PROG-2-1709)');

    suite.test('沒有霸主時邦交每季回歸 2', () => {
        assert.equals(48, shuAfterSeason());
    });

    suite.test('玩家領土佔比過 30% 成為霸主：其他勢力邦交每季回歸 4', () => {
        assert.equals(46, shuAfterSeason(20));
    });

    return suite;
}
