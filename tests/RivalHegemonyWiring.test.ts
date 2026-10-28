/**
 * RivalHegemonyWiring.test.ts — 霸權判定接進季推進的邦交衰減（E-8、F-4，PROG-2-1551）
 *
 * 鎖住：
 * - 沒有霸主（佔比都未達 30%）：邦交每季向 0 回歸 2，與舊行為一致。
 * - 他國當霸主：其他勢力成為反霸權聯盟成員，邦交每季回歸 4；霸主本人仍為 2。
 * - 玩家當霸主（玩家領土計入佔比）：他國同樣是聯盟成員，回歸 4。
 * - 多季流程：連續 3 季，聯盟成員邦交逐季回歸，且不越過 0。
 * - 存讀檔：normalizeRivalWorld 讀回後，霸權判定與衰減速率不變。
 *
 * Unity 對照：像 Campaign 層的 BalanceDirector：每季看領土比例，誰當霸主，其他人的外交數值就掉得更快。
 */
import {
    advanceRivalSeason,
    createRivalWorld,
    normalizeRivalWorld,
    type RivalWorld,
} from '../assets/scripts/core/systems/RivalNations';
import { TestSuite, assert } from './TestRunner';

const fixed = (value: number) => (): number => value;
const NO_PLAYER = { troops: 0, food: 0, gold: 0 };

/** 把指定勢力的領土與邦交改掉；其餘保持新局預設 */
function withTerritories(world: RivalWorld, territories: Record<string, number>, relations: Record<string, number> = {}): RivalWorld {
    return {
        ...world,
        nations: world.nations.map((n) => ({
            ...n,
            territories: territories[n.id] ?? n.territories,
            relation: relations[n.id] ?? n.relation,
        })),
    };
}

function relationOf(world: RivalWorld, id: string): number {
    return world.nations.find((n) => n.id === id)!.relation;
}

/** 霸主是 wei：領土 40，其餘勢力各 1，wei 佔比 > 30% */
function weiHegemonWorld(): RivalWorld {
    return withTerritories(createRivalWorld(), { wei: 40, shu: 1, wu: 1, lvbu: 1, yuan: 1, liuzhang: 1, mateng: 1, nanman: 1 });
}

export function createRivalHegemonyWiringSuite(): TestSuite {
    const suite = new TestSuite('RivalHegemonyWiring (霸權判定接進邦交衰減 E-8 F-4 PROG-2-1551)');

    suite.test('沒有霸主：正邦交每季回歸 2（與舊行為一致）', () => {
        const world = createRivalWorld();
        const next = advanceRivalSeason(world, fixed(0.99), NO_PLAYER).world;
        assert.equals(18, relationOf(next, 'shu'));
    });

    suite.test('他國為霸主：非霸主的正邦交每季回歸 4，霸主本人仍為 2', () => {
        const next = advanceRivalSeason(weiHegemonWorld(), fixed(0.99), NO_PLAYER).world;
        assert.equals(16, relationOf(next, 'shu'));
        // wei 初始邦交 -30，霸主本人向 0 回歸 2 → -28
        assert.equals(-28, relationOf(next, 'wei'));
    });

    suite.test('玩家為霸主（玩家領土計入佔比）：他國邦交每季回歸 4', () => {
        const world = withTerritories(createRivalWorld(), { wu: 1, shu: 1, wei: 1, lvbu: 1, yuan: 1, liuzhang: 1, mateng: 1, nanman: 1 });
        const next = advanceRivalSeason(world, fixed(0.99), { troops: 0, food: 0, gold: 0, territories: 60 }).world;
        assert.equals(16, relationOf(next, 'shu'));
    });

    suite.test('多季流程：連續 3 季逐季回歸 4，且不越過 0', () => {
        let world = withTerritories(weiHegemonWorld(), {}, { shu: 5 });
        world = advanceRivalSeason(world, fixed(0.99), NO_PLAYER).world;
        assert.equals(1, relationOf(world, 'shu'));
        world = advanceRivalSeason(world, fixed(0.99), NO_PLAYER).world;
        assert.equals(0, relationOf(world, 'shu'));
        world = advanceRivalSeason(world, fixed(0.99), NO_PLAYER).world;
        assert.equals(0, relationOf(world, 'shu'));
    });

    suite.test('存讀檔：讀回後霸權判定與衰減速率不變', () => {
        const saved = JSON.parse(JSON.stringify(weiHegemonWorld())) as RivalWorld;
        const reloaded = normalizeRivalWorld(saved);
        const next = advanceRivalSeason(reloaded, fixed(0.99), NO_PLAYER).world;
        assert.equals(16, relationOf(next, 'shu'));
    });

    return suite;
}
