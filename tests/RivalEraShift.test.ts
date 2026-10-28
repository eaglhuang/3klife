/**
 * RivalEraShift.test.ts — 天下大亂時代更迭最小版：年度評估、AI 國家重置、多季推進流程（RAI-12，PROG-2-1506）
 */
import {
    advanceRivalSeason, applyEraShift, createRivalWorld, type RivalWorld,
} from '../assets/scripts/core/systems/RivalNations';
import { TestSuite, assert } from './TestRunner';

const CALM = (): number => 0.99;

function nationOf(world: RivalWorld, id: string) {
    const nation = world.nations.find((n) => n.id === id);
    if (!nation) throw new Error(`missing ${id}`);
    return nation;
}

/** 把魏國領土灌到佔比 ≥ 0.9（200 / (200 + 其餘 18)） */
function dominantWei(): RivalWorld {
    const world = createRivalWorld();
    return { nations: world.nations.map((n) => (n.id === 'wei' ? { ...n, territories: 200 } : n)) };
}

export function createRivalEraShiftSuite(): TestSuite {
    const suite = new TestSuite('RivalEraShift (天下大亂時代更迭最小版 RAI-12 PROG-2-1506)');

    suite.test('未達佔比門檻時不重組，回傳同一份世界', () => {
        const world = createRivalWorld();
        assert.isTrue(applyEraShift(world, 0, 0) === world);
    });

    suite.test('非年度季即使佔比達標也不評估（E-9 年度節奏）', () => {
        const world = dominantWei();
        assert.isTrue(applyEraShift(world, 2, 0) === world);
    });

    suite.test('年度季佔比 ≥ 0.9 時 AI 國家回到新局初始值，且不改輸入', () => {
        const world = dominantWei();
        const reset = applyEraShift(world, 4, 0);
        assert.equals(5, nationOf(reset, 'wei').territories);
        assert.equals(9000, nationOf(reset, 'wei').troops);
        assert.equals(200, nationOf(world, 'wei').territories);
    });

    suite.test('佔比計算納入玩家領土：玩家領土獨大同樣觸發重組', () => {
        const world = createRivalWorld();
        assert.isTrue(applyEraShift(world, 0, 300) !== world);
        assert.isTrue(applyEraShift(world, 0, 0) === world);
    });

    suite.test('多季推進：佔比達標後未到年度季不變，到年度季才重組，之後照常推進', () => {
        let world = dominantWei();
        for (const season of [1, 2, 3]) {
            world = applyEraShift(advanceRivalSeason(world, CALM).world, season, 0);
            assert.equals(200, nationOf(world, 'wei').territories);
        }
        world = applyEraShift(advanceRivalSeason(world, CALM).world, 4, 0);
        assert.equals(5, nationOf(world, 'wei').territories);
        const next = advanceRivalSeason(world, CALM).world;
        assert.isTrue(nationOf(next, 'wei').troops > 9000);
        assert.equals(8, next.nations.length);
    });

    return suite;
}
