import { BattleTactic, EVENT_NAMES, Faction, StatusEffect, TerrainType, TroopType } from '../../../core/config/Constants';
import { services } from '../../../core/managers/ServiceLoader';
import type { TroopUnit } from '../../../core/models/TroopUnit';
import type { BattleState } from '../../models/BattleState';
import { BattleTurnManager } from '../BattleTurnManager';
import { resolveBattleTacticBehavior } from '../../shared/BattleTacticBehavior';
import { applyAptitudeMove } from '../../../core/systems/BattleAptitude';
import { forestMoveBonusFor } from '../../../core/systems/FactorTacticLinkage';
import { forcedMoveBlockedDamageRatio, resolveForcedMove } from '../../shared/ForcedMoveTile';
import { resolveGhostPath, type GhostPathCell } from '../../shared/GhostMovePath';
import { hasGhostMove } from '../../shared/TallyPassive';

const FORWARD_DIR: Record<Faction, number> = {
  [Faction.Player]: 1,
  [Faction.Enemy]: -1,
};

export interface BattleAutoMovePhaseContext {
  readonly state: BattleState;
  readonly actingFaction: Faction;
  readonly turnManager: BattleTurnManager;
  consumeTileBuff(unit: TroopUnit): void;
  getFactionUnits(faction: Faction): TroopUnit[];
  isCellMovementBlocked(lane: number, depth: number): boolean;
  isGeneralUnit(unitId: string): boolean;
  /** 主將適性給的移動修正（PROG-2-0080）；不提供時視為 0 */
  getAptitudeMoveDelta?(unit: TroopUnit): number;
  getAptitudeMoveSetTo?(unit: TroopUnit): number | null;
  /** 位移受阻的傷害（GRD-03，PROG-2-0577）；不提供時受阻只停下、不扣血 */
  applyForcedMoveDamage?(unit: TroopUnit, damage: number): void;
  /** 七進七出穿透敵格的傷害（PROG-2-0776）；不提供時穿透不扣血 */
  applyGhostPassDamage?(target: TroopUnit, damage: number): void;
}

export function executeBattleAutoMovePhase(context: BattleAutoMovePhaseContext): void {
  const svc = services();
  const units = context.getFactionUnits(context.actingFaction);
  units.sort((a, b) => {
    const depthDelta = context.actingFaction === Faction.Player
      ? b.depth - a.depth
      : a.depth - b.depth;
    if (depthDelta !== 0) {
      return depthDelta;
    }
    return a.lane - b.lane;
  });

  for (const unit of units) {
    stepMoveUnit(unit, svc, context);
  }
}

