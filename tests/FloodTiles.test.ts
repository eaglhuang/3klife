/**
 * 水淹七軍 Tile 比例（SCENE_FLOOD 50/30/20，PROG-2-1591，暫定）headless 測試
 *
 * 覆蓋：淹沒區依比例分成水流／深水／淺灘；水流在下游；全部地形仍是河流。
 */
import { TestSuite, assert } from './TestRunner';
import { FLOOD_DEEP_WATER_DAMAGE_PER_TURN, refreshFloodAttackTerrain } from '../assets/scripts/battle/shared/BattleTacticBehavior';
import { allocateSceneTiles, SCENE_TILE_PRESETS } from '../assets/scripts/battle/shared/SceneTilePresets';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { TerrainType, Weather } from '../assets/scripts/core/config/Constants';
import { tileStateKindOf } from '../assets/scripts/battle/shared/TileStateRules';

export function createFloodTilesSuite(): TestSuite {
    const suite = new TestSuite('FloodTiles (水淹七軍 Tile 比例 PROG-2-1591)');

    suite.test('淹沒區依 50/30/20 分成水流／深水／淺灘，地形皆為河流', () => {
        const state = new BattleState();
        state.weather = Weather.Clear;
        refreshFloodAttackTerrain(state);
        const river = state.cells.filter((c) => c.terrain === TerrainType.River);
        const expected = allocateSceneTiles(SCENE_TILE_PRESETS, 'SCENE_FLOOD', river.length);
        const tally = { 'river-current': 0, hazard: 0, normal: 0 } as Record<string, number>;
        for (const c of river) tally[tileStateKindOf(state.getTileEffect(c.lane, c.depth))] += 1;
        assert.equals(expected.forceMove, tally['river-current']);
        assert.equals(expected.hazard, tally.hazard);
        assert.equals(expected.normal, tally.normal);
    });

    suite.test('下游（depth 大）的淹沒格是水流，深水每回合扣血', () => {
        const state = new BattleState();
        state.weather = Weather.Clear;
        refreshFloodAttackTerrain(state);
        assert.equals('river-current', tileStateKindOf(state.getTileEffect(1, 5)));
        const deep = state.cells.map((c) => state.getTileEffect(c.lane, c.depth)).find((e) => (e?.damagePerTurn ?? 0) > 0);
        assert.equals(FLOOD_DEEP_WATER_DAMAGE_PER_TURN, deep?.damagePerTurn);
    });

    return suite;
}
