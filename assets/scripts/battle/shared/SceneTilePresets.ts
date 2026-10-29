// @spec-source → 戰法場景規格書.md (doc_spec_0039) C 段「Tile 預設」、F 段 P0 Tile-State 預設配置表（PROG-2-1584）
/** 場景 Tile 種類：一般、隱蔽、危險（陷阱／落石／深水）、強制位移（水流） */
export type SceneTileKind = 'normal' | 'stealth' | 'hazard' | 'forceMove';

export const SCENE_TILE_KINDS: readonly SceneTileKind[] = ['normal', 'stealth', 'hazard', 'forceMove'];

/** 一個場景的 Tile 比例（百分比，合計 100） */
export type SceneTilePreset = Partial<Record<SceneTileKind, number>>;

export interface SceneTilePresetTable {
  version: number;
  presets: Record<string, SceneTilePreset>;
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
  remainders.sort((a, b) => b.rest - a.rest);
  for (let i = 0; assigned < cellCount; i += 1, assigned += 1) result[remainders[i % remainders.length].kind] += 1;
  return result;
}
