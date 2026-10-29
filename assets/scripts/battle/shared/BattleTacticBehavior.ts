// @spec-source → 戰法系統.md (doc_spec_0038)；PROG-2-1429 依建檔紀錄補標出處
import { BattleTactic, EVENT_NAMES, Faction, GAME_CONFIG, TerrainType, TroopType } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';
import type { TroopUnit } from '../../core/models/TroopUnit';
import type { BattleState } from '../models/BattleState';
import { BattleTurnManager } from '../runtime/BattleTurnManager';
import { resolveBattleSceneMode, type BattleSceneMode } from './BattleSceneMode';
import { floodDepthBonus } from '../../core/systems/WeatherTacticRestriction';
import { tileStateRuleOf } from './TileStateRules';
import { fateBlessingLevel, fateSuccessChance, rollEventSuccess, ROCK_SLIDE_BASE_SUCCESS, type FateHeldGene } from '../../core/systems/FateBlessing';
import { ROCK_SLIDE_TILE_NOTE } from './StageSalvage';
import { allocateSceneTiles, SCENE_TILE_PRESETS } from './SceneTilePresets';

/**
 * 峽谷落石的 Tile 鋪設（PROG-2-1585 暫定）：比例只套用中間兩排（depth 3–4，共 10 格），兩側出生區不鋪。
 * 落石依序放在 depth 4 中央三列、再往兩側；第 5 列（lane 4）保留通道。碎石格（強制後退）放在落石前一排。
 */
const ROCK_SLIDE_ZONE_CELLS = 10;
const ROCK_SLIDE_ROCK_ORDER: ReadonlyArray<readonly [number, number]> = [[1, 4], [2, 4], [3, 4], [0, 4], [0, 3], [4, 3]];
const ROCK_SLIDE_DEBRIS_ORDER: ReadonlyArray<readonly [number, number]> = [[1, 3], [2, 3], [3, 3], [4, 4]];
export const ROCK_DEBRIS_TILE_NOTE = 'scene-gambit:rock-debris';

export interface BattleDamageAdjustment {
  damage: number;
  damageSource?: string;
}

export interface BattleDamageContext {
  kind: 'unit' | 'general';
  attacker: TroopUnit;
  baseDamage: number;
  state: BattleState;
}

export interface BattleTurnAdvanceContext {
  turnManager: BattleTurnManager;
  applyUnitDamage(
    unit: TroopUnit,
    damage: number,
    attackerFaction: Faction | null,
    options: {
      attackerId: string | null;
      attackerLane: number | null;
      attackerDepth: number | null;
      damageSource?: string;
      allowDamageLink: boolean;
    },
  ): void;
  onGeneralUnitKilled(faction: Faction, svc: ReturnType<typeof services>): void;
  onUnitKilled(unit: TroopUnit, killer: TroopUnit | null, svc: ReturnType<typeof services>): void;
}

/** 戰場開場時的上下文：亂數走戰場種子亂數源；施放者的基因用來算天命加護（FBR-10） */
export interface BattleStartContext {
  random: () => number;
  casterGenes: readonly FateHeldGene[];
}

export interface BattleTacticBehavior {
  applyStartOfBattle(state: BattleState, context: BattleStartContext): void;
  advanceTurn(state: BattleState, context?: BattleTurnAdvanceContext): void;
  isFactionHiddenFrom(attackerFaction: Faction, targetFaction: Faction, state: BattleState): boolean;
  getEffectiveMoveRange(unit: TroopUnit, state: BattleState): number;
  getEffectiveAttackRange(unit: TroopUnit, state: BattleState): number;
  resolveDamageAdjustment(context: BattleDamageContext): BattleDamageAdjustment;
  /** 場景對攻擊方命中率的加減（個百分點，SCN-06）；沒有則為 0 */
  getAccuracyDelta?(attacker: TroopUnit, state: BattleState): number;
  /** 場景對攻擊方暴擊率的加成（個百分點，SCN-06）；沒有則為 0 */
  getCritBonus?(attacker: TroopUnit, state: BattleState): number;
  /** 場景對單位承受火焰傷害的倍率（火格、火計）；沒有則為 1 */
  getFireDamageTakenMultiplier?(unit: TroopUnit, state: BattleState): number;
  /** 場景對單位防禦的倍率（攻城戰城牆地利）；沒有則為 1 */
  getDefenseMultiplier?(unit: TroopUnit, state: BattleState): number;
  /** 場景對工兵攻城傷害的倍率（攻城戰衝車）；沒有則為 1 */
  getSiegeDamageMultiplier?(unit: TroopUnit, state: BattleState): number;
  /** 場景投石機：工兵每回合對城牆區敵軍的範圍傷害；沒有則為 0 */
  getCatapultDamage?(unit: TroopUnit, state: BattleState): number;
}