function stepMoveUnit(unit: TroopUnit, svc: ReturnType<typeof services>, context: BattleAutoMovePhaseContext): void {
  if (svc.buff.hasBuff(unit.id, StatusEffect.Stun)) {
    unit.isShieldWallActive = false;
    return;
  }
  if (svc.buff.hasBuff(unit.id, StatusEffect.Rooted)) {
    return;
  }

  const dir = FORWARD_DIR[unit.faction];
  const slowPenalty = svc.buff.hasBuff(unit.id, StatusEffect.Slow) ? 1 : 0;
  const tacticMoveRange = resolveBattleTacticBehavior(context.state.battleTactic).getEffectiveMoveRange(unit, context.state);
  const isFloodBattle = context.state.battleTactic === BattleTactic.FloodAttack;
  const baseMoveRange = isFloodBattle
    ? 1
    : applyAptitudeMove(tacticMoveRange, context.getAptitudeMoveDelta?.(unit) ?? 0, context.getAptitudeMoveSetTo?.(unit) ?? null);
  let remainingMoveBudget = Math.max(0, baseMoveRange - slowPenalty);
  if (!isFloodBattle) {
    remainingMoveBudget += resolveTileMoveRangeDelta(context.state, unit.lane, unit.depth);
    // 林地適性（PROG-2-0584）：站在林地且有 forest-move-bonus 的部隊移動力 +1
    const cell = context.state.getCell(unit.lane, unit.depth);
    remainingMoveBudget += forestMoveBonusFor(cell?.terrain ?? TerrainType.Plain, unit.factorEffects);
  }

  if (hasGhostMove(unit)) {
    stepGhostMoveUnit(unit, remainingMoveBudget, svc, context);
    return;
  }

  while (remainingMoveBudget > 0) {
    const nextDepth = unit.depth + dir;
    const nextCell = context.state.getCell(unit.lane, nextDepth);
    if (!nextCell) break;
    if (context.isCellMovementBlocked(unit.lane, nextDepth)) break;

    if (nextCell.occupantId) {
      const blocker = context.state.units.get(nextCell.occupantId)!;

      if (
        blocker.faction === unit.faction
        && context.isGeneralUnit(unit.id)
        && !context.isGeneralUnit(blocker.id)
        && context.turnManager.canUseGeneralSwap(unit.faction)
      ) {
        const previousLane = unit.lane;
        const previousDepth = unit.depth;

        context.state.getCell(previousLane, previousDepth)!.occupantId = blocker.id;
        nextCell.occupantId = unit.id;

        blocker.moveTo(previousLane, previousDepth);
        unit.moveTo(unit.lane, nextDepth);
        context.turnManager.markGeneralSwapUsed(unit.faction);

        svc.event.emit(EVENT_NAMES.UnitMoved, {
          unitId: blocker.id,
          lane: blocker.lane,
          depth: blocker.depth,
          fromLane: unit.lane,
          fromDepth: nextDepth,
          isSwapPassenger: true,
          swapPartnerId: unit.id,
        });
        context.turnManager.markUnitMoved(blocker.id);
        svc.event.emit(EVENT_NAMES.UnitMoved, {
          unitId: unit.id,
          lane: unit.lane,
          depth: unit.depth,
          fromLane: previousLane,
          fromDepth: previousDepth,
          swapWithUnitId: blocker.id,
          swapDuration: 2.0,
          swapPassengerFromLane: blocker.lane,
          swapPassengerFromDepth: nextDepth,
          swapPassengerToLane: previousLane,
          swapPassengerToDepth: previousDepth,
        });
        context.turnManager.markUnitMoved(unit.id);

        context.consumeTileBuff(unit);
        remainingMoveBudget -= 1;
        remainingMoveBudget += applyTileEffectOnEnter(unit, dir, svc, context);
        continue;
      }

      if (blocker.faction !== unit.faction && unit.type === TroopType.Shield) {
        unit.isShieldWallActive = true;
      }
      break;
    }

    const prevLane = unit.lane;
    const prevDepth = unit.depth;
    context.state.getCell(unit.lane, unit.depth)!.occupantId = null;
    unit.moveTo(unit.lane, nextDepth);
    nextCell.occupantId = unit.id;
    svc.event.emit(EVENT_NAMES.UnitMoved, {
      unitId: unit.id,
      lane: unit.lane,
      depth: nextDepth,
      fromLane: prevLane,
      fromDepth: prevDepth,
    });
    context.turnManager.markUnitMoved(unit.id);
    context.consumeTileBuff(unit);
    remainingMoveBudget -= 1;
    remainingMoveBudget += applyTileEffectOnEnter(unit, dir, svc, context);
  }
}

/**
 * 七進七出（Ghost_Move）：沿前進方向找最遠的有效終點，穿過敵軍不停下，每個穿過的敵軍各扣一次傷害。
 * 終點必須空；路徑上有岩石或友軍、或終點被佔時縮短，都無效時原地不動（PM 暫定裁定）。
 */
