/**
 * RivalRecruitment.test.ts — 他國 AI 每 2 季招募一名、品質依名聲擲骰（E-7、F-3，PROG-2-1503）
 */
import {
    advanceRivalSeason, createRivalWorld, normalizeRivalWorld, type RivalWorld,
} from '../assets/scripts/core/systems/RivalNations';
import { TestSuite, assert } from './TestRunner';

const CALM = (): number => 0.99;

function withFame(world: RivalWorld, id: string, fame: number): RivalWorld {
    return {
        ...world,
        nations: world.nations.map((n) => (n.id === id
            ? { ...n, resources: { food: 300, gold: 5000, fame, intel: 0 } }
            : n)),
    };
}

function totalRecruits(world: RivalWorld, id: string): number {
    const nation = world.nations.find((n) => n.id === id);
    const counts = nation?.recruits ?? { S: 0, A: 0, B: 0, C: 0 };
    return counts.S + counts.A + counts.B + counts.C;
}

export function createRivalRecruitmentSuite(): TestSuite {
    const suite = new TestSuite('RivalRecruitment (他國招募 E-7、F-3 PROG-2-1503)');

    suite.test('每 2 季招募一次：第 1 季不招，第 2 季招一名', () => {
        const first = advanceRivalSeason(createRivalWorld(), CALM).world;
        assert.equals(0, totalRecruits(first, 'liuzhang'));
        const second = advanceRivalSeason(first, CALM).world;
        assert.equals(1, totalRecruits(second, 'liuzhang'));
    });

    suite.test('名聲低於 800：四十季內不會招到 S 級（F-3 機率表無 S）', () => {
        let world = createRivalWorld();
        for (let i = 0; i < 40; i++) world = advanceRivalSeason(world, CALM).world;
        const liuzhang = world.nations.find((n) => n.id === 'liuzhang');
        assert.equals(20, totalRecruits(world, 'liuzhang'));
        assert.equals(0, liuzhang?.recruits?.S ?? -1);
    });

    suite.test('名聲高於 1500：四十季內招到 S 級（機率 10%），且總數不變', () => {
        let world = withFame(createRivalWorld(), 'liuzhang', 2000);
        for (let i = 0; i < 40; i++) world = advanceRivalSeason(world, CALM).world;
        const liuzhang = world.nations.find((n) => n.id === 'liuzhang');
        assert.equals(20, totalRecruits(world, 'liuzhang'));
        assert.isTrue((liuzhang?.recruits?.S ?? 0) > 0);
    });

    suite.test('四季共招兩名，每國各自計算', () => {
        let world = createRivalWorld();
        for (let i = 0; i < 4; i++) world = advanceRivalSeason(world, CALM).world;
        assert.equals(2, totalRecruits(world, 'liuzhang'));
        assert.equals(2, totalRecruits(world, 'shu'));
    });

    suite.test('讀檔：缺漏補零，負數與小數夾為非負整數', () => {
        const raw = { nations: [{ id: 'wei', troops: 9000, territories: 5, relation: -30, allied: false, atWar: false, governedSeasons: -3.7, recruits: { S: -1, A: 2.9, B: 'x' } }] };
        const wei = normalizeRivalWorld(raw).nations.find((n) => n.id === 'wei');
        assert.equals(0, wei?.governedSeasons ?? -1);
        assert.equals(0, wei?.recruits?.S ?? -1);
        assert.equals(2, wei?.recruits?.A ?? -1);
        assert.equals(0, wei?.recruits?.B ?? -1);
        assert.equals(0, wei?.recruits?.C ?? -1);
    });

    suite.test('存讀往返：季數計數與招募紀錄經 JSON 不遺失', () => {
        let world = createRivalWorld();
        for (let i = 0; i < 3; i++) world = advanceRivalSeason(world, CALM).world;
        const reloaded = normalizeRivalWorld(JSON.parse(JSON.stringify(world)));
        assert.equals(JSON.stringify(world), JSON.stringify(reloaded));
    });

    return suite;
}