/** 城牆區：敵方城池在最後兩列（敵方由 depth 7 出兵，我方工兵到 depth 7 攻城，PROG-2-1596 修正） */
export const SIEGE_WALL_MIN_DEPTH = GAME_CONFIG.GRID_DEPTH - 2;
/** 投石機：我方工兵每回合對城牆區敵軍造成的傷害（PROG-2-1596 暫定，不致死） */
export const SIEGE_CATAPULT_DAMAGE = 10;
/** 護城河：城牆區前一列（PROG-2-1598 暫定），站上去的部隊移動力 -1，不擋路、不推移 */
export const SIEGE_MOAT_DEPTH = SIEGE_WALL_MIN_DEPTH - 1;
export const SIEGE_MOAT_MOVE_DELTA = -1;
export const SIEGE_MOAT_TILE_NOTE = 'scene-gambit:siege-moat';
export const SIEGE_WALL_DEFENSE_MULTIPLIER = 1.5;
export const SIEGE_RAM_MULTIPLIER = 2;
/** 水淹深水格每回合傷害（PROG-2-1591，暫定） */
export const FLOOD_DEEP_WATER_DAMAGE_PER_TURN = 10;
const FLOOD_DEPTH_START = 2;
const FLOOD_DEPTH_END = 4;
export const FLOOD_ATTACK_PUSH_LANE_DELTA = -1;
export const FLOOD_ATTACK_PUSH_DEPTH_DELTA = 0;
const FIRE_DAMAGE_PER_TURN = 15;
/** 夜襲全局命中 -25%、暴擊 +20%（戰法場景規格書；PM 裁定 (a)，以規格為準，取代先制增傷） */
const NIGHT_RAID_HIT_DELTA = -0.25;
const NIGHT_RAID_CRIT_BONUS = 0.2;
/** 火燒偷襲戰我方火抗 +50%（戰法場景規格書 B-3；PROG-2-1459）：承受火焰傷害 ×0.5 */
export const FIRE_RAID_PLAYER_FIRE_DAMAGE_TAKEN = 0.5;

/** 目前天氣下水攻應淹沒的格子（PROG-2-0406 雨天擴大；PROG-2-0407 依天氣即時重算） */
function floodAttackCells(weather: BattleState['weather']): Array<{ lane: number; depth: number }> {
  const cells: Array<{ lane: number; depth: number }> = [];
  for (let lane = 0; lane < GAME_CONFIG.GRID_LANES; lane++) {
    const floodDepthStart = lane === 0 || lane === GAME_CONFIG.GRID_LANES - 1
      ? FLOOD_DEPTH_START + 1
      : FLOOD_DEPTH_START;
    // 不超過最後一格
    const floodDepthEnd = Math.min(
      GAME_CONFIG.GRID_DEPTH - 1,
      (lane === 0 || lane === GAME_CONFIG.GRID_LANES - 1 ? FLOOD_DEPTH_END : FLOOD_DEPTH_END + 1) + floodDepthBonus(weather),
    );
    for (let depth = floodDepthStart; depth <= floodDepthEnd; depth++) {
      cells.push({ lane, depth });
    }
  }
  return cells;
}

