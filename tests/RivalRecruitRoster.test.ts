/**
 * RivalRecruitRoster.test.ts — 他國招募入池、結緣出對的多季流程，以及存讀檔（RAI-08 最小切片，PROG-2-1507）
 */
import {
    advanceRivalSeason, createRivalWorld, normalizeRivalWorld, type RivalWorld,
} from '../assets/scripts/core/systems/RivalNations';
import { BOND_FOOD_GATE } from '../assets/scripts/core/systems/RivalBonding';
import { TestSuite, assert } from './TestRunner';

const CALM = (): number => 0.99;

function nationOf(world: RivalWorld, id: string) {
    const nation = world.nations.find((n) => n.id === id);
    if (!nation) throw new Error(`missing ${id}`);
    return nation;
}

/** 呂布糧草給足（> 2000），讓結緣門檻可達 */
function wellFedLvbu(): RivalWorld {
    const world = createRivalWorld();
    return {
        nations: world.nations.map((n) => (n.id === 'lvbu'
            ? { ...n, resources: { food: 5000, gold: 5000, fame: 0, intel: 0 } }
            : n)),
    };
}

export function createRivalRecruitRosterSuite(): TestSuite {
    const suite = new TestSuite('RivalRecruitRoster (他國招募入池與結緣多季流程 PROG-2-1507)');

    suite.test('新局待命池與結緣紀錄皆為空', () => {
        const lvbu = nationOf(createRivalWorld(), 'lvbu');
        assert.equals(0, lvbu.roster?.length ?? -1);
        assert.equals(0, lvbu.bonds?.length ?? -1);
    });

    suite.test('多季流程：偶數季招募入池，糧足時湊滿兩人即結緣', () => {
        let world = wellFedLvbu();
        world = advanceRivalSeason(world, CALM).world;
        world = advanceRivalSeason(world, CALM).world;
        assert.equals(1, nationOf(world, 'lvbu').roster?.length ?? -1);
        assert.equals(0, nationOf(world, 'lvbu').bonds?.length ?? -1);

        world = advanceRivalSeason(world, CALM).world;
        world = advanceRivalSeason(world, CALM).world;
        assert.equals(0, nationOf(world, 'lvbu').roster?.length ?? -1);
        assert.equals(1, nationOf(world, 'lvbu').bonds?.length ?? -1);

        world = advanceRivalSeason(world, CALM).world;
        world = advanceRivalSeason(world, CALM).world;
        assert.equals(1, nationOf(world, 'lvbu').roster?.length ?? -1);
        assert.equals(1, nationOf(world, 'lvbu').bonds?.length ?? -1);

        world = advanceRivalSeason(world, CALM).world;
        world = advanceRivalSeason(world, CALM).world;
        assert.equals(0, nationOf(world, 'lvbu').roster?.length ?? -1);
        assert.equals(2, nationOf(world, 'lvbu').bonds?.length ?? -1);
    });

    suite.test('多季流程：糧不足時武將只留在待命池，不結緣', () => {
        // 開局糧 300，四季後糧草仍未達門檻（季內政每季約 +220）
        let world = createRivalWorld();
        for (let i = 0; i < 4; i++) world = advanceRivalSeason(world, CALM).world;
        const lvbu = nationOf(world, 'lvbu');
        assert.isTrue((lvbu.resources?.food ?? 0) <= BOND_FOOD_GATE);
        assert.equals(2, lvbu.roster?.length ?? -1);
        assert.equals(0, lvbu.bonds?.length ?? -1);
    });

    suite.test('存讀檔往返：待命池與結緣紀錄保留', () => {
        let world = wellFedLvbu();
        for (let i = 0; i < 4; i++) world = advanceRivalSeason(world, CALM).world;
        const loaded = normalizeRivalWorld(JSON.parse(JSON.stringify(world)));
        const before = nationOf(world, 'lvbu');
        const after = nationOf(loaded, 'lvbu');
        assert.equals(JSON.stringify(before.roster), JSON.stringify(after.roster));
        assert.equals(JSON.stringify(before.bonds), JSON.stringify(after.bonds));
    });

    suite.test('舊存檔缺 roster／bonds：讀檔補空陣列，壞資料逐筆濾掉', () => {
        const raw = {
            nations: [{
                id: 'lvbu', troops: 4000, territories: 1, relation: -30, allied: false, atWar: false,
                roster: [{ id: 'ok', quality: 'S', recruitedSeason: 2 }, { id: 'bad', quality: 'Z' }, 'x'],
                bonds: [{ first: 'a', second: 'b', season: 4 }, { first: 1 }],
            }],
        };
        const lvbu = nationOf(normalizeRivalWorld(raw), 'lvbu');
        assert.equals(1, lvbu.roster?.length ?? -1);
        assert.equals('ok', lvbu.roster?.[0].id ?? '');
        assert.equals(1, lvbu.bonds?.length ?? -1);

        const legacy = nationOf(normalizeRivalWorld({ nations: [{ id: 'lvbu', troops: 4000 }] }), 'lvbu');
        assert.equals(0, legacy.roster?.length ?? -1);
        assert.equals(0, legacy.bonds?.length ?? -1);
    });

    return suite;
}
