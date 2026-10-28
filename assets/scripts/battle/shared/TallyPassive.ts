// @spec-source → 兵種（虎符）系統.md：死亡傳承虎符（白馬 / 騎射合一；解煩、丹陽、吳國數值被動 PROG-2-1433；止啼符、藤甲 PROG-2-1437；虎痴符 PROG-2-1444；錦帆、工甲符、白耳、元戎、常山女暫定數字 PROG-2-1457）
/**
 * TallyPassive — 虎符被動的通用掛點（不依賴 cc）
 *
 * 虎符部隊出陣綁定時呼叫 applyTallyPassive，依卡片模板 id 查表套用被動。
 * 之後其他虎符被動（七進七出、結姻連射、空城計…）各自加一條表項即可，
 * 不需要再改綁定流程。
 *
 * Unity 對照：ScriptableObject 上的被動欄位，部署時 Instantiate 後依資料套用到角色上。
 */
import { Faction, GAME_CONFIG, TerrainType, TroopType } from '../../core/config/Constants';
import type { TroopUnit } from '../../core/models/TroopUnit';
import { MORALE_DURATION_TURNS } from './Morale';

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
  /** 防禦乘數（虎痴符裸衣決鬥 ×0.5，PROG-2-1444） */
  defenseMultiplier?: number;
  /** 藤甲：承受部隊攻擊（物理）傷害的乘數 */
  physicalDamageTaken?: number;
  /** 藤甲：承受火計傷害的乘數 */
  fireDamageTaken?: number;
  /** 恐懼光環（錦帆）：周圍 radius 格內（含斜角）敵軍部隊攻擊 × multiplier（PROG-2-1457） */
  enemyAttackAura?: { radius: number; multiplier: number };
  /** 穿透（工甲符）：部隊攻擊時無視目標此比例的防禦 */
  defensePenetration?: number;
  /** 兵種剋制（白耳剋弓、元戎壓制步兵）：目標兵種符合時部隊攻擊傷害 × multiplier */
  damageVsTroopTypes?: { types: readonly TroopType[]; multiplier: number };
  /** 連擊（元戎）：每次攻擊固定多打的次數 */
  extraHits?: number;
  /** 迴避（常山女 +30%）：攻擊此部隊的命中率減少值 */
  evasionBonus?: number;
  /** 免疫恐懼（先登）：敵方恐懼光環對此部隊不生效（PROG-2-1513） */
  fearImmune?: boolean;
  /** 恐懼衝鋒（鐵騎）：發動部隊攻擊時，周圍 radius 格內（含斜角）敵軍士氣 -moralePenalty（PROG-2-1514） */
  fearCharge?: { radius: number; moralePenalty: number };
  /** 士氣不降（大喬）：敵方扣士氣效果對此部隊不生效（PROG-2-1525） */
  moraleNoDecrease?: boolean;
  /** 治療友軍（常山女）：自己陣營回合沿用醫療兵治療（PROG-2-1526） */
  healsAllies?: boolean;
  /** 濺射（南蠻巨型踐踏）：目標周圍 radius 格內其他敵軍受主傷害 × ratio（PROG-2-1527） */
  splash?: { radius: number; ratio: number };
  /** 替主將承傷（白耳）：主將部隊受傷時，周圍 radius 格內的此部隊代為承受（PROG-2-1529） */
  guardsGeneral?: { radius: number };
  /** 捨命護主（惡來符）：周圍 radius 格內友軍受傷時由此部隊代為承受（PROG-2-1530） */
  guardsAllies?: { radius: number };
  /** 血低防高（惡來符）：防禦乘數 × (1 + bonus × 已損血比例) */
  lowHpDefenseBonus?: number;
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
  // 虎痴符（裸衣決鬥）：防禦減半，攻擊力翻倍
  'tiger-tally-hu-chi-fu': { attackMultiplier: 2, defenseMultiplier: 0.5 },
  // 以下五條規格未寫數字，使用者裁定先用暫定數字（PROG-2-1457），調整只改這裡
  // 錦帆：恐懼光環，周圍 1 格敵軍攻擊 ×0.8；水上（河道）移動 +1、攻擊 ×1.2
  'tiger-tally-jin-fan': {
    enemyAttackAura: { radius: 1, multiplier: 0.8 },
    attackMultiplier: 1.2,
    attackTerrains: [TerrainType.River],
    terrainMoveBonus: { terrains: [TerrainType.River], bonus: 1 },
  },
  // 工甲符：可穿透防禦，無視 30% 防禦（「連擊時傷害提升」需連擊來源，未做）
  'tiger-tally-gong-jia-fu': { defensePenetration: 0.3 },
  // 白耳：剋制弓兵，對弓兵傷害 ×1.5（替主將承傷、斷後防禦 ×2 未做）
  'tiger-tally-bai-er': { damageVsTroopTypes: { types: [TroopType.Archer], multiplier: 1.5 }, guardsGeneral: { radius: 1 } },
  // 元戎：連弩齊射，每次攻擊多打 1 下；壓制步兵，對步兵傷害 ×1.5；範圍傷害沿用濺射 1 格 50%（PROG-2-1528 暫定）
  'tiger-tally-yuan-rong': {
    extraHits: 1,
    damageVsTroopTypes: { types: [TroopType.Infantry], multiplier: 1.5 },
    splash: { radius: 1, ratio: 0.5 },
  },
  // 常山女：迴避 +30%（規格數字；治療友軍未做）
  'tiger-tally-changshan-nu': { evasionBonus: 0.3, healsAllies: true },
  // 先登：免疫恐懼（PROG-2-1513）；攻城傷害 ×2 待攻城戰落地再接
  'tiger-tally-xian-deng': { fearImmune: true },
  // 鐵騎：恐懼衝鋒，攻擊時周圍 1 格敵軍士氣 -20（PROG-2-1514；範圍暫定 1 格）
  'tiger-tally-tie-qi': { fearCharge: { radius: 1, moralePenalty: 20 } },
  // 大喬：士氣不降（PROG-2-1525）；全隊魅力 +20 因戰場部隊沒有魅力屬性未做
  'tiger-tally-da-qiao': { moraleNoDecrease: true },
  // 南蠻：巨型踐踏濺射，目標周圍 1 格敵軍受 50%（PROG-2-1527 暫定數字）；無視輕型步兵阻擋未做
  'tiger-tally-nan-man': { splash: { radius: 1, ratio: 0.5 } },
  // 惡來符：捨命護主，替周圍 1 格友軍承傷；血低防高，空血時防禦 ×2（PROG-2-1530 暫定數字）
  'tiger-tally-e-lai-fu': { guardsAllies: { radius: 1 }, lowHpDefenseBonus: 1 },
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

