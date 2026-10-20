import { Faction } from '../../../core/config/Constants';
import { services } from '../../../core/managers/ServiceLoader';
import type { TroopUnit } from '../../../core/models/TroopUnit';
import type { BattleState } from '../../models/BattleState';
import { advanceFormationZonesOf } from '../../shared/FormationZone';
import { advanceUnitDot, dotTickAmount } from '../../shared/UnitDot';

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
}

export function executeBattleTileEffectPhase(context: BattleTileEffectPhaseContext): void {
  const svc = services();
  advanceFormationZonesOf(context.state.formationZones, context.actingFaction, (casterUnitId) => {
    const caster = context.state.units.get(casterUnitId);
    return !!caster && !caster.isDead();
  });
  const killed: TroopUnit[] = [];
  const killedIds = new Set<string>();

  for (const [, unit] of context.state.units) {
    if (unit.faction !== context.actingFaction) {
      continue;
    }
    const effect = context.state.getTileEffect(unit.lane, unit.depth);
    if (!effect?.damagePerTurn || unit.isDead()) {
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

  for (const dead of killed) {
    if (dead.id === context.playerGeneralUnitId) {
      context.onGeneralUnitKilled(Faction.Player, svc);
    } else if (dead.id === context.enemyGeneralUnitId) {
      context.onGeneralUnitKilled(Faction.Enemy, svc);
    }
    context.onUnitKilled(dead, null, svc);
  }
}