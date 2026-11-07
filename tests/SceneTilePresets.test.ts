import * as fs from 'fs';
import * as path from 'path';
import { allocateSceneTiles, placeSceneTiles, resolveSceneBgKey, SCENE_TILE_PRESETS, validateSceneTilePresets, type SceneTilePresetTable } from '../assets/scripts/battle/shared/SceneTilePresets';
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

  suite.test('六種場景皆有地格比例與背景鍵，未知場景回退 normal 100 與 bg_normal_day（doc_spec_0368）', () => {
    const ids = ['SCENE_FOREST_AMBUSH', 'SCENE_NIGHT_RAID', 'SCENE_CANYON_ROCK', 'SCENE_FLOOD', 'SCENE_FIRE_RAID', 'SCENE_SIEGE'];
    for (const id of ids) assert.isTrue(SCENE_TILE_PRESETS.presets[id] !== undefined);
    assert.equals(60, SCENE_TILE_PRESETS.presets.SCENE_FIRE_RAID.hazard ?? 0);
    assert.equals(20, SCENE_TILE_PRESETS.presets.SCENE_SIEGE.forceMove ?? 0);
    assert.equals('bg_city_wall', resolveSceneBgKey('SCENE_SIEGE'));
    assert.equals('bg_normal_day', resolveSceneBgKey('SCENE_UNKNOWN'));
    assert.equals(10, allocateSceneTiles(SCENE_TILE_PRESETS, 'SCENE_UNKNOWN', 10).normal);
  });

  suite.test('最大餘數同分依 stealth > hazard > forceMove > normal 補齊，總數恰為 cellCount（doc_spec_0369 §2）', () => {
    const table: SceneTilePresetTable = { version: 1, presets: { T: { normal: 25, stealth: 25, hazard: 25, forceMove: 25 } } };
    const c = allocateSceneTiles(table, 'T', 6);
    assert.equals('2,2,1,1', [c.stealth, c.hazard, c.forceMove, c.normal].join(','));
    for (const n of [40, 48, 37]) {
      const r = allocateSceneTiles(SCENE_TILE_PRESETS, 'SCENE_SIEGE', n);
      assert.equals(n, r.normal + r.stealth + r.hazard + r.forceMove);
    }
  });

  suite.test('種子放置可重現且部署底線全為 normal（doc_spec_0369 §4）', () => {
    const a = placeSceneTiles(SCENE_TILE_PRESETS, 'SCENE_FLOOD', 5, 8, 42);
    const b = placeSceneTiles(SCENE_TILE_PRESETS, 'SCENE_FLOOD', 5, 8, 42);
    assert.equals(JSON.stringify(a), JSON.stringify(b));
    for (const row of a) {
      assert.equals('normal', row[0]);
      assert.equals('normal', row[7]);
    }
    const flat = a.flat();
    assert.equals(18, flat.filter((k) => k === 'forceMove').length); // 中段僅 30 格，多出 2 格退為 normal
    assert.equals(12, flat.filter((k) => k === 'hazard').length);
    assert.isTrue(JSON.stringify(placeSceneTiles(SCENE_TILE_PRESETS, 'SCENE_FLOOD', 5, 8, 7)) !== JSON.stringify(a));
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
