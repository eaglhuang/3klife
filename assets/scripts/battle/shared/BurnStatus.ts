// @spec-source → 戰鬥增益減益效果堆疊與治療結算規格書.md（doc_spec_0359）§3 燃燒；PROG-2-9726（使用者 11/22 裁決）
/**
 * BurnStatus — 燃燒狀態（純邏輯，不依賴 cc）
 *
 * 使用者 11/22 裁決：兩種情況會燃燒——踩到火格（hazard-fire）、被火攻類戰法命中。
 * 每回合（燃燒者所屬陣營的戰術階段）扣最大 HP 的比例，持續 2 回合，不蔓延；
 * 同名狀態最多疊 3 層，層數與回合沿用 BuffStackHeal.applyBuffStack（回合取 max，不相加）。
 * 所有數值放 assets/resources/data/battle-burn.json（此處內建表與 JSON 一致，測試比對）。
 */
import { applyBuffStack, type StatusStack } from './BuffStackHeal';

export interface BurnConfig {
  version: number;
  burn: {
    /** 每回合扣最大 HP 的比例（每層） */
    maxHpRatioPerTurn: number;
    durationTurns: number;
    stackCap: number;
    /** 疊層是否讓每回合傷害隨層數倍增 */
    damageScalesWithStacks: boolean;
    /** 是否蔓延到相鄰單位（裁決：不蔓延，固定 false） */
    spreads: boolean;
  };
  fireTile: {
    /** 戰法留下的火格存在回合數（以玩家回合為一輪）；地圖原生火格不受此限、永久存在 */
    durationTurns: number;
  };
  /** 戰法 profile.tags 含此標籤即視為火攻類 */
  fireSkillTag: string;
}

export const BURN_CONFIG: BurnConfig = {
  version: 1,
  burn: { maxHpRatioPerTurn: 0.04, durationTurns: 2, stackCap: 3, damageScalesWithStacks: true, spreads: false },
  fireTile: { durationTurns: 2 },
  fireSkillTag: 'fire',
};

/** 狀態圖示／飄字／BuffApplied 事件共用的狀態代號 */
export const BURN_STATUS_ID = 'burn';

export interface UnitBurn extends StatusStack {
  unitId: string;
}

/** 施加燃燒：疊層與回合刷新沿用 applyBuffStack，再套用本表的層數上限 */
export function applyUnitBurn(book: Map<string, UnitBurn>, unitId: string, config: BurnConfig = BURN_CONFIG): UnitBurn {
  const prev = book.get(unitId) ?? null;
  const next = applyBuffStack(prev, config.burn.durationTurns);
  const stacks = Math.min(Math.max(1, Math.floor(config.burn.stackCap)), next.stacks);
  const burn: UnitBurn = { unitId, stacks, remainingTurns: next.remainingTurns };
  book.set(unitId, burn);
  return burn;
}

/** 每回合傷害：最大 HP × 比例 ×（層數），至少 1 */
export function burnDamageOf(maxHp: number, stacks: number, config: BurnConfig = BURN_CONFIG): number {
  const layers = config.burn.damageScalesWithStacks ? Math.max(1, stacks) : 1;
  return Math.max(1, Math.floor(Math.max(0, maxHp) * config.burn.maxHpRatioPerTurn * layers));
}

/** 結算一次後遞減回合；回傳是否仍保留 */
export function advanceUnitBurn(burn: UnitBurn): boolean {
  burn.remainingTurns -= 1;
  return burn.remainingTurns > 0;
}
