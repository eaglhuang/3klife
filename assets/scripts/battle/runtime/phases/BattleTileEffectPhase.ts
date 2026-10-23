import { Faction } from '../../../core/config/Constants';
import { services } from '../../../core/managers/ServiceLoader';
import type { TroopUnit } from '../../../core/models/TroopUnit';
import type { BattleState } from '../../models/BattleState';
import { advanceFormationZonesOf } from '../../shared/FormationZone';
import { advanceMoraleOf } from '../../shared/Morale';
import { advanceUnitDot, dotTickAmount } from '../../shared/UnitDot';
import { tileStateRuleOf } from '../../shared/TileStateRules';

export interface BattleTileEffectPhaseContext {
  readonly state: BattleState;
  readonly actingFaction: Faction;
  readonly playerGeneralUnitId: string | null;
  readonly enemyGeneralUnitId: string | null;
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
  /** 沙漠每回合精力消耗（APT-05，PROG-2-0785）：單位本回合要扣主將的精力；不提供時為 0 */
  getTerrainVitalityDrain?(unit: TroopUnit): number;
}

export function executeBattleTileEffectPhase(context: BattleTileEffectPhaseContext): void {
  const svc = services();
  advanceFormationZonesOf(context.state.formationZones, context.actingFaction, (casterUnitId) => {
    const caster = context.state.units.get(casterUnitId);
    return !!caster && !caster.isDead();
  });
  advanceMoraleOf(context.state.units.values(), context.actingFaction);
  const killed: TroopUnit[] = [];
  const killedIds = new Set<string>();

  for (const [, unit] of context.state.units) {
    if (unit.faction !== context.actingFaction) {
      continue;
    }
    const effect = context.state.getTileEffect(unit.lane, unit.depth);
    if (!effect?.damagePerTurn || !tileStateRuleOf(effect).damagesOnTurnEnd || unit.isDead()) {
      continue;
    }

    context.applyUnitDamage(unit, effect.damagePerTurn, null, {
      attackerId: null,
      attackerLane: null,
      attackerDepth: null,
      damageSource: effect.state,
      allowDamageLink: true,
    });

    if (unit.isDead() && !killedIds.has(unit.id)) {
      killedIds.add(unit.id);
      killed.push(unit);
    }
  }

  // 毒箭（PROG-2-0766）：所屬陣營的中毒單位在本階段結算
  for (const [unitId, dot] of [...context.state.unitDots]) {
    const unit = context.state.units.get(unitId);
    // 單位被擊殺後會從 units 移除：記錄找不到單位就丟掉，否則會殘留到戰鬥結束（單位 id 重用時還會誤中毒）
    if (!unit) {
      context.state.unitDots.delete(unitId);
      continue;
    }
    if (unit.faction !== context.actingFaction) continue;
    if (unit.isDead()) {
      context.state.unitDots.delete(unitId);
      continue;
    }
    context.applyUnitDamage(unit, dotTickAmount(unit.maxHp, dot.ratio), null, {
      attackerId: null,
      attackerLane: null,
      attackerDepth: null,
      damageSource: 'poison',
      allowDamageLink: false,
    });
    if (!advanceUnitDot(dot)) {
      context.state.unitDots.delete(unitId);
    }
    if (unit.isDead() && !killedIds.has(unit.id)) {
      killedIds.add(unit.id);
      killed.push(unit);
    }
  }

  // 沙漠精力消耗（APT-05，PROG-2-0785）：同陣營本回合站在沙漠的部隊取最大值，主將精力扣一次（暫定）
  let desertDrain = 0;
  for (const [, unit] of context.state.units) {
    if (unit.faction !== context.actingFaction || unit.isDead()) continue;
    desertDrain = Math.max(desertDrain, context.getTerrainVitalityDrain?.(unit) ?? 0);
  }
  const actingGeneral = context.state.getGeneral(context.actingFaction);
  if (actingGeneral && desertDrain > 0) {
    actingGeneral.vitality = Math.max(0, actingGeneral.vitality - desertDrain);
  }

  for (const dead of killed) {
    if (dead.id === context.playerGeneralUnitId) {
      context.onGeneralUnitKilled(Faction.Player, svc);
    } else if (dead.id === context.enemyGeneralUnitId) {
      context.onGeneralUnitKilled(Faction.Enemy, svc);
    }
    context.onUnitKilled(dead, null, svc);
  }
}