/**
 * 峽谷落石擊破掉落（SCENE_CANYON_ROCK，PROG-2-1583 暫定）headless 測試
 */
import { TestSuite, assert } from './TestRunner';
import { executeBattleTileEffectPhase, type BattleTileEffectPhaseContext } from '../assets/scripts/battle/runtime/phases/BattleTileEffectPhase';
import { emptyStageSalvage, rollRockBreakGain, ROCK_SLIDE_TILE_NOTE } from '../assets/scripts/battle/shared/StageSalvage';
import { Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

function unit(id: string, faction: Faction, lane: number, depth: number) {
    return { id, faction, lane, depth, isDead: () => false, morale: 0, moraleTurns: 0 };
}

function buildContext(units: ReturnType<typeof unit>[], rocks: Array<[number, number]>, actingFaction = Faction.Player) {
    const tiles = new Map<string, unknown>();
    for (const [lane, depth] of rocks) tiles.set(`${lane},${depth}`, { state: 'hazard-rock', notes: ROCK_SLIDE_TILE_NOTE, lane, depth });
    const state = {
        units: new Map(units.map((u) => [u.id, u])),
        unitDots: new Map(),
        formationZones: new Map(),
        stageSalvage: emptyStageSalvage(),
        plunderedTiles: new Set<string>(),
        getTileEffect: (lane: number, depth: number) => tiles.get(`${lane},${depth}`) ?? null,
        removeTileEffect: (lane: number, depth: number) => { const e = tiles.get(`${lane},${depth}`) ?? null; tiles.delete(`${lane},${depth}`); return e; },
        getGeneral: () => null,
    };
    const context: BattleTileEffectPhaseContext = {
        state: state as never,
        actingFaction,
        playerGeneralUnitId: null,
        enemyGeneralUnitId: null,
        applyUnitDamage: () => {},
        onGeneralUnitKilled: () => {},
        onUnitKilled: () => {},
        random: () => 0,
    };
    return { context, state, tiles };
}

export function createRockBreakSalvageSuite(): TestSuite {
    const suite = new TestSuite('RockBreakSalvage (峽谷落石擊破掉落 PROG-2-1583)');

    suite.test('掉落：石材或木材 100~300，加防具材料 5（武器材料）與武將經驗 50（教官經驗）', () => {
        assert.equals(100, rollRockBreakGain(() => 0).stone ?? -1);
        const high = rollRockBreakGain(() => 0.999);
        assert.equals(300, high.wood ?? -1);
        assert.equals(5, high.weaponMaterial ?? -1);
        assert.equals(50, high.instructorExp ?? -1);
    });

    suite.test('我方部隊相鄰落石：擊破移除並入帳；不相鄰的保留', () => {
        services().initialize();
        const { context, state, tiles } = buildContext([unit('p1', Faction.Player, 1, 3)], [[1, 4], [2, 4]]);
        executeBattleTileEffectPhase(context);
        assert.equals(false, tiles.has('1,4'));
        assert.equals(true, tiles.has('2,4'));
        assert.equals(100, state.stageSalvage.stone);
        assert.equals(5, state.stageSalvage.weaponMaterial);
    });

    suite.test('敵方回合或敵軍相鄰：不擊破', () => {
        services().initialize();
        const { context, tiles } = buildContext([unit('e1', Faction.Enemy, 1, 5)], [[1, 4]], Faction.Enemy);
        executeBattleTileEffectPhase(context);
        assert.equals(true, tiles.has('1,4'));
    });

    return suite;
}
