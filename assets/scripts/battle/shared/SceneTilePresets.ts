// @spec-source → 戰法場景規格書.md (doc_spec_0039) C 段「Tile 預設」、F 段 P0 Tile-State 預設配置表（PROG-2-1584）
/** 場景 Tile 種類：一般、隱蔽、危險（陷阱／落石／深水）、強制位移（水流） */
import { SeededRandom } from '../../core/systems/SeededRandom';

export type SceneTileKind = 'normal' | 'stealth' | 'hazard' | 'forceMove';

export const SCENE_TILE_KINDS: readonly SceneTileKind[] = ['normal', 'stealth', 'hazard', 'forceMove'];

/** 一個場景的 Tile 比例（百分比，合計 100） */
export type SceneTilePreset = Partial<Record<SceneTileKind, number>>;

export interface SceneTilePresetTable {
  version: number;
  presets: Record<string, SceneTilePreset>;
}

/** 內建配置表：與 assets/resources/data/scene-tile-presets.json 一致（測試比對），戰場開場同步取用 */
export const SCENE_TILE_PRESETS: SceneTilePresetTable = {
  version: 1,
  presets: {
    SCENE_FOREST_AMBUSH: { stealth: 60, hazard: 20, normal: 20 },
    SCENE_CANYON_ROCK: { hazard: 40, normal: 30, forceMove: 30 },
    SCENE_FLOOD: { forceMove: 50, hazard: 30, normal: 20 },
    // 以下三場景依《場景戰法六種設定檔JSON資料驅動結構規格書》doc_spec_0368 §2（PROG-2-2050）
    SCENE_NIGHT_RAID: { normal: 70, hazard: 30 },
    SCENE_FIRE_RAID: { normal: 40, hazard: 60 },
    SCENE_SIEGE: { normal: 50, hazard: 30, forceMove: 20 },
  },
};

/** 各場景背景資源鍵（doc_spec_0368 §2）；不在表中者回退 SCENE_FALLBACK_BG_KEY（§3-3） */
export const SCENE_BG_KEYS: Readonly<Record<string, string>> = {
  SCENE_FOREST_AMBUSH: 'bg_forest_dense',
  SCENE_NIGHT_RAID: 'bg_canyon_night',
  SCENE_CANYON_ROCK: 'bg_canyon_day',
  SCENE_FLOOD: 'bg_river_flood',
  SCENE_FIRE_RAID: 'bg_plains_fire',
  SCENE_SIEGE: 'bg_city_wall',
};

export const SCENE_FALLBACK_BG_KEY = 'bg_normal_day';

export function resolveSceneBgKey(sceneId: string): string {
  return SCENE_BG_KEYS[sceneId] ?? SCENE_FALLBACK_BG_KEY;
}

/** 檢查配置表：比例須為非負整數且每個場景合計 100；回傳錯誤訊息清單（空陣列代表通過） */
export function validateSceneTilePresets(table: SceneTilePresetTable): string[] {
  const errors: string[] = [];
  for (const [sceneId, preset] of Object.entries(table.presets ?? {})) {
    let total = 0;
    for (const [kind, value] of Object.entries(preset)) {
      if (!SCENE_TILE_KINDS.includes(kind as SceneTileKind)) errors.push(`${sceneId}: 未知 Tile 種類 ${kind}`);
      if (!Number.isInteger(value) || (value as number) < 0) errors.push(`${sceneId}: ${kind} 比例須為非負整數`);
      total += value as number;
    }
    if (total !== 100) errors.push(`${sceneId}: 比例合計 ${total}，應為 100`);
  }
  return errors;
}

const REMAINDER_TIE_ORDER: readonly SceneTileKind[] = ['stealth', 'hazard', 'forceMove', 'normal'];

/**
 * 依比例把 cellCount 格分配到各 Tile 種類（最大餘數法，總數恰為 cellCount）。
 * 場景不在表中時全部為 normal。
 */
export function allocateSceneTiles(table: SceneTilePresetTable, sceneId: string, cellCount: number): Record<SceneTileKind, number> {
  const result: Record<SceneTileKind, number> = { normal: 0, stealth: 0, hazard: 0, forceMove: 0 };
  const preset = table.presets?.[sceneId];
  if (!preset) {
    result.normal = cellCount;
    return result;
  }
  const remainders: Array<{ kind: SceneTileKind; rest: number }> = [];
  let assigned = 0;
  for (const kind of SCENE_TILE_KINDS) {
    const exact = (cellCount * (preset[kind] ?? 0)) / 100;
    result[kind] = Math.floor(exact);
    assigned += result[kind];
    remainders.push({ kind, rest: exact - result[kind] });
  }
  // 餘數相等時依 stealth > hazard > forceMove > normal 補齊（doc_spec_0369 §2.2-3，PROG-2-2051）
  remainders.sort((a, b) => (b.rest - a.rest) || (REMAINDER_TIE_ORDER.indexOf(a.kind) - REMAINDER_TIE_ORDER.indexOf(b.kind)));
  for (let i = 0; assigned < cellCount; i += 1, assigned += 1) result[remainders[i % remainders.length].kind] += 1;
  return result;
}

/**
 * 依種子把場景地格放到 lanes × depth 棋盤（doc_spec_0369 §4，PROG-2-2051）。
 * 先按全盤格數分配，再以 Fisher-Yates 洗牌把非 normal 地格放進中段；
 * 雙方部署底線（depth 0 與最後一排）一律 normal，中段放不下的部分也退為 normal。
 * 回傳 grid[lane][depth]；同種子同場景結果一致。
 */
export function placeSceneTiles(table: SceneTilePresetTable, sceneId: string, lanes: number, depth: number, seed: number): SceneTileKind[][] {
  const grid: SceneTileKind[][] = [];
  for (let lane = 0; lane < lanes; lane += 1) grid.push(new Array<SceneTileKind>(depth).fill('normal'));
  const counts = allocateSceneTiles(table, sceneId, lanes * depth);
  const interior: Array<[number, number]> = [];
  for (let lane = 0; lane < lanes; lane += 1) {
    for (let d = 1; d < depth - 1; d += 1) interior.push([lane, d]);
  }
  const rng = new SeededRandom(seed);
  for (let i = interior.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [interior[i], interior[j]] = [interior[j], interior[i]];
  }
  let cursor = 0;
  for (const kind of REMAINDER_TIE_ORDER) {
    if (kind === 'normal') continue;
    for (let n = 0; n < counts[kind] && cursor < interior.length; n += 1, cursor += 1) {
      const [lane, d] = interior[cursor];
      grid[lane][d] = kind;
    }
  }
  return grid;
}
