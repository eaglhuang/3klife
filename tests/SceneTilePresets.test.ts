import * as fs from 'fs';
import * as path from 'path';
import { allocateSceneTiles, validateSceneTilePresets, type SceneTilePresetTable } from '../assets/scripts/battle/shared/SceneTilePresets';
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
