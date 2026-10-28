// @spec-source → 兵種（虎符）系統.md：死亡傳承虎符（白馬 / 騎射合一；解煩、丹陽、吳國數值被動 PROG-2-1433；止啼符、藤甲 PROG-2-1437）
/**
 * TallyPassive — 虎符被動的通用掛點（不依賴 cc）
 *
 * 虎符部隊出陣綁定時呼叫 applyTallyPassive，依卡片模板 id 查表套用被動。
 * 之後其他虎符被動（七進七出、結姻連射、空城計…）各自加一條表項即可，
 * 不需要再改綁定流程。
 *
 * Unity 對照：ScriptableObject 上的被動欄位，部署時 Instantiate 後依資料套用到角色上。
 */
import { Faction, GAME_CONFIG, TerrainType } from '../../core/config/Constants';
import type { TroopUnit } from '../../core/models/TroopUnit';

/** 弓兵射程（BattleUnitSpawner 弓兵 attackRange = 2） */
const ARCHER_ATTACK_RANGE = 2;

export interface TallyPassiveSpec {
  /** 射程下限：攻擊射程至少提高到這個值 */
  attackRangeFloor?: number;
  /** 結姻連射：與男性武將相鄰時，每次攻擊額外多打的次數 */
  extraHitWhenAdjacentMale?: number;
  /** 騎射合一：移動力加成（規格 Move + 1，PROG-2-0796） */
  moveRangeBonus?: number;
  /** 七進七出：移動穿透敵格（Ghost_Move），由移動階段依穿透規則結算（PROG-2-0776） */
  ghostMove?: boolean;
  /** 攻擊乘數（解煩／丹陽／吳國 +20%，PROG-2-1433）；有 attackTerrains 時只在這些地形生效 */
  attackMultiplier?: number;
  attackTerrains?: readonly TerrainType[];
  /** 地形移動加成：站在指定地形時移動力 +bonus（丹陽山地、吳國水域 +2） */
  terrainMoveBonus?: { terrains: readonly TerrainType[]; bonus: number };
  /** 突襲止啼：目標站在其陣營後排 rows 列內時，部隊攻擊傷害 × multiplier（PROG-2-1437） */
  backRowDamage?: { rows: number; multiplier: number };
  /** 藤甲：承受部隊攻擊（物理）傷害的乘數 */
  physicalDamageTaken?: number;
  /** 藤甲：承受火計傷害的乘數 */
  fireDamageTaken?: number;
}

/** 虎符模板 id → 被動規格；暫定數字，規格未寫的欄位以此為準 */
export const TALLY_PASSIVE_BY_TEMPLATE: Readonly<Record<string, TallyPassiveSpec>> = {
  // 騎射合一：騎兵保留騎兵移動力，攻擊射程改用弓兵射程
  // 騎射合一：攻擊射程 ＝ 弓兵射程、移動 +1（g.md 規格）；移動後攻擊由戰鬥階段用移動後格位計算
  'tiger-tally-bai-ma': { attackRangeFloor: ARCHER_ATTACK_RANGE, moveRangeBonus: 1 },
  // 結姻連射：與男性武將相鄰時攻擊次數 +1（每次攻擊判定，不是出陣時套用）
  'tiger-tally-jiao-ji': { extraHitWhenAdjacentMale: 1 },
  // 七進七出（龍膽符）：暫定 id，龍膽符尚未進 TallyCardCatalog，出陣前不會有單位帶到
  'tiger-tally-long-dan': { ghostMove: true },
  // 解煩（突擊步兵）：移動 +2、攻擊 +20%，不限地形。以下三條模板 id 沿用規格表 tacticId，尚未進 TallyCardCatalog
  'tiger-tally-jie-fan': { moveRangeBonus: 2, attackMultiplier: 1.2 },
  // 丹陽（山地特化）：站在山地時移動 +2、攻擊 +20%
  'tiger-tally-dan-yang': {
    attackMultiplier: 1.2,
    attackTerrains: [TerrainType.Mountain],
    terrainMoveBonus: { terrains: [TerrainType.Mountain], bonus: 2 },
  },
  // 吳國（水域特化）：站在河道時移動 +2、攻擊 +20%
  'tiger-tally-wu-guo': {
    attackMultiplier: 1.2,
    attackTerrains: [TerrainType.River],
    terrainMoveBonus: { terrains: [TerrainType.River], bonus: 2 },
  },
  // 止啼符（逍遙精騎）：對敵方後排兩列傷害 +50%
  'tiger-tally-zhi-ti-fu': { backRowDamage: { rows: 2, multiplier: 1.5 } },
  // 藤甲：物理減傷 50%，但火攻 ×3
  'tiger-tally-teng-jia': { physicalDamageTaken: 0.5, fireDamageTaken: 3 },
};

