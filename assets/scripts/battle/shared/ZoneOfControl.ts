// @spec-source → 育成與戰鬥公式基準手冊 §7.1、§7.2（FORM-09）；門檻與成本規格未定，PROG-2-2130 暫定
/**
 * 動態阻擋（ZOC）：武將以 STR 壓制敵方，在周圍格子產生高移動成本或不可通行區域。
 * 敵方主將可用 STR 或 INT 中較高者抵抗（§7.1「智力反制」）。
 */

export const ZOC_RULES = {
  /** 影響範圍（曼哈頓距離，不含來源本身所在格） */
  radius: 1,
  /** 壓制方 STR ÷ 抵抗值達此倍率：高移動成本 */
  highCostRatio: 1.5,
  /** 壓制方 STR ÷ 抵抗值達此倍率：不可通行 */
  impassableRatio: 2,
  /** 進入高移動成本格額外消耗的移動力 */
  highCostExtra: 1,
} as const;

export type ZocLevel = 'none' | 'high-cost' | 'impassable';

export interface ZocCommanderStats {
  readonly str: number;
  readonly int: number;
}

export interface ZocCell {
  readonly level: ZocLevel;
  readonly extraCost: number;
  readonly blocksEntry: boolean;
}

export interface ZocField {
  at(lane: number, depth: number): ZocCell;
}

const FREE_CELL: ZocCell = { level: 'none', extraCost: 0, blocksEntry: false };
const HIGH_COST_CELL: ZocCell = { level: 'high-cost', extraCost: ZOC_RULES.highCostExtra, blocksEntry: false };
const IMPASSABLE_CELL: ZocCell = { level: 'impassable', extraCost: 0, blocksEntry: true };

export const EMPTY_ZOC_FIELD: ZocField = { at: () => FREE_CELL };

export function zocLevelOf(presser: ZocCommanderStats, mover: ZocCommanderStats): ZocLevel {
  const resist = Math.max(mover.str, mover.int, 1);
  const ratio = presser.str / resist;
  if (ratio >= ZOC_RULES.impassableRatio) return 'impassable';
  if (ratio >= ZOC_RULES.highCostRatio) return 'high-cost';
  return 'none';
}

export function buildZocField(
  presser: ZocCommanderStats | null,
  mover: ZocCommanderStats | null,
  sources: ReadonlyArray<{ readonly lane: number; readonly depth: number }>,
): ZocField {
  if (!presser || !mover || sources.length === 0) return EMPTY_ZOC_FIELD;
  const level = zocLevelOf(presser, mover);
  if (level === 'none') return EMPTY_ZOC_FIELD;
  const cell = level === 'impassable' ? IMPASSABLE_CELL : HIGH_COST_CELL;
  const inZone = (lane: number, depth: number): boolean => sources.some((source) => {
    const distance = Math.abs(source.lane - lane) + Math.abs(source.depth - depth);
    return distance > 0 && distance <= ZOC_RULES.radius;
  });
  return { at: (lane, depth) => (inZone(lane, depth) ? cell : FREE_CELL) };
}