/**
 * 依目前天氣重算水攻淹沒範圍（PROG-2-0407）：
 * 範圍外的格子還原成淹沒前的地形；範圍內的格子記下原地形後改成河流。
 * 可重複呼叫：開戰時與每次天氣改變時都走這裡。
 */
export function refreshFloodAttackTerrain(state: BattleState): void {
  const targets = floodAttackCells(state.weather);
  const targetKeys = new Set(targets.map(({ lane, depth }) => `${lane},${depth}`));

  for (const [key, original] of Array.from(state.floodOriginalTerrain.entries())) {
    if (targetKeys.has(key)) continue;
    const [lane, depth] = key.split(',').map(Number);
    const cell = state.getCell(lane, depth);
    if (cell) cell.terrain = original;
    state.removeTileEffect(lane, depth);
    state.floodOriginalTerrain.delete(key);
  }

  // 水淹七軍 Tile 比例（SCENE_FLOOD，PROG-2-1591）：淹沒區依比例分成水流（推移）／深水（扣血）／淺灘（無效果）。
  // 下游（depth 大）先放水流，其次深水，上游剩餘格是淺灘；全部地形仍是河流
  const ordered = [...targets].sort((a, b) => b.depth - a.depth || a.lane - b.lane);
  const counts = allocateSceneTiles(SCENE_TILE_PRESETS, 'SCENE_FLOOD', ordered.length);
  ordered.forEach(({ lane, depth }, index) => {
    const cell = state.getCell(lane, depth);
    if (!cell) return;
    const key = `${lane},${depth}`;
    if (!state.floodOriginalTerrain.has(key)) state.floodOriginalTerrain.set(key, cell.terrain);
    cell.terrain = TerrainType.River;
    if (index >= counts.forceMove + counts.hazard) {
      state.removeTileEffect(lane, depth);
      return;
    }
    state.setTileEffect({
      id: `flood-${lane}-${depth}`,
      lane,
      depth,
      state: 'river-current',
      ...(index >= counts.forceMove ? { damagePerTurn: FLOOD_DEEP_WATER_DAMAGE_PER_TURN } : {}),
      notes: 'scene-gambit:flood-attack',
    });
  });
}

function applySiegeMoat(state: BattleState): void {
  for (let lane = 0; lane < GAME_CONFIG.GRID_LANES; lane++) {
    state.setTileEffect({
      id: `siege-moat-${lane}-${SIEGE_MOAT_DEPTH}`,
      lane,
      depth: SIEGE_MOAT_DEPTH,
      state: 'river-current',
      moveRangeDelta: SIEGE_MOAT_MOVE_DELTA,
      notes: SIEGE_MOAT_TILE_NOTE,
    });
  }
}

function applyFloodAttackTerrain(state: BattleState): void {
  refreshFloodAttackTerrain(state);
}

function advanceFloodAttackTurn(state: BattleState, context?: BattleTurnAdvanceContext): void {
  const svc = services();
  const enemyUnits = Array.from(state.units.values())
    .filter((unit) => unit.faction === Faction.Enemy && !unit.isDead())
    .sort((left, right) => left.lane - right.lane || left.depth - right.depth);

  for (const unit of enemyUnits) {
    const effect = state.getTileEffect(unit.lane, unit.depth);
    if (!tileStateRuleOf(effect).pushesOnTurnEnd) {
      continue;
    }

    const nextLane = unit.lane + FLOOD_ATTACK_PUSH_LANE_DELTA;
    const nextDepth = unit.depth + FLOOD_ATTACK_PUSH_DEPTH_DELTA;
    const nextCell = state.getCell(nextLane, nextDepth);
    const blockedByCell = !nextCell || nextCell.occupantId !== null || state.getTileEffect(nextLane, nextDepth)?.blocksMovement === true;
    if (blockedByCell) {
      applyFloodAttackBoundaryDamage(unit, context, svc, 'blocked');
      continue;
    }

    const prevLane = unit.lane;
    const prevDepth = unit.depth;
    state.getCell(prevLane, prevDepth)!.occupantId = null;
    unit.moveTo(nextLane, nextDepth);
    nextCell.occupantId = unit.id;
    svc.event.emit(EVENT_NAMES.UnitMoved, {
      unitId: unit.id,
      lane: unit.lane,
      depth: unit.depth,
      fromLane: prevLane,
      fromDepth: prevDepth,
      forcedMove: true,
      forcedMoveReason: 'river-current:advance-turn',
    });
    context?.turnManager.markUnitMoved(unit.id);

    if (nextLane === 0) {
      applyFloodAttackBoundaryDamage(unit, context, svc, 'edge');
    }
  }
}