/** 各陣營出兵列（後排起點）：我方由 depth 0 出兵、敵方由最後一列出兵 */
const DEPLOY_DEPTH: Record<Faction, number> = {
  [Faction.Player]: 0,
  [Faction.Enemy]: GAME_CONFIG.GRID_DEPTH - 1,
};

function passiveOf(unit: TroopUnit): TallyPassiveSpec | undefined {
  return unit.tallyTemplateId ? TALLY_PASSIVE_BY_TEMPLATE[unit.tallyTemplateId] : undefined;
}

/** 虎符被動的攻擊乘數；不在指定地形或沒有此被動時為 1 */
export function tallyAttackMultiplierOf(unit: TroopUnit, terrain: TerrainType): number {
  const spec = passiveOf(unit);
  if (!spec?.attackMultiplier) return 1;
  if (spec.attackTerrains && !spec.attackTerrains.includes(terrain)) return 1;
  return spec.attackMultiplier;
}

/** 虎符被動的地形移動加成；站的地形不符或沒有此被動時為 0 */
export function tallyTerrainMoveBonusOf(unit: TroopUnit, terrain: TerrainType): number {
  const bonus = passiveOf(unit)?.terrainMoveBonus;
  return bonus && bonus.terrains.includes(terrain) ? bonus.bonus : 0;
}

/** 突襲止啼：目標在其陣營後排 rows 列內時回傳傷害乘數，否則為 1 */
export function tallyBackRowDamageMultiplierOf(attacker: TroopUnit, target: TroopUnit): number {
  const spec = passiveOf(attacker)?.backRowDamage;
  if (!spec) return 1;
  return Math.abs(target.depth - DEPLOY_DEPTH[target.faction]) < spec.rows ? spec.multiplier : 1;
}

/** 承受部隊攻擊（物理）傷害的乘數；沒有此被動時為 1 */
export function tallyPhysicalDamageTakenOf(unit: TroopUnit): number {
  return passiveOf(unit)?.physicalDamageTaken ?? 1;
}

/** 承受火計傷害的乘數；沒有此被動時為 1 */
export function tallyFireDamageTakenOf(unit: TroopUnit): number {
  return passiveOf(unit)?.fireDamageTaken ?? 1;
}

/** 此部隊是否帶七進七出（移動穿透敵格）；沒有模板 id 或沒有該被動時為 false */
export function hasGhostMove(unit: TroopUnit): boolean {
  const spec = unit.tallyTemplateId ? TALLY_PASSIVE_BY_TEMPLATE[unit.tallyTemplateId] : undefined;
  return spec?.ghostMove === true;
}

/** 把虎符被動套到部隊上；沒有被動或沒有模板 id 時什麼都不做 */
export function applyTallyPassive(unit: TroopUnit, templateId: string | null): void {
  const spec = templateId ? TALLY_PASSIVE_BY_TEMPLATE[templateId] : undefined;
  if (!spec) return;
  if (spec.attackRangeFloor !== undefined) {
    unit.attackRange = Math.max(unit.attackRange, spec.attackRangeFloor);
  }
  if (spec.moveRangeBonus !== undefined) {
    unit.moveRangeBonus += spec.moveRangeBonus;
  }
}

/**
 * 額外攻擊次數（結姻連射）：沒有此被動、或不與男性武將相鄰時為 0。
 * 相鄰判定由戰鬥解算端算好傳入（武將不在格子上，要看所屬陣營的主將位置）。
 */
export function extraAttackHitsOf(unit: TroopUnit, adjacentToMaleGeneral: boolean): number {
  const spec = unit.tallyTemplateId ? TALLY_PASSIVE_BY_TEMPLATE[unit.tallyTemplateId] : undefined;
  if (!spec?.extraHitWhenAdjacentMale || !adjacentToMaleGeneral) return 0;
  return spec.extraHitWhenAdjacentMale;
}
