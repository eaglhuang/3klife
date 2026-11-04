/**
 * 森林埋伏陷阱觸發（戰法場景規格書 B-3「踩陷阱格：定身 1 回合 + 傷害」，PROG-2-1750）headless 測試
 */
import { TestSuite, assert } from './TestRunner';
import { executeBattleTileEffectPhase, type BattleTileEffectPhaseContext } from '../assets/scripts/battle/runtime/phases/BattleTileEffectPhase';
import { emptyStageSalvage } from '../assets/scripts/battle/shared/StageSalvage';
import { AMBUSH_TRAP_DAMAGE_PER_TURN, AMBUSH_TRAP_TILE_NOTE } from '../assets/scripts/battle/shared/BattleTacticBehavior';
import { Faction, StatusEffect } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

function unit(id: string, faction: Faction, lane: number, depth: number) {
    return { id, faction, lane, depth, isDead: () => false, morale: 0, moraleTurns: 0 };
}

function buildContext(units: ReturnType<typeof unit>[], traps: Array<[number, number]>, actingFaction: Faction) {
    const tiles = new Map<string, unknown>();
    for (const [lane, depth] of traps) {
        tiles.set(`${lane},${depth}`, { state: 'hazard-rock', notes: AMBUSH_TRAP_TILE_NOTE, damagePerTurn: AMBUSH_TRAP_DAMAGE_PER_TURN, lane, depth });
    }
    const damaged: Array<[string, number]> = [];
    const state = {
        units: new Map(units.map((u) => [u.id, u])),
        unitDots: new Map(),
        formationZones: new Map(),
        stageSalvage: emptyStageSalvage(),
        plunderedTiles: new Set<string>(),
        recoveredRockSlides: 0,
        triggeredAmbushTraps: 0,
        getTileEffect: (lane: number, depth: number) => tiles.get(`${lane},${depth}`) ?? null,
        removeTileEffect: (lane: number, depth: number) => { const e = tiles.get(`${lane},${depth}`) ?? null; tiles.delete(`${lane},${depth}`); return e; },
        getGeneral: () => null,
    };
    const context: BattleTileEffectPhaseContext = {
        state: state as never,
        actingFaction,
        playerGeneralUnitId: null,
        enemyGeneralUnitId: null,
        applyUnitDamage: (u, damage) => { damaged.push([u.id, damage]); },
        onGeneralUnitKilled: () => {},
        onUnitKilled: () => {},
        random: () => 0,
    };
    return { context, state, tiles, damaged };
}

export function createAmbushTrapTriggerSuite(): TestSuite {
    const suite = new TestSuite('AmbushTrapTrigger (森林埋伏陷阱定身 PROG-2-1750)');

    suite.test('敵軍踩中：受傷、定身 1 回合，陷阱移除並計入已觸發', () => {
        services().initialize();
        const { context, state, tiles, damaged } = buildContext([unit('e1', Faction.Enemy, 2, 3)], [[2, 3], [1, 3]], Faction.Enemy);
        executeBattleTileEffectPhase(context);
        assert.equals(1, damaged.length);
        assert.equals(AMBUSH_TRAP_DAMAGE_PER_TURN, damaged[0][1]);
        assert.isTrue(services().buff.hasBuff('e1', StatusEffect.Rooted));
        assert.equals(false, tiles.has('2,3'));
        assert.equals(true, tiles.has('1,3'), '沒被踩的陷阱保留');
        assert.equals(1, state.triggeredAmbushTraps);
    });

    suite.test('我方伏兵站在陷阱上：不受傷、不觸發', () => {
        services().initialize();
        const { context, state, tiles, damaged } = buildContext([unit('p1', Faction.Player, 2, 3)], [[2, 3]], Faction.Player);
        executeBattleTileEffectPhase(context);
        assert.equals(0, damaged.length);
        assert.isTrue(!services().buff.hasBuff('p1', StatusEffect.Rooted));
        assert.equals(true, tiles.has('2,3'));
        assert.equals(0, state.triggeredAmbushTraps);
    });

    return suite;
}