function applyFloodAttackBoundaryDamage(
  unit: TroopUnit,
  context: BattleTurnAdvanceContext | undefined,
  svc: ReturnType<typeof services>,
  reason: 'blocked' | 'edge',
): void {
  const remainingHp = Math.max(1, Math.floor(unit.currentHp / 2));
  const damage = Math.max(0, unit.currentHp - remainingHp);
  if (damage <= 0) {
    return;
  }

  if (context) {
    context.applyUnitDamage(unit, damage, null, {
      attackerId: null,
      attackerLane: null,
      attackerDepth: null,
      damageSource: `river-current:${reason}`,
      allowDamageLink: true,
    });
    return;
  }

  unit.currentHp = remainingHp;
  svc.event.emit(EVENT_NAMES.UnitDamaged, {
    unitId: unit.id,
    damage,
    hp: unit.currentHp,
    attackerId: null,
    attackerLane: null,
    attackerDepth: null,
    defenderLane: unit.lane,
    defenderDepth: unit.depth,
    attackerFaction: null,
    damageSource: `river-current:${reason}`,
  });
}

function _resolveFloodCurrentDeath(
  unit: TroopUnit,
  state: BattleState,
  context: BattleTurnAdvanceContext | undefined,
  svc: ReturnType<typeof services>,
): void {
  const playerGeneralId = state.playerGeneral?.id ?? null;
  const enemyGeneralId = state.enemyGeneral?.id ?? null;

  if (unit.id === playerGeneralId) {
    context?.onGeneralUnitKilled(Faction.Player, svc);
  } else if (unit.id === enemyGeneralId) {
    context?.onGeneralUnitKilled(Faction.Enemy, svc);
  }

  if (context) {
    context.onUnitKilled(unit, null, svc);
    return;
  }

  if (!state.units.has(unit.id)) {
    return;
  }

  const { lane, depth, faction, type } = unit;
  state.removeUnit(unit.id);
  svc.buff.clearUnit(unit.id);
  svc.event.emit(EVENT_NAMES.UnitDied, { unitId: unit.id, lane, depth, faction, type });
}

function applyFireAttackTerrain(state: BattleState): void {
  for (let lane = 1; lane <= 3; lane++) {
    for (let depth = 3; depth <= 4; depth++) {
      state.setTileEffect({
        id: `fire-${lane}-${depth}`,
        lane,
        depth,
        state: 'hazard-fire',
        damagePerTurn: FIRE_DAMAGE_PER_TURN,
        notes: 'scene-gambit:fire-attack',
      });
    }
  }
}

function applyRockSlideTerrain(state: BattleState, context: BattleStartContext): void {
  // 天命加護（FBR-10）：落石成功率 = 基礎 85% + 施放者天命加成，上限 100%；亂數走戰場亂數源
  const fateLevel = fateBlessingLevel(context.casterGenes);
  if (!rollEventSuccess(fateSuccessChance(ROCK_SLIDE_BASE_SUCCESS, fateLevel), context.random())) return;
  const counts = allocateSceneTiles(SCENE_TILE_PRESETS, 'SCENE_CANYON_ROCK', ROCK_SLIDE_ZONE_CELLS);
  for (const [lane, depth] of ROCK_SLIDE_ROCK_ORDER.slice(0, counts.hazard)) {
    state.setTileEffect({
      id: `rock-${lane}-${depth}`,
      lane,
      depth,
      state: 'hazard-rock',
      blocksMovement: true,
      forcedMoveDirection: 'backward',
      forcedMoveSteps: 1,
      notes: ROCK_SLIDE_TILE_NOTE,
    });
  }
  for (const [lane, depth] of ROCK_SLIDE_DEBRIS_ORDER.slice(0, counts.forceMove)) {
    state.setTileEffect({
      id: `rock-debris-${lane}-${depth}`,
      lane,
      depth,
      state: 'hazard-rock',
      blocksMovement: false,
      forcedMoveDirection: 'backward',
      forcedMoveSteps: 1,
      notes: ROCK_DEBRIS_TILE_NOTE,
    });
  }
}