/** 恐懼光環：unit 周圍有帶光環的敵方部隊時，unit 的攻擊乘數（多個光環相乘）；沒有時為 1 */
export function tallyEnemyAuraAttackMultiplierOf(unit: TroopUnit, units: Iterable<TroopUnit>): number {
  if (passiveOf(unit)?.fearImmune) return 1;
  let multiplier = 1;
  for (const other of units) {
    if (other.faction === unit.faction || other.isDead()) continue;
    const aura = passiveOf(other)?.enemyAttackAura;
    if (!aura) continue;
    if (Math.max(Math.abs(other.lane - unit.lane), Math.abs(other.depth - unit.depth)) <= aura.radius) {
      multiplier *= aura.multiplier;
    }
  }
  return multiplier;
}

/**
 * 恐懼衝鋒：attacker 帶 fearCharge 時，周圍敵軍（免疫恐懼者除外）士氣扣減。
 * 降士氣若本來沒在計時，開始計時，到期由 advanceMorale 歸零（不留永久負士氣）。回傳受影響的部隊。
 */
export function applyFearCharge(attacker: TroopUnit, units: Iterable<TroopUnit>): TroopUnit[] {
  const charge = passiveOf(attacker)?.fearCharge;
  if (!charge) return [];
  const affected: TroopUnit[] = [];
  for (const other of units) {
    const otherSpec = passiveOf(other);
    if (other.faction === attacker.faction || other.isDead() || otherSpec?.fearImmune || otherSpec?.moraleNoDecrease) continue;
    if (Math.max(Math.abs(other.lane - attacker.lane), Math.abs(other.depth - attacker.depth)) > charge.radius) continue;
    other.morale -= charge.moralePenalty;
    if (other.moraleTurns <= 0) other.moraleTurns = MORALE_DURATION_TURNS;
    affected.push(other);
  }
  return affected;
}

