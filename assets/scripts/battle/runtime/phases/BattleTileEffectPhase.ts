// @spec-source → 戰場格子系統.md (doc_spec_0044)、戰場適性系統.md (doc_spec_0041)；PROG-2-1429 依建檔紀錄補標出處
import { BattleTactic, Faction } from '../../../core/config/Constants';
import { services } from '../../../core/managers/ServiceLoader';
import type { TroopUnit } from '../../../core/models/TroopUnit';
import type { BattleState } from '../../models/BattleState';
import { advanceFormationZonesOf } from '../../shared/FormationZone';
import { advanceMoraleOf } from '../../shared/Morale';
import { advanceUnitDot, dotTickAmount } from '../../shared/UnitDot';
import { tileStateRuleOf } from '../../shared/TileStateRules';
import { sceneFireDamageTakenOf } from '../../shared/BattleTacticBehavior';
import { applyTallyDefection } from '../../shared/TallyPassive';
import { addStageSalvage, FIRE_RAID_TILE_NOTE, rollFirePlunderGain } from '../../shared/StageSalvage';

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
  /** 掠奪擲骰亂數源（PROG-2-1462）；不提供時用 session 亂數 */
  random?(): number;
}

export function executeBattleTileEffectPhase(context: BattleTileEffectPhaseContext): void {
  const svc = services();
  advanceFormationZonesOf(context.state.formationZones, context.actingFaction, (casterUnitId) => {
    const caster = context.state.units.get(casterUnitId);
    return !!caster && !caster.isDead();
  });
  advanceMoraleOf(context.state.units.values(), context.actingFaction);
  // 鷹視狼顧（狼顧符，PROG-2-1572）：己方回合開始策反一支殘血敵軍，主將部隊不會被策反
  applyTallyDefection(
    context.state.units.values(),
    context.actingFaction,
    (unit) => unit.id === context.playerGeneralUnitId || unit.id === context.enemyGeneralUnitId,
    context.random ?? (() => svc.session.randomSource()),
  );
  const killed: TroopUnit[] = [];
  const killedIds = new Set<string>();

  plunderFireRaidTiles(context, svc);

  for (const [, unit] of context.state.units) {
    if (unit.faction !== context.actingFaction) {
      continue;
    }
    const effect = context.state.getTileEffect(unit.lane, unit.depth);
    if (!effect?.damagePerTurn || !tileStateRuleOf(effect).damagesOnTurnEnd || unit.isDead()) {
      continue;
    }

    // 火燒偷襲戰我方火抗（PROG-2-1459）：火格傷害依場景倍率減免
    const fireTaken = effect.state === 'hazard-fire' ? sceneFireDamageTakenOf(unit, context.state) : 1;
    const tileDamage = fireTaken === 1 ? effect.damagePerTurn : Math.max(1, Math.floor(effect.damagePerTurn * fireTaken));
    context.applyUnitDamage(unit, tileDamage, null, {
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
  for (const [unitId, dot] of Array.from(context.state.unitDots)) {
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

/**
 * 火燒偷襲戰掠奪（戰法場景規格書 B-3，PROG-2-1462）：我方回合結束時站在火攻格 = 佔領 = 掠奪成功，
 * 每格一次，補給、武器材料、教官經驗寫入 Stage_Salvage（PROG-2-1509）。場景戰法只由玩家發動（B-1），敵方不掠奪。
 */
function plunderFireRaidTiles(context: BattleTileEffectPhaseContext, svc: ReturnType<typeof services>): void {
  if (context.actingFaction !== Faction.Player || context.state.battleTactic !== BattleTactic.FireAttack) return;
  const random = context.random ?? (() => svc.session.randomSource());
  for (const [, unit] of context.state.units) {
    if (unit.faction !== Faction.Player || unit.isDead()) continue;
    const effect = context.state.getTileEffect(unit.lane, unit.depth);
    if (effect?.state !== 'hazard-fire' || effect.notes !== FIRE_RAID_TILE_NOTE) continue;
    const key = `${unit.lane},${unit.depth}`;
    if (context.state.plunderedTiles.has(key)) continue;
    context.state.plunderedTiles.add(key);
    addStageSalvage(context.state.stageSalvage, rollFirePlunderGain(random));
  }
}
