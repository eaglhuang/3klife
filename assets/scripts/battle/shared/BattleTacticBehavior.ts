import { BattleTactic, EVENT_NAMES, Faction, GAME_CONFIG, TerrainType } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';
import type { TroopUnit } from '../../core/models/TroopUnit';
import type { BattleState } from '../models/BattleState';
import { BattleTurnManager } from '../runtime/BattleTurnManager';
import { resolveBattleSceneMode, type BattleSceneMode } from './BattleSceneMode';
import { floodDepthBonus } from '../../core/systems/WeatherTacticRestriction';
import { fateBlessingLevel, fateSuccessChance, rollEventSuccess, ROCK_SLIDE_BASE_SUCCESS } from '../../core/systems/FateBlessing';

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

export interface BattleTacticBehavior {
  applyStartOfBattle(state: BattleState): void;
  advanceTurn(state: BattleState, context?: BattleTurnAdvanceContext): void;
  isFactionHiddenFrom(attackerFaction: Faction, targetFaction: Faction, state: BattleState): boolean;
  getEffectiveMoveRange(unit: TroopUnit, state: BattleState): number;
  getEffectiveAttackRange(unit: TroopUnit, state: BattleState): number;
  resolveDamageAdjustment(context: BattleDamageContext): BattleDamageAdjustment;
}

const FLOOD_DEPTH_START = 2;
const FLOOD_DEPTH_END = 4;
export const FLOOD_ATTACK_PUSH_LANE_DELTA = -1;
export const FLOOD_ATTACK_PUSH_DEPTH_DELTA = 0;
const FIRE_DAMAGE_PER_TURN = 15;
const NIGHT_RAID_ATTACK_BONUS = 0.25;

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

  for (const { lane, depth } of targets) {
    const cell = state.getCell(lane, depth);
    if (!cell) continue;
    const key = `${lane},${depth}`;
    if (!state.floodOriginalTerrain.has(key)) state.floodOriginalTerrain.set(key, cell.terrain);
    cell.terrain = TerrainType.River;
    state.setTileEffect({
      id: `flood-${lane}-${depth}`,
      lane,
      depth,
      state: 'river-current',
      notes: 'scene-gambit:flood-attack',
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
    if (effect?.state !== 'river-current') {
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
    context.turnManager.markUnitMoved(unit.id);

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

function applyRockSlideTerrain(state: BattleState): void {
  // 天命加護（FBR-10）：落石成功率 = 基礎 85% + 施放方天命加成，上限 100%
  const fateLevel = fateBlessingLevel(state.getGeneral(Faction.Player)?.genes ?? []);
  if (!rollEventSuccess(fateSuccessChance(ROCK_SLIDE_BASE_SUCCESS, fateLevel), Math.random())) return;
  for (let lane = 1; lane <= 3; lane++) {
    state.setTileEffect({
      id: `rock-${lane}-4`,
      lane,
      depth: 4,
      state: 'hazard-rock',
      blocksMovement: true,
      forcedMoveDirection: 'backward',
      forcedMoveSteps: 1,
      notes: 'scene-gambit:rock-slide',
    });
  }
}

function applyAmbushAttackDecorations(state: BattleState): void {
  for (const cell of state.cells) {
    if (cell.terrain !== TerrainType.Forest) {
      continue;
    }

    state.setTileEffect({
      id: `ambush-${cell.lane}-${cell.depth}`,
      lane: cell.lane,
      depth: cell.depth,
      state: 'ambush-field',
      notes: 'scene-gambit:ambush-attack',
    });
  }
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

function tickNightRaidFlags(state: BattleState): void {
  if (state.sceneFlags.nightRaidOpenTurns > 0) {
    state.sceneFlags.nightRaidOpenTurns = Math.max(0, state.sceneFlags.nightRaidOpenTurns - 1);
    if (state.sceneFlags.nightRaidOpenTurns === 0) {
      state.sceneFlags.nightRaid = false;
    }
  }
}

function resolveDefaultDamageAdjustment(context: BattleDamageContext): BattleDamageAdjustment {
  return {
    damage: context.baseDamage,
  };
}

function resolveNightRaidDamageAdjustment(context: BattleDamageContext): BattleDamageAdjustment {
  const isOpeningStrike =
    context.attacker.faction === Faction.Player
    && context.state.sceneFlags.nightRaid
    && context.state.sceneFlags.nightRaidOpenTurns > 0;

  if (!isOpeningStrike) {
    return {
      damage: context.baseDamage,
    };
  }

  return {
    damage: Math.max(1, Math.floor(context.baseDamage * (1 + NIGHT_RAID_ATTACK_BONUS))),
    damageSource: context.kind === 'unit' ? 'night-raid-opening-strike' : undefined,
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
    },
    advanceTurn: tickAmbushAttackFlags,
    isFactionHiddenFrom: (attackerFaction: Faction, targetFaction: Faction, state: BattleState) => (
      attackerFaction === Faction.Enemy
      && targetFaction === Faction.Player
      && state.sceneFlags.stealthOpenTurns > 0
    ),
  },
  night: {
    ...DEFAULT_BATTLE_TACTIC_BEHAVIOR,
    applyStartOfBattle: (state: BattleState) => {
      state.sceneFlags.nightRaid = true;
      state.sceneFlags.nightRaidOpenTurns = 2;
      applyNightRaidDecorations(state);
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
    resolveDamageAdjustment: resolveNightRaidDamageAdjustment,
  },
};

export function resolveBattleTacticBehavior(battleTactic: BattleTactic): BattleTacticBehavior {
  return BATTLE_TACTIC_BEHAVIOR_REGISTRY[resolveBattleSceneMode(battleTactic)];
}