/** 濺射：回傳要波及的敵軍與傷害比例；沒有此被動時 ratio 為 0、targets 為空 */
export function tallySplashTargetsOf(attacker: TroopUnit, defender: TroopUnit, units: Iterable<TroopUnit>): { targets: TroopUnit[]; ratio: number } {
  const splash = passiveOf(attacker)?.splash;
  if (!splash) return { targets: [], ratio: 0 };
  const targets: TroopUnit[] = [];
  for (const other of units) {
    if (other === defender || other.faction === attacker.faction || other.isDead()) continue;
    if (Math.max(Math.abs(other.lane - defender.lane), Math.abs(other.depth - defender.depth)) <= splash.radius) targets.push(other);
  }
  return { targets, ratio: splash.ratio };
}

/**
 * 代為承傷：回傳 unit 周圍可代為承傷的同陣營存活部隊（取第一個）；沒有時為 null。
 * 白耳（guardsGeneral）只護主將，主將判定由 isGeneral 延遲呼叫；惡來（guardsAllies）護任何友軍。
 */
export function tallyDamageGuardOf(unit: TroopUnit, units: Iterable<TroopUnit>, isGeneral: () => boolean): TroopUnit | null {
  let general: boolean | null = null;
  for (const other of units) {
    if (other === unit || other.faction !== unit.faction || other.isDead()) continue;
    const spec = passiveOf(other);
    if (!spec?.guardsAllies && !spec?.guardsGeneral) continue;
    const distance = Math.max(Math.abs(other.lane - unit.lane), Math.abs(other.depth - unit.depth));
    if (spec.guardsAllies && distance <= spec.guardsAllies.radius) return other;
    if (spec.guardsGeneral && distance <= spec.guardsGeneral.radius) {
      general ??= isGeneral();
      if (general) return other;
    }
  }
  return null;
}

/** 此部隊是否帶治療友軍被動（常山女）；沒有時為 false */
export function tallyHealsAllies(unit: TroopUnit): boolean {
  return passiveOf(unit)?.healsAllies === true;
}

/** 部隊攻擊時無視目標防禦的比例；沒有此被動時為 0 */
export function tallyDefensePenetrationOf(unit: TroopUnit): number {
  return passiveOf(unit)?.defensePenetration ?? 0;
}

/** 兵種剋制：目標兵種符合時的傷害乘數；否則為 1 */
export function tallyTroopTypeDamageMultiplierOf(attacker: TroopUnit, target: TroopUnit): number {
  const spec = passiveOf(attacker)?.damageVsTroopTypes;
  return spec && spec.types.includes(target.type) ? spec.multiplier : 1;
}

/** 攻擊此部隊的命中率減少值；沒有此被動時為 0 */
export function tallyEvasionBonusOf(unit: TroopUnit): number {
  return passiveOf(unit)?.evasionBonus ?? 0;
}

/** 虎符被動的防禦乘數；沒有此被動時為 1 */
export function tallyDefenseMultiplierOf(unit: TroopUnit): number {
  const spec = passiveOf(unit);
  const base = spec?.defenseMultiplier ?? 1;
  if (!spec?.lowHpDefenseBonus) return base;
  const maxHp = unit.getEffectiveMaxHp();
  const lostRatio = maxHp > 0 ? Math.min(1, Math.max(0, 1 - unit.currentHp / maxHp)) : 0;
  return base * (1 + spec.lowHpDefenseBonus * lostRatio);
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
  const spec = passiveOf(unit);
  if (!spec) return 0;
  const conditional = spec.extraHitWhenAdjacentMale && adjacentToMaleGeneral ? spec.extraHitWhenAdjacentMale : 0;
  return (spec.extraHits ?? 0) + conditional;
}