/**
 * 營帳（夜襲／埋伏場景，PM 暫定）：不能被攻擊的地形格，固定在敵方後排中央，每場 1 個。
 * 我方單位在回合結束時站在營帳格上即勝利（見 resolveCampCapture）。場景資料可以用 state.sceneCampPosition 覆寫座標。
 * 必須最後呼叫：同一格的其他場景裝飾會被覆寫。
 */
export const SCENE_CAMP_DEFAULT_POSITION = { lane: 3, depth: GAME_CONFIG.GRID_DEPTH - 1 } as const;

function applySceneCamp(state: BattleState): void {
  const position = state.sceneCampPosition ?? SCENE_CAMP_DEFAULT_POSITION;
  state.setTileEffect({
    id: `scene-camp-${position.lane}-${position.depth}`,
    lane: position.lane,
    depth: position.depth,
    state: 'scene-camp',
    blocksMovement: false,
    notes: 'scene-gambit:camp',
  });
}

export const AMBUSH_TRAP_TILE_NOTE = 'scene-gambit:ambush-trap';
/** 埋伏陷阱每回合傷害（PROG-2-1590，暫定） */
export const AMBUSH_TRAP_DAMAGE_PER_TURN = 10;

/**
 * 森林埋伏 Tile 比例（SCENE_FOREST_AMBUSH，PROG-2-1590）：林地格依比例分成陷阱／掩體／一般。
 * 陷阱優先放在最靠敵方的林地（depth 小），其次掩體，剩下維持一般地形。
 */
function applyAmbushAttackDecorations(state: BattleState): void {
  const forest = state.cells
    .filter((cell) => cell.terrain === TerrainType.Forest)
    .sort((a, b) => a.depth - b.depth || a.lane - b.lane);
  const counts = allocateSceneTiles(SCENE_TILE_PRESETS, 'SCENE_FOREST_AMBUSH', forest.length);
  forest.forEach((cell, index) => {
    if (index < counts.hazard) {
      state.setTileEffect({
        id: `ambush-trap-${cell.lane}-${cell.depth}`,
        lane: cell.lane,
        depth: cell.depth,
        state: 'hazard-rock',
        blocksMovement: false,
        damagePerTurn: AMBUSH_TRAP_DAMAGE_PER_TURN,
        notes: AMBUSH_TRAP_TILE_NOTE,
      });
      return;
    }
    if (index < counts.hazard + counts.stealth) {
      state.setTileEffect({
        id: `ambush-${cell.lane}-${cell.depth}`,
        lane: cell.lane,
        depth: cell.depth,
        state: 'ambush-field',
        notes: 'scene-gambit:ambush-attack',
      });
    }
  });
}

function applyNightRaidDecorations(state: BattleState): void {
  for (let lane = 1; lane <= 3; lane++) {
    for (let depth = 5; depth <= 7; depth++) {
      state.setTileEffect({
        id: `night-raid-${lane}-${depth}`,
        lane,
        depth,
        state: 'night-raid',
        notes: 'scene-gambit:night-raid-camp',
      });
    }
  }
}

function tickAmbushAttackFlags(state: BattleState): void {
  if (state.sceneFlags.stealthOpenTurns > 0) {
    state.sceneFlags.stealthOpenTurns = Math.max(0, state.sceneFlags.stealthOpenTurns - 1);
  }
}

