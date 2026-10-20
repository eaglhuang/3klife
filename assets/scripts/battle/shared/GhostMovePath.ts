// @spec-source → 戰法系統 G-1 七進七出（Ghost_Move）；PROG-2-0798（PM 暫定裁定）
/**
 * GhostMovePath — 七進七出的穿透路徑規則（純邏輯，不依賴 cc）
 *
 * 規則（PM 暫定）：路徑上每個敵軍各受一次傷害（同格只算一次）；
 * 穿越岩石或友軍則整段無效；終點必須空。
 */
import { Faction } from '../../core/config/Constants';

export interface GhostPathCell {
  lane: number;
  depth: number;
  /** 格上佔用單位所屬陣營；空格為 null */
  occupantFaction: Faction | null;
  /** 岩石等擋移動的地格 */
  blocksMovement: boolean;
}

export interface GhostPathResult {
  /** 路徑上被穿透的敵軍格，每格一次 */
  passedEnemyCells: Array<{ lane: number; depth: number }>;
  /** 整段是否無效（岩石、友軍、或終點被佔） */
  blocked: boolean;
}

/** 依序檢查路徑格（不含起點，終點為最後一格） */
export function resolveGhostPath(cells: readonly GhostPathCell[], casterFaction: Faction): GhostPathResult {
  const passedEnemyCells: Array<{ lane: number; depth: number }> = [];
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    if (cell.blocksMovement || cell.occupantFaction === casterFaction) {
      return { passedEnemyCells: [], blocked: true };
    }
    const isDestination = index === cells.length - 1;
    if (cell.occupantFaction !== null) {
      if (isDestination) {
        return { passedEnemyCells: [], blocked: true };
      }
      passedEnemyCells.push({ lane: cell.lane, depth: cell.depth });
    }
  }
  return { passedEnemyCells, blocked: false };
}
