import * as fs from 'fs';
import * as path from 'path';
import { allocateSceneTiles, SCENE_TILE_PRESETS, validateSceneTilePresets, type SceneTilePresetTable } from '../assets/scripts/battle/shared/SceneTilePresets';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { resolveBattleTacticBehavior } from '../assets/scripts/battle/shared/BattleTacticBehavior';
import { BattleTactic } from '../assets/scripts/core/config/Constants';
import { TestSuite, assert } from './TestRunner';

function loadTable(): SceneTilePresetTable {
  const file = path.join(__dirname, '..', 'assets', 'resources', 'data', 'scene-tile-presets.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as SceneTilePresetTable;
}

export function createSceneTilePresetsSuite(): TestSuite {
  const suite = new TestSuite('SceneTilePresets (Tile-State 預設配置表 PROG-2-1584)');

  suite.test('配置表與規格一致且每場景合計 100', () => {
    const table = loadTable();
    assert.equals(0, validateSceneTilePresets(table).length);
    assert.equals(60, table.presets.SCENE_FOREST_AMBUSH.stealth ?? 0);
    assert.equals(40, table.presets.SCENE_CANYON_ROCK.hazard ?? 0);
    assert.equals(50, table.presets.SCENE_FLOOD.forceMove ?? 0);
  });

  suite.test('內建表與 JSON 檔一致', () => {
    assert.equals(JSON.stringify(loadTable().presets), JSON.stringify(SCENE_TILE_PRESETS.presets));
  });

  suite.test('峽谷落石開場：中間兩排 4 塊落石（阻擋）＋ 3 格碎石（不阻擋、強制後退），lane 4 depth 4 保持通行', () => {
    const state = new BattleState();
    resolveBattleTacticBehavior(BattleTactic.RockSlide).applyStartOfBattle(state, { random: () => 0, casterGenes: [] });
    const rocks = [[1, 4], [2, 4], [3, 4], [0, 4]].filter(([l, d]) => state.getTileEffect(l, d)?.blocksMovement === true);
    assert.equals(4, rocks.length);
    const debris = [[1, 3], [2, 3], [3, 3]].filter(([l, d]) => state.getTileEffect(l, d)?.blocksMovement === false);
    assert.equals(3, debris.length);
    assert.equals(null, state.getTileEffect(4, 4));
    assert.equals(null, state.getTileEffect(0, 3));
  });

  suite.test('驗證抓出合計不為 100 與未知種類', () => {
    const errors = validateSceneTilePresets({ version: 1, presets: { BAD: { normal: 50, lava: 10 } as never } });
    assert.equals(2, errors.length);
  });

  suite.test('分配格數：最大餘數法總數不變', () => {
    const table = loadTable();
    const canyon = allocateSceneTiles(table, 'SCENE_CANYON_ROCK', 25);
    assert.equals(25, canyon.normal + canyon.stealth + canyon.hazard + canyon.forceMove);
    assert.equals(10, canyon.hazard);
    const flood = allocateSceneTiles(table, 'SCENE_FLOOD', 7);
    assert.equals(7, flood.normal + flood.hazard + flood.forceMove);
    assert.equals(10, allocateSceneTiles(table, 'UNKNOWN', 10).normal);
  });

  return suite;
}