/** 夜襲旗標整場生效（全局命中／暴擊）；兩回合的窗口只管敵方遠程視野 */
function tickNightRaidFlags(state: BattleState): void {
  if (state.sceneFlags.nightRaidOpenTurns > 0) {
    state.sceneFlags.nightRaidOpenTurns = Math.max(0, state.sceneFlags.nightRaidOpenTurns - 1);
  }
}

function resolveDefaultDamageAdjustment(context: BattleDamageContext): BattleDamageAdjustment {
  return {
    damage: context.baseDamage,
  };
}

const DEFAULT_BATTLE_TACTIC_BEHAVIOR: BattleTacticBehavior = {
  applyStartOfBattle: () => undefined,
  advanceTurn: () => undefined,
  isFactionHiddenFrom: () => false,
  getEffectiveMoveRange: (unit: TroopUnit) => unit.getEffectiveMoveRange(),
  getEffectiveAttackRange: (unit: TroopUnit) => unit.attackRange,
  resolveDamageAdjustment: resolveDefaultDamageAdjustment,
};

export const BATTLE_TACTIC_BEHAVIOR_REGISTRY: Readonly<Record<BattleSceneMode, BattleTacticBehavior>> = {
  normal: DEFAULT_BATTLE_TACTIC_BEHAVIOR,
  flood: {
    ...DEFAULT_BATTLE_TACTIC_BEHAVIOR,
    applyStartOfBattle: applyFloodAttackTerrain,
    advanceTurn: advanceFloodAttackTurn,
    getEffectiveMoveRange: (unit: TroopUnit) => Math.max(0, Math.min(1, unit.getEffectiveMoveRange())),
  },
  fire: {
    ...DEFAULT_BATTLE_TACTIC_BEHAVIOR,
    applyStartOfBattle: applyFireAttackTerrain,
    // 場景戰法只由玩家接軍事任務發動（B-1），「我方」即玩家陣營
    getFireDamageTakenMultiplier: (unit: TroopUnit) => (
      unit.faction === Faction.Player ? FIRE_RAID_PLAYER_FIRE_DAMAGE_TAKEN : 1
    ),
  },
  rock: {
    ...DEFAULT_BATTLE_TACTIC_BEHAVIOR,
    applyStartOfBattle: applyRockSlideTerrain,
  },
  ambush: {
    ...DEFAULT_BATTLE_TACTIC_BEHAVIOR,
    applyStartOfBattle: (state: BattleState) => {
      state.sceneFlags.stealthOpenTurns = 2;
      applyAmbushAttackDecorations(state);
      applySceneCamp(state);
    },
    advanceTurn: tickAmbushAttackFlags,
    isFactionHiddenFrom: (attackerFaction: Faction, targetFaction: Faction, state: BattleState) => (
      attackerFaction === Faction.Enemy
      && targetFaction === Faction.Player
      && state.sceneFlags.stealthOpenTurns > 0
    ),
  },
  // 攻城戰最小版（PROG-2-1589，暫定）：敵方守城（城牆區 depth ≥ 6）防禦 ×1.5、我方工兵衝車攻城 ×2、投石機 AOE（PROG-2-1596）。
  // 城牆不阻擋移動：敵方由城牆區出兵，阻擋格會讓守軍也無法出城而卡死
  siege: {
    ...DEFAULT_BATTLE_TACTIC_BEHAVIOR,
    applyStartOfBattle: applySiegeMoat,
    getDefenseMultiplier: (unit: TroopUnit) => (
      isSiegeWallDefender(unit) ? SIEGE_WALL_DEFENSE_MULTIPLIER : 1
    ),
    getSiegeDamageMultiplier: (unit: TroopUnit) => (unit.faction === Faction.Player ? SIEGE_RAM_MULTIPLIER : 1),
    getCatapultDamage: (unit: TroopUnit) => (unit.faction === Faction.Player ? SIEGE_CATAPULT_DAMAGE : 0),
  },
  night: {
    ...DEFAULT_BATTLE_TACTIC_BEHAVIOR,
    applyStartOfBattle: (state: BattleState) => {
      state.sceneFlags.nightRaid = true;
      state.sceneFlags.nightRaidOpenTurns = 2;
      applyNightRaidDecorations(state);
      applySceneCamp(state);
    },
    advanceTurn: tickNightRaidFlags,
    getEffectiveAttackRange: (unit: TroopUnit, state: BattleState) => {
      if (
        unit.faction === Faction.Enemy
        && state.sceneFlags.nightRaid
        && state.sceneFlags.nightRaidOpenTurns > 0
      ) {
        return Math.max(0, unit.attackRange - 1);
      }

      return unit.attackRange;
    },
    getAccuracyDelta: (_attacker: TroopUnit, state: BattleState) => (state.sceneFlags.nightRaid ? NIGHT_RAID_HIT_DELTA : 0),
    getCritBonus: (_attacker: TroopUnit, state: BattleState) => (state.sceneFlags.nightRaid ? NIGHT_RAID_CRIT_BONUS : 0),
  },
};

