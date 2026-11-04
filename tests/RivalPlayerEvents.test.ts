import { TestSuite, assert } from './TestRunner';
import { advanceRivalSeason, createRivalWorld, normalizeRivalWorld, type NationState, type RivalWorld } from '../assets/scripts/core/systems/RivalNations';
import { RAID_TUNING, resolveRivalPlayerEvents } from '../assets/scripts/core/systems/RivalPlayerEvents';

const PLAYER = { troops: 1000, food: 500 };

function withNation(id: string, patch: Partial<NationState>): RivalWorld {
    const world = createRivalWorld();
    return { nations: world.nations.map((n) => (n.id === id ? { ...n, ...patch } : n)) };
}

function nation(world: RivalWorld, id: string): NationState {
    return world.nations.find((n) => n.id === id) as NationState;
}

export function createRivalPlayerEventsSuite(): TestSuite {
    const suite = new TestSuite('RivalPlayerEvents');

    suite.test('WARLORD 盟友在玩家兵力低於一半且擲中時背叛：解盟、邦交 -80', () => {
        const world = withNation('lvbu', { allied: true, relation: 50, troops: 5000 });
        const result = resolveRivalPlayerEvents(world, 1, PLAYER, () => 0);
        assert.isFalse(nation(result.world, 'lvbu').allied);
        assert.equals(-30, nation(result.world, 'lvbu').relation);
        assert.equals(['呂布軍 撕毀盟約！邦交驟降！'].join(), result.notices.join());
    });

    suite.test('沒擲中、玩家兵力夠強、或不是 WARLORD 都不背叛', () => {
        const allied = withNation('lvbu', { allied: true, relation: 50, troops: 5000 });
        assert.equals(0, resolveRivalPlayerEvents(allied, 1, PLAYER, () => 0.99).notices.length);
        assert.equals(0, resolveRivalPlayerEvents(allied, 1, { troops: 3000, food: 500 }, () => 0).notices.length);
        const shu = withNation('shu', { allied: true, relation: 50, troops: 5000 });
        assert.isTrue(nation(resolveRivalPlayerEvents(shu, 1, PLAYER, () => 0).world, 'shu').allied);
    });

    suite.test('南蠻每 6 季掠奪，損失照比例；其他季不掠奪', () => {
        const world = createRivalWorld();
        const raid = resolveRivalPlayerEvents(world, RAID_TUNING.intervalSeasons, PLAYER, () => 0.99);
        assert.equals(50, raid.foodLost);
        assert.equals(50, raid.troopsLost);
        assert.equals('南蠻蠻族再次入侵邊境！失去 50 糧草與 50 兵力！', raid.notices.join());
        assert.equals(0, resolveRivalPlayerEvents(world, 5, PLAYER, () => 0.99).foodLost);
        assert.equals(0, resolveRivalPlayerEvents(world, 0, PLAYER, () => 0.99).foodLost);
    });

    suite.test('南蠻滅亡後不再掠奪', () => {
        const world = withNation('nanman', { territories: 0, fallen: true });
        assert.equals(0, resolveRivalPlayerEvents(world, RAID_TUNING.intervalSeasons, PLAYER, () => 0.99).foodLost);
    });

    suite.test('領地歸零時滅亡句只出現一次，領地恢復後解除', () => {
        const world = withNation('wei', { territories: 0, allied: true });
        const first = resolveRivalPlayerEvents(world, 1, PLAYER, () => 0.99);
        assert.equals('魏 已覆滅。曹操 下落不明... 殘餘武將流入各地傭兵市場。', first.notices.join());
        assert.isTrue(nation(first.world, 'wei').fallen === true);
        assert.isFalse(nation(first.world, 'wei').allied);
        assert.equals(0, resolveRivalPlayerEvents(first.world, 2, PLAYER, () => 0.99).notices.length);
        const restored = { nations: first.world.nations.map((n) => (n.id === 'wei' ? { ...n, territories: 2 } : n)) };
        assert.isTrue(nation(resolveRivalPlayerEvents(restored, 3, PLAYER, () => 0.99).world, 'wei').fallen === undefined);
    });

    suite.test('滅亡的國家即使敵對也不出兵', () => {
        const world = withNation('wei', { territories: 0, fallen: true, atWar: true, relation: -100 });
        const tick = advanceRivalSeason(world, () => 0, { troops: 0, food: 0, gold: 0 });
        assert.isFalse(tick.events.some((event) => event.nationId === 'wei'));
    });

    suite.test('滅亡狀態可存讀檔', () => {
        const world = withNation('wei', { territories: 0, fallen: true });
        const loaded = normalizeRivalWorld(JSON.parse(JSON.stringify(world)));
        assert.isTrue(nation(loaded, 'wei').fallen === true);
        assert.isTrue(nation(loaded, 'shu').fallen === undefined);
    });

    return suite;
}