function stepGhostMoveUnit(
  unit: TroopUnit,
  moveBudget: number,
  svc: ReturnType<typeof services>,
  context: BattleAutoMovePhaseContext,
): void {
  const dir = FORWARD_DIR[unit.faction];
  const path: GhostPathCell[] = [];
  for (let step = 1; step <= moveBudget; step++) {
    const depth = unit.depth + dir * step;
    const cell = context.state.getCell(unit.lane, depth);
    if (!cell) break;
    const occupant = cell.occupantId ? context.state.units.get(cell.occupantId) : undefined;
    path.push({
      lane: unit.lane,
      depth,
      occupantFaction: occupant?.faction ?? null,
      blocksMovement: context.isCellMovementBlocked(unit.lane, depth),
    });
  }

  for (let length = path.length; length > 0; length--) {
    const result = resolveGhostPath(path.slice(0, length), unit.faction);
    if (result.blocked) continue;

    const destination = path[length - 1];
    const prevLane = unit.lane;
    const prevDepth = unit.depth;
    context.state.getCell(prevLane, prevDepth)!.occupantId = null;
    unit.moveTo(unit.lane, destination.depth);
    context.state.getCell(unit.lane, unit.depth)!.occupantId = unit.id;
    svc.event.emit(EVENT_NAMES.UnitMoved, {
      unitId: unit.id,
      lane: unit.lane,
      depth: unit.depth,
      fromLane: prevLane,
      fromDepth: prevDepth,
      ghostMove: true,
    });
    context.turnManager.markUnitMoved(unit.id);
    context.consumeTileBuff(unit);

    if (context.applyGhostPassDamage) {
      const passDamage = Math.round(unit.getEffectiveAttack());
      for (const passed of result.passedEnemyCells) {
        const target = context.state.units.get(context.state.getCell(passed.lane, passed.depth)!.occupantId!);
        if (target && passDamage > 0) context.applyGhostPassDamage(target, passDamage);
      }
    }
    applyTileEffectOnEnter(unit, dir, svc, context);
    return;
  }
}

function applyTileEffectOnEnter(
  unit: TroopUnit,
  moveDir: number,
  svc: ReturnType<typeof services>,
  context: BattleAutoMovePhaseContext,
): number {
  const effect = context.state.getTileEffect(unit.lane, unit.depth);
  if (!effect?.forcedMoveSteps) {
    return resolveTileMoveRangeDelta(context.state, unit.lane, unit.depth);
  }

  const pushDir = effect.forcedMoveDirection === 'backward' ? -moveDir : moveDir;
  forceMoveUnit(unit, pushDir, effect.forcedMoveSteps, svc, context, `${effect.state}:enter`);
  return resolveTileMoveRangeDelta(context.state, unit.lane, unit.depth);
}

function forceMoveUnit(
  unit: TroopUnit,
  dir: number,
  steps: number,
  svc: ReturnType<typeof services>,
  context: BattleAutoMovePhaseContext,
  reason: string,
): void {
  if (dir !== 1 && dir !== -1) return;
  // 先算出要推幾格、是否受阻（GRD-03 純邏輯）；受阻傷害依剩餘步數計
  const plan = resolveForcedMove(unit.depth, dir, steps, (depth) => {
    const cell = context.state.getCell(unit.lane, depth);
    return !cell || !!cell.occupantId || context.isCellMovementBlocked(unit.lane, depth);
  });

  for (let index = 0; index < plan.movedSteps; index++) {
    const nextDepth = unit.depth + dir;
    const nextCell = context.state.getCell(unit.lane, nextDepth)!;
    const prevLane = unit.lane;
    const prevDepth = unit.depth;
    context.state.getCell(unit.lane, unit.depth)!.occupantId = null;
    unit.moveTo(unit.lane, nextDepth);
    nextCell.occupantId = unit.id;
    svc.event.emit(EVENT_NAMES.UnitMoved, {
      unitId: unit.id,
      lane: unit.lane,
      depth: unit.depth,
      fromLane: prevLane,
      fromDepth: prevDepth,
      forcedMove: true,
      forcedMoveReason: reason,
    });
    context.turnManager.markUnitMoved(unit.id);
  }

  if (plan.blocked && context.applyForcedMoveDamage) {
    const ratio = forcedMoveBlockedDamageRatio(plan.remainingSteps);
    const damage = Math.round(unit.maxHp * ratio);
    if (damage > 0) context.applyForcedMoveDamage(unit, damage);
  }
}

function resolveTileMoveRangeDelta(state: BattleState, lane: number, depth: number): number {
  return state.getTileEffect(lane, depth)?.moveRangeDelta ?? 0;
}