export function resolveBattleTacticBehavior(battleTactic: BattleTactic): BattleTacticBehavior {
  return BATTLE_TACTIC_BEHAVIOR_REGISTRY[resolveBattleSceneMode(battleTactic)];
}

/** 目前場景下單位承受火焰傷害的倍率（PROG-2-1459）；場景沒有規則時為 1 */
export function sceneFireDamageTakenOf(unit: TroopUnit, state: BattleState): number {
  return resolveBattleTacticBehavior(state.battleTactic).getFireDamageTakenMultiplier?.(unit, state) ?? 1;
}
/** 目前場景下單位防禦倍率（攻城戰城牆地利，PROG-2-1589）；場景沒有規則時為 1 */
export function sceneDefenseMultiplierOf(unit: TroopUnit, state: BattleState): number {
  return resolveBattleTacticBehavior(state.battleTactic).getDefenseMultiplier?.(unit, state) ?? 1;
}

/** 目前場景下工兵攻城傷害倍率（攻城戰衝車，PROG-2-1589）；場景沒有規則時為 1 */
export function sceneSiegeDamageMultiplierOf(unit: TroopUnit, state: BattleState): number {
  return resolveBattleTacticBehavior(state.battleTactic).getSiegeDamageMultiplier?.(unit, state) ?? 1;
}

/** 攻城戰城牆區的守軍（敵方、在最後兩列） */
export function isSiegeWallDefender(unit: TroopUnit): boolean {
  return unit.faction === Faction.Enemy && unit.depth >= SIEGE_WALL_MIN_DEPTH;
}

/**
 * 投石機（攻城戰，PROG-2-1596 暫定）：工兵每回合對所有城牆區敵軍造成固定傷害，最少留 1 血（不致死，陣亡結算交給一般戰鬥）。
 * 回傳受擊部隊 id。
 */
export function applySceneCatapult(engineer: TroopUnit, state: BattleState): string[] {
  const damage = resolveBattleTacticBehavior(state.battleTactic).getCatapultDamage?.(engineer, state) ?? 0;
  if (damage <= 0) return [];
  const hit: string[] = [];
  for (const unit of state.units.values()) {
    if (unit.isDead() || !isSiegeWallDefender(unit)) continue;
    unit.currentHp = Math.max(1, unit.currentHp - damage);
    hit.push(unit.id);
  }
  return hit;
}

/**
 * 雲梯（攻城戰，PROG-2-1597 暫定）：我方步兵攀城，普攻城牆區守軍時抵銷城牆地利。
 * 回傳乘在守方防禦上的倍率；不適用時為 1。
 */
export function sceneLadderDefenseBypassOf(attacker: TroopUnit, defender: TroopUnit, state: BattleState): number {
  if (attacker.faction !== Faction.Player || attacker.type !== TroopType.Infantry) return 1;
  if (!isSiegeWallDefender(defender)) return 1;
  const wall = sceneDefenseMultiplierOf(defender, state);
  return wall > 0 ? 1 / wall : 1;
}
