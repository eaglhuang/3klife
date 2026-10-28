/**
 * RivalNationResources.test.ts — 他國 AI 內政資源、季度內政結算接線與存讀（RAI-01、RAI-02、RAI-03 最小接線，PROG-2-1502）
 */
import {
    advanceRivalSeason, createRivalWorld, normalizeRivalWorld, type RivalWorld,
} from '../assets/scripts/core/systems/RivalNations';
import { AI_STARTING_RESOURCES, NATION_PRIMARY_TASK } from '../assets/scripts/core/systems/RivalGovernance';
import { TestSuite, assert } from './TestRunner';

const CALM = (): number => 0.99;

function nationOf(world: RivalWorld, id: string) {
    const nation = world.nations.find((n) => n.id === id);
    if (!nation) throw new Error(`missing ${id}`);
    return nation;
}

export function createRivalNationResourcesSuite(): TestSuite {
    const suite = new TestSuite('RivalNationResources (他國內政資源 RAI-01、RAI-02、RAI-03 PROG-2-1502)');

    suite.test('新局八國皆有初始資源，金幣與情報依暫定值', () => {
        const world = createRivalWorld();
        assert.equals(8, world.nations.length);
        for (const nation of world.nations) {
            assert.equals(AI_STARTING_RESOURCES.food, nation.resources?.food ?? -1);
            assert.equals(5000, nation.resources?.gold ?? -1);
            assert.equals(0, nation.resources?.intel ?? -1);
        }
    });

    suite.test('主要任務對照 E-2 內政偏好：外交型與被動型先顧農耕，其餘先顧軍備', () => {
        assert.equals('FARMING', NATION_PRIMARY_TASK.DIPLOMAT);
        assert.equals('FARMING', NATION_PRIMARY_TASK.PASSIVE);
        assert.equals('MILITARY', NATION_PRIMARY_TASK.MILITARIST);
        assert.equals('MILITARY', NATION_PRIMARY_TASK.RAIDER);
    });

    suite.test('季推進：被動勢力的農耕產出 (100+政60×2)×效率1.1 併入糧草，兵力保留既有成長', () => {
        const world = createRivalWorld();
        const before = nationOf(world, 'liuzhang');
        const after = nationOf(advanceRivalSeason(world, CALM).world, 'liuzhang');
        assert.equals(AI_STARTING_RESOURCES.food + 242, after.resources?.food ?? -1);
        assert.equals(Math.round(before.troops * 1.02), after.troops);
    });

    suite.test('季推進：糧草封頂 10000，超過即夾住', () => {
        const world = createRivalWorld();
        const full = { ...world, nations: world.nations.map((n) => (n.id === 'liuzhang' ? { ...n, resources: { food: 9990, gold: 0, fame: 0, intel: 0 } } : n)) };
        const after = nationOf(advanceRivalSeason(full, CALM).world, 'liuzhang');
        assert.equals(10000, after.resources?.food ?? -1);
    });

    suite.test('軍備型勢力季推進後兵力增加（主要任務產出併入兵力）', () => {
        const world = createRivalWorld();
        const before = nationOf(world, 'wei');
        const after = nationOf(advanceRivalSeason(world, CALM).world, 'wei');
        assert.isTrue(after.troops > Math.round(before.troops * 1.04));
    });

    suite.test('次要任務：軍備型勢力每季也種田，糧草不會卡在開局值（PROG-2-1505）', () => {
        const world = createRivalWorld();
        const after = nationOf(advanceRivalSeason(world, CALM).world, 'lvbu');
        assert.equals(AI_STARTING_RESOURCES.food + 220, after.resources?.food ?? -1);
    });

    suite.test('舊存檔缺 resources：讀檔補初始值，不影響其他欄位', () => {
        const legacy = { nations: [{ id: 'wei', troops: 7000, territories: 4, relation: -10, allied: false, atWar: false }] };
        const restored = normalizeRivalWorld(legacy);
        const wei = nationOf(restored, 'wei');
        assert.equals(7000, wei.troops);
        assert.equals(AI_STARTING_RESOURCES.food, wei.resources?.food ?? -1);
        assert.equals(AI_STARTING_RESOURCES.gold, wei.resources?.gold ?? -1);
    });

    suite.test('讀檔超上限夾值：糧草 99999 → 10000，情報 500 → 100，負數歸零', () => {
        const raw = { nations: [{ id: 'shu', troops: 5000, territories: 3, relation: 20, allied: false, atWar: false, resources: { food: 99999, gold: -5, fame: 9999, intel: 500 } }] };
        const shu = nationOf(normalizeRivalWorld(raw), 'shu');
        assert.equals(10000, shu.resources?.food ?? -1);
        assert.equals(0, shu.resources?.gold ?? -1);
        assert.equals(2000, shu.resources?.fame ?? -1);
        assert.equals(100, shu.resources?.intel ?? -1);
    });

    suite.test('存讀往返：季推進後的資源經 JSON 存讀不遺失', () => {
        const ticked = advanceRivalSeason(createRivalWorld(), CALM).world;
        const reloaded = normalizeRivalWorld(JSON.parse(JSON.stringify(ticked)));
        assert.equals(JSON.stringify(ticked), JSON.stringify(reloaded));
    });

    return suite;
}
