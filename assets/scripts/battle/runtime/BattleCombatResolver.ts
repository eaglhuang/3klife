import { EVENT_NAMES, Faction, GAME_CONFIG, SP_PER_KILL, StatusEffect, TerrainType, WEAK_ATTACK_MULTIPLIER } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';
import type { TroopUnit } from '../../core/models/TroopUnit';
import { fieldTallySetMods, type TallySetMember } from '../../core/systems/TigerTallySetBonus';
import type { BattleState } from '../models/BattleState';
import { BattleTurnManager } from './BattleTurnManager';
import { resolveBattleTacticBehavior } from '../shared/BattleTacticBehavior';
import { canTargetUnderStealth, isHiddenOnTile } from '../shared/StealthTile';
import { battleAptitudeProfileOf, hitRateOf, resolveAptitude, rollHit, type ResolvedAptitude } from '../../core/systems/BattleAptitude';
import { getTerrainTroopEffect, terrainEvasionBonusOf } from '../../core/systems/TerrainTroopRules';
import { zoneDefenseMultiplier } from '../shared/FormationZone';
import { extraAttackHitsOf } from '../shared/TallyPassive';
import { clearMorale } from '../shared/Morale';
import { critDamageOf, critRateOf, rollCrit } from '../../core/systems/CombatCrit';
import {
  canNavalCombinedAttack,
  hasNavalAptitude,
  hasBattleEffect,
  isFogHitGuaranteed,
  isOrthogonallyAdjacent,
  NAVAL_COMBINED_DAMAGE_RATIO,
} from '../../core/systems/FactorTacticLinkage';

export interface BattleCombatAction {
  attackerId: string;
  targetId: string | null;
}

export interface BattleCombatResolverContext {
  readonly state: BattleState;
  readonly turnManager?: BattleTurnManager;
  getPlayerGeneralUnitId(): string | null;
  getEnemyGeneralUnitId(): string | null;
  setPlayerGeneralUnitId(unitId: string | null): void;
  setEnemyGeneralUnitId(unitId: string | null): void;
}

export class BattleCombatResolver {
  /** 命中判定用亂數；測試可換成固定序列（PROG-2-0080） */
  /** 命中與暴擊的擲骰走戰場種子亂數源（Q25），不用 Math.random */
  public hitRandom: () => number = () => services().session.randomSource();

  constructor(private readonly context: BattleCombatResolverContext) {}

  /** 部隊所在格的適性修正：取同陣營主將的兵種 / 地形 / 天氣適性（PROG-2-0071） */
  /** 虎符部隊的攻擊乘數：星級 × 同陣營在場 Set 的攻擊加成（PROG-2-0574）；非虎符單位恆為 1 */
  public getTallyAttackMod(unit: TroopUnit): number {
    if (!unit.tallyId) return 1;
    return unit.tallyStarMultiplier * this.tallySetMods(unit.faction).atkMod;
  }

  /** 虎符部隊的防禦乘數：星級 × 同陣營在場 Set 的防禦加成（PROG-2-0574）；非虎符單位恆為 1 */
  public getTallyDefenseMod(unit: TroopUnit): number {
    if (!unit.tallyId) return 1;
    return unit.tallyStarMultiplier * this.tallySetMods(unit.faction).defMod;
  }

  private tallySetMods(faction: Faction): { atkMod: number; defMod: number } {
    const members: TallySetMember[] = [];
    for (const unit of this.context.state.units.values()) {
      if (unit.faction !== faction) continue;
      members.push({ templateId: unit.tallyTemplateId, alive: unit.currentHp > 0 });
    }
    return fieldTallySetMods(members);
  }

  public getUnitAptitude(unit: TroopUnit): ResolvedAptitude {
    const state = this.context.state;
    const cell = state.getCell(unit.lane, unit.depth);
    return resolveAptitude(battleAptitudeProfileOf(state.getGeneral(unit.faction)), {
      troopType: unit.type,
      terrain: cell?.terrain ?? TerrainType.Plain,
      weather: state.weather,
    });
  }

  /** 兵種 × 地形防禦倍率（步兵山地 +30%，PROG-2-0200）；沒有規則時為 1 */
  /** 站位防禦倍率 = 地形兵種加成 × 持續防禦區倍率（PROG-2-0760） */
  public getUnitTerrainDefenseMultiplier(unit: TroopUnit): number {
    const cell = this.context.state.getCell(unit.lane, unit.depth);
    const terrain = cell?.terrain ?? TerrainType.Plain;
    const zone = zoneDefenseMultiplier(this.context.state.getFormationZone(unit.lane, unit.depth), unit.faction);
    return (1 + getTerrainTroopEffect(unit.type, terrain).defenseMult) * zone;
  }

  /** 移動格數修正 = 適性等級修正 + 兵種 × 地形固定效果（PROG-2-0089） */
  public getUnitMoveDelta(unit: TroopUnit): number {
    const cell = this.context.state.getCell(unit.lane, unit.depth);
    const terrain = cell?.terrain ?? TerrainType.Plain;
    return this.getUnitAptitude(unit).moveDelta + getTerrainTroopEffect(unit.type, terrain).moveDelta;
  }

  /** 移動力直接設值（水域 D「移動力歸 1」，PROG-2-0786）；null 表示用加減修正 */
  public getUnitMoveSetTo(unit: TroopUnit): number | null {
    return this.getUnitAptitude(unit).moveSetTo;
  }

  public getFactionUnits(faction: Faction): TroopUnit[] {
    const result: TroopUnit[] = [];
    this.context.state.units.forEach((unit) => {
      if (unit.faction === faction) {
        result.push(unit);
      }
    });
    return result;
  }

  public isCellMovementBlocked(lane: number, depth: number): boolean {
    return this.context.state.getTileEffect(lane, depth)?.blocksMovement === true;
  }

  public isGeneralUnit(unitId: string): boolean {
    return unitId === this.context.getPlayerGeneralUnitId() || unitId === this.context.getEnemyGeneralUnitId();
  }

  public buildAttackAction(
    unit: TroopUnit,
    options: { ignoreDeadOccupants?: boolean } = {},
  ): BattleCombatAction | null {
    const target = this.findCombatTarget(unit, options);
    if (target) {
      return { attackerId: unit.id, targetId: target.id };
    }
    if (this.canAttackGeneral(unit)) {
      return { attackerId: unit.id, targetId: null };
    }
    return null;
  }

  public damageEnemyGeneral(attacker: TroopUnit, svc: ReturnType<typeof services>): void {
    const tacticBehavior = resolveBattleTacticBehavior(this.context.state.battleTactic);
    const enemyFaction = attacker.faction === Faction.Player ? Faction.Enemy : Faction.Player;
    const general = this.context.state.getGeneral(enemyFaction);
    if (!general || general.isDead()) return;

    // 武將可以閃躲兵硬攻擊（對應 E-14 閃躲機率）
    const wasDodged = svc.formula.rollDodge(general.luk);
    if (wasDodged) {
      svc.event.emit(EVENT_NAMES.GeneralDamaged, {
        faction: enemyFaction,
        hp: general.currentHp,
        damage: 0,
        attackerId: attacker.id,
        wasDodged: true,
        isCrit: false,
      });
      return;
    }

    const damageAdjustment = tacticBehavior.resolveDamageAdjustment({
      kind: 'general',
      attacker,
      baseDamage: attacker.getEffectiveAttack(),
      state: this.context.state,
    });
    const atk = damageAdjustment.damage;
    let finalAttack = atk;
    const actionReset = this.context.state.getActionReset(attacker.id);
    if (actionReset?.firstHitPending) {
      finalAttack = Math.max(1, Math.floor(finalAttack * actionReset.firstHitMultiplier));
    }
    if (svc.buff.hasBuff(attacker.id, StatusEffect.Weak)) {
      finalAttack = Math.max(1, Math.floor(finalAttack * WEAK_ATTACK_MULTIPLIER));
    }
    general.takeDamage(finalAttack);
    svc.event.emit(EVENT_NAMES.GeneralDamaged, {
      faction: enemyFaction,
      hp: general.currentHp,
      damage: finalAttack,
      attackerId: attacker.id,
      wasDodged: false,
      isCrit: false,
    });
  }

  public resolveCombat(attacker: TroopUnit, defender: TroopUnit, svc: ReturnType<typeof services>): void {
    // 結姻連射（PROG-2-0775）：攻擊次數 = 1 + 額外次數；每一下都是完整的命中、傷害、反擊解算
    const hits = 1 + extraAttackHitsOf(attacker, this.isAdjacentToMaleGeneral(attacker));
    for (let hit = 0; hit < hits; hit += 1) {
      if (attacker.isDead() || defender.isDead()) return;
      this.resolveHit(attacker, defender, svc);
    }
  }

  /** 攻擊方的主將是男性，且部隊站在主將所在排的前一排（武將不在格子上，只看排位） */
  private isAdjacentToMaleGeneral(unit: TroopUnit): boolean {
    const general = this.context.state.getGeneral(unit.faction);
    if (general?.gender !== '男') return false;
    const generalDepth = unit.faction === Faction.Player ? GAME_CONFIG.GRID_DEPTH : -1;
    return Math.abs(generalDepth - unit.depth) === 1;
  }

  private resolveHit(attacker: TroopUnit, defender: TroopUnit, svc: ReturnType<typeof services>): void {
    const tacticBehavior = resolveBattleTacticBehavior(this.context.state.battleTactic);
    const attackerGeneral = this.context.state.getGeneral(attacker.faction);
    const aCell = this.context.state.getCell(attacker.lane, attacker.depth);
    const dCell = this.context.state.getCell(defender.lane, defender.depth);

    // 適性命中：命中率 < 100% 時擲骰，落空就不造成傷害、也不觸發反擊（PROG-2-0080）
    // 隱蔽（弓兵林地 +20%，PROG-2-0201）：防守方的隱蔽讓攻擊方命中率 −隱蔽值，仍受命中下限約束
    const defenderCell = this.context.state.getCell(defender.lane, defender.depth);
    const defenderStealth = getTerrainTroopEffect(defender.type, defenderCell?.terrain ?? TerrainType.Plain).stealthBonus;
    // 場景命中加成（夜襲 -25%，SCN-06）：加在適性與隱蔽之後
    const sceneAccuracy = tacticBehavior.getAccuracyDelta?.(attacker, this.context.state) ?? 0;
    // 林地 S 迴避 +30%（PROG-2-0788）：防守方在林地且林地適性 S 時，攻擊方命中率再 −30%
    const defenderEvasion = terrainEvasionBonusOf(defenderCell?.terrain ?? TerrainType.Plain, this.getUnitAptitude(defender).terrain);
    const attackerAccuracy = this.getUnitAptitude(attacker).accuracyDelta - defenderStealth - defenderEvasion + sceneAccuracy;
    // 大霧免疫（PROG-2-0584）：大霧天氣下攻擊方有此效果時命中必中，略過擲骰
    const fogGuaranteed = isFogHitGuaranteed(this.context.state.weather, attacker.factorEffects);
    if (!fogGuaranteed && !rollHit(attackerAccuracy, this.hitRandom)) {
      svc.event.emit(EVENT_NAMES.UnitAttackMissed, {
        attackerId: attacker.id,
        targetId: defender.id,
        hitRate: hitRateOf(attackerAccuracy),
      });
      return;
    }

    // 盾牆：防禦力加倍
    const effectiveDef = defender.getEffectiveDefense() * (defender.isShieldWallActive ? 2 : 1) * this.getUnitTerrainDefenseMultiplier(defender) * this.getTallyDefenseMod(defender);

    let damage = svc.formula.calculateDamage({
      attackerAttack: attacker.getEffectiveAttack() * this.getTallyAttackMod(attacker),
      defenderDefense: effectiveDef,
      attackerType: attacker.type,
      defenderType: defender.type,
      attackerTerrain: aCell?.terrain ?? TerrainType.Plain,
      defenderTerrain: dCell?.terrain ?? TerrainType.Plain,
      attackBonus: attackerGeneral?.attackBonus,
      attackerAptitudeMultiplier: this.getUnitAptitude(attacker).attackMultiplier,
      defenderAptitudeMultiplier: this.getUnitAptitude(defender).defenseMultiplier,
    });

    const damageAdjustment = tacticBehavior.resolveDamageAdjustment({
      kind: 'unit',
      attacker,
      baseDamage: damage,
      state: this.context.state,
    });
    damage = damageAdjustment.damage;
    const actionReset = this.context.state.getActionReset(attacker.id);
    if (actionReset?.firstHitPending) {
      damage = Math.max(1, Math.floor(damage * actionReset.firstHitMultiplier));
    }
    if (svc.buff.hasBuff(attacker.id, StatusEffect.Weak)) {
      damage = Math.max(1, Math.floor(damage * WEAK_ATTACK_MULTIPLIER));
    }

    // 暴擊（SCN-06）：基礎 5% + 場景加成，暴擊時傷害 ×1.5；擲骰走戰場亂數源
    const critRate = critRateOf(tacticBehavior.getCritBonus?.(attacker, this.context.state) ?? 0);
    if (rollCrit(critRate, this.hitRandom)) {
      damage = critDamageOf(damage);
    }

    this.applyUnitDamage(defender, damage, attacker.faction, {
      attackerId: attacker.id,
      attackerLane: attacker.lane,
      attackerDepth: attacker.depth,
      damageSource: damageAdjustment.damageSource,
      allowDamageLink: true,
    });

    if (!defender.isDead()) {
      this.tryTriggerCounterReaction(defender, attacker, svc);
    }
    this.resolveNavalCombinedFollowUp(attacker, defender, svc);
  }

  /**
   * 水域合攻（PM 暫定，PROG-2-0584）：攻擊方站在河流格且有 naval-combined-attack 時，
   * 與目標相鄰的一個我方非主將部隊追加一次 50% 傷害，不觸發反擊、不擲命中。
   * 目標已死或找不到相鄰友軍時不發生。
   */
  private resolveNavalCombinedFollowUp(attacker: TroopUnit, defender: TroopUnit, svc: ReturnType<typeof services>): void {
    if (defender.isDead() || attacker.isDead()) return;
    const attackerCell = this.context.state.getCell(attacker.lane, attacker.depth);
    const navalAptitude = hasNavalAptitude(this.getUnitAptitude(attacker).terrain, hasBattleEffect(attacker.factorEffects, 'naval-combined-attack'));
    if (!canNavalCombinedAttack(attackerCell?.terrain ?? TerrainType.Plain, navalAptitude)) return;

    const helper = this.findNavalCombinedHelper(attacker, defender);
    if (!helper) return;
    const helperCell = this.context.state.getCell(helper.lane, helper.depth);
    const dCell = this.context.state.getCell(defender.lane, defender.depth);
    const baseDamage = svc.formula.calculateDamage({
      attackerAttack: helper.getEffectiveAttack() * this.getTallyAttackMod(helper),
      defenderDefense: defender.getEffectiveDefense() * (defender.isShieldWallActive ? 2 : 1) * this.getUnitTerrainDefenseMultiplier(defender) * this.getTallyDefenseMod(defender),
      attackerType: helper.type,
      defenderType: defender.type,
      attackerTerrain: helperCell?.terrain ?? TerrainType.Plain,
      defenderTerrain: dCell?.terrain ?? TerrainType.Plain,
      attackerAptitudeMultiplier: this.getUnitAptitude(helper).attackMultiplier,
      defenderAptitudeMultiplier: this.getUnitAptitude(defender).defenseMultiplier,
    });
    const damage = Math.max(1, Math.floor(baseDamage * NAVAL_COMBINED_DAMAGE_RATIO));

    this.applyUnitDamage(defender, damage, attacker.faction, {
      attackerId: helper.id,
      attackerLane: helper.lane,
      attackerDepth: helper.depth,
      damageSource: 'naval-combined-attack',
      allowDamageLink: true,
    });
  }

  /** 與目標四方向相鄰的我方非主將、存活部隊（固定掃描順序，取第一個） */
  private findNavalCombinedHelper(attacker: TroopUnit, defender: TroopUnit): TroopUnit | null {
    const offsets = [{ dl: 0, dd: 1 }, { dl: 0, dd: -1 }, { dl: 1, dd: 0 }, { dl: -1, dd: 0 }];
    for (const { dl, dd } of offsets) {
      const cell = this.context.state.getCell(defender.lane + dl, defender.depth + dd);
      if (!cell?.occupantId) continue;
      const unit = this.context.state.units.get(cell.occupantId);
      if (!unit || unit.id === attacker.id || unit.faction !== attacker.faction) continue;
      if (unit.isDead() || this.isGeneralUnit(unit.id)) continue;
      if (isOrthogonallyAdjacent(unit.lane, unit.depth, defender.lane, defender.depth)) return unit;
    }
    return null;
  }

  public resolveActionResetAfterAttack(
    attacker: TroopUnit,
    didKill: boolean,
    actions: BattleCombatAction[],
  ): void {
    const actionReset = this.context.state.getActionReset(attacker.id);
    if (!actionReset) {
      return;
    }

    if (attacker.isDead()) {
      this.context.state.removeActionReset(attacker.id);
      return;
    }

    const nextState = {
      ...actionReset,
      firstHitPending: false,
    };

    if (didKill && nextState.remainingExtraActions > 0) {
      const followUpAction = this.buildAttackAction(attacker, { ignoreDeadOccupants: true });
      nextState.remainingExtraActions -= 1;
      if (followUpAction) {
        actions.push(followUpAction);
      }
    } else {
      nextState.remainingExtraActions = 0;
    }

    if (!nextState.firstHitPending && nextState.remainingExtraActions <= 0) {
      this.context.state.removeActionReset(attacker.id);
      return;
    }

    this.context.state.setActionReset(nextState);
  }

  public advanceAfterKill(attacker: TroopUnit, svc: ReturnType<typeof services>): void {
    if (this.context.turnManager?.hasUnitMovedThisTurn(attacker.id)) {
      return;
    }

    const direction = this.getForwardDirection(attacker);
    const fromLane = attacker.lane;
    const fromDepth = attacker.depth;
    const nextLane = fromLane;
    const nextDepth = fromDepth + direction;
    const currentCell = this.context.state.getCell(fromLane, fromDepth);
    const nextCell = this.context.state.getCell(nextLane, nextDepth);

    if (!currentCell || !nextCell) {
      return;
    }
    if (nextCell.occupantId !== null || this.isCellMovementBlocked(nextLane, nextDepth)) {
      return;
    }

    currentCell.occupantId = null;
    attacker.moveTo(nextLane, nextDepth);
    nextCell.occupantId = attacker.id;
    this.context.turnManager?.markUnitMoved(attacker.id);

    svc.event.emit(EVENT_NAMES.UnitMoved, {
      unitId: attacker.id,
      lane: attacker.lane,
      depth: attacker.depth,
      fromLane,
      fromDepth,
    });
  }

  public applyUnitDamage(
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
  ): void {
    const svc = services();
    unit.takeDamage(damage);
    svc.event.emit(EVENT_NAMES.UnitDamaged, {
      unitId: unit.id,
      damage,
      hp: unit.currentHp,
      attackerId: options.attackerId,
      attackerLane: options.attackerLane,
      attackerDepth: options.attackerDepth,
      defenderLane: unit.lane,
      defenderDepth: unit.depth,
      attackerFaction,
      damageSource: options.damageSource,
    });

    if (!options.allowDamageLink) {
      return;
    }

    const link = this.context.state.getDamageLink(unit.id);
    if (!link) {
      return;
    }

    const sharedDamage = Math.max(1, Math.floor(damage * link.shareRatio));
    for (const linkedUnitUid of link.linkedUnitUids) {
      const linkedUnit = this.context.state.units.get(linkedUnitUid);
      if (!linkedUnit || linkedUnit.isDead()) {
        continue;
      }
      linkedUnit.takeDamage(sharedDamage);
      svc.event.emit(EVENT_NAMES.UnitDamaged, {
        unitId: linkedUnit.id,
        damage: sharedDamage,
        hp: linkedUnit.currentHp,
        attackerId: options.attackerId,
        attackerLane: options.attackerLane,
        attackerDepth: options.attackerDepth,
        defenderLane: linkedUnit.lane,
        defenderDepth: linkedUnit.depth,
        attackerFaction,
        damageSource: `linked-share:${link.battleSkillId}`,
      });
      if (linkedUnit.isDead()) {
        if (linkedUnit.id === this.context.getPlayerGeneralUnitId()) {
          this.onGeneralUnitKilled(Faction.Player, svc);
        } else if (linkedUnit.id === this.context.getEnemyGeneralUnitId()) {
          this.onGeneralUnitKilled(Faction.Enemy, svc);
        }
        this.onUnitKilled(linkedUnit, null, svc);
      }
    }
  }

  public onGeneralUnitKilled(faction: Faction, svc: ReturnType<typeof services>): void {
    const general = this.context.state.getGeneral(faction);
    if (general) {
      general.currentHp = 0;
      svc.event.emit(EVENT_NAMES.GeneralDamaged, {
        faction,
        hp: 0,
        damage: 0,
        attackerId: null,
      });
    }
    if (faction === Faction.Player) {
      this.context.setPlayerGeneralUnitId(null);
    } else {
      this.context.setEnemyGeneralUnitId(null);
    }
  }

  public onUnitKilled(
    unit: TroopUnit,
    killer: TroopUnit | null,
    svc: ReturnType<typeof services>,
  ): void {
    if (!this.context.state.units.has(unit.id)) return;

    const { lane, depth, faction, type } = unit;
    this.context.state.removeUnit(unit.id);
    svc.buff.clearUnit(unit.id);
    clearMorale(unit);
    svc.event.emit(EVENT_NAMES.UnitDied, { unitId: unit.id, lane, depth, faction, type });

    if (killer) {
      const general = this.context.state.getGeneral(killer.faction);
      if (general) {
        general.addSp(SP_PER_KILL);
        svc.event.emit(EVENT_NAMES.GeneralSpChanged, {
          faction: killer.faction,
          sp: general.currentSp,
          maxSp: general.maxSp,
        });
      }
    }
  }

  private findCombatTarget(
    unit: TroopUnit,
    options: { ignoreDeadOccupants?: boolean } = {},
  ): TroopUnit | null {
    const dir = this.getForwardDirection(unit);
    const effectiveAttackRange = this.getEffectiveAttackRange(unit);

    const enemyGeneralId = unit.faction === Faction.Player
      ? this.context.getEnemyGeneralUnitId()
      : this.context.getPlayerGeneralUnitId();
    if (enemyGeneralId) {
      const generalUnit = this.context.state.units.get(enemyGeneralId);
      if (generalUnit && !generalUnit.isDead() && !this.isHiddenFromAttacker(unit, generalUnit)) {
        const dist = Math.max(
          Math.abs(unit.lane - generalUnit.lane),
          Math.abs(unit.depth - generalUnit.depth),
        );
        if (dist <= effectiveAttackRange) {
          return generalUnit;
        }
      }
    }

    if (this.isGeneralUnit(unit.id)) {
      const adjacentEnemy = this.findAdjacentEnemy(unit);
      if (adjacentEnemy) {
        return adjacentEnemy;
      }
    }

    for (let range = 1; range <= effectiveAttackRange; range += 1) {
      const cell = this.context.state.getCell(unit.lane, unit.depth + dir * range);
      if (!cell) {
        break;
      }
      if (!cell.occupantId) {
        continue;
      }
      const occupant = this.context.state.units.get(cell.occupantId);
      if (!occupant) {
        continue;
      }
      if (occupant.isDead()) {
        if (options.ignoreDeadOccupants) {
          continue;
        }
        break;
      }
      if (occupant.faction !== unit.faction && !this.isHiddenFromAttacker(unit, occupant)) {
        return occupant;
      }
      if (effectiveAttackRange > 1 && occupant.faction === unit.faction) {
        continue;
      }
      break;
    }

    return null;
  }

  /** 找出武將單位周圍（含斜對角一格以內）的敵方目標 */
  private findAdjacentEnemy(unit: TroopUnit): TroopUnit | null {
    const dir = this.getForwardDirection(unit);
    // 優先正前方，其次斜前方，再其次側面
    const offsets = [
      { dl: 0, dd: dir },
      { dl: -1, dd: dir },
      { dl: 1, dd: dir },
      { dl: -1, dd: 0 },
      { dl: 1, dd: 0 },
    ];
    for (const { dl, dd } of offsets) {
      const cell = this.context.state.getCell(unit.lane + dl, unit.depth + dd);
      if (!cell?.occupantId) continue;
      const occ = this.context.state.units.get(cell.occupantId);
      if (occ && occ.faction !== unit.faction && !this.isHiddenFromAttacker(unit, occ)) return occ;
    }
    return null;
  }

  private canAttackGeneral(unit: TroopUnit): boolean {
    if (this.isFactionHiddenFrom(unit.faction, unit.faction === Faction.Player ? Faction.Enemy : Faction.Player)) {
      return false;
    }
    // 掩體格（GRD-04，PROG-2-0595）：敵方武將站在掩體格時，遠程攻擊者不可直接攻擊
    const enemyGeneralId = unit.faction === Faction.Player
      ? this.context.getEnemyGeneralUnitId()
      : this.context.getPlayerGeneralUnitId();
    const enemyGeneral = enemyGeneralId ? this.context.state.units.get(enemyGeneralId) : undefined;
    if (enemyGeneral) {
      const tileState = this.context.state.getTileEffect(enemyGeneral.lane, enemyGeneral.depth)?.state ?? null;
      if (!canTargetUnderStealth(this.getEffectiveAttackRange(unit), isHiddenOnTile(tileState))) {
        return false;
      }
    }
    const generalDepth = unit.faction === Faction.Player ? GAME_CONFIG.GRID_DEPTH : -1;
    const distanceToGeneral = Math.abs(generalDepth - unit.depth);
    return distanceToGeneral <= this.getEffectiveAttackRange(unit);
  }

  /** 攻擊者能否鎖定目標：陣營隱蔽，或目標站在掩體格且攻擊者為遠程（GRD-04，PROG-2-0593） */
  private isHiddenFromAttacker(attacker: TroopUnit, target: TroopUnit): boolean {
    if (this.isUnitHiddenFrom(attacker.faction, target)) return true;
    const tileState = this.context.state.getTileEffect(target.lane, target.depth)?.state ?? null;
    return !canTargetUnderStealth(this.getEffectiveAttackRange(attacker), isHiddenOnTile(tileState));
  }

  private isUnitHiddenFrom(attackerFaction: Faction, target: TroopUnit): boolean {
    return this.isFactionHiddenFrom(attackerFaction, target.faction);
  }

  private isFactionHiddenFrom(attackerFaction: Faction, targetFaction: Faction): boolean {
    return resolveBattleTacticBehavior(this.context.state.battleTactic).isFactionHiddenFrom(attackerFaction, targetFaction, this.context.state);
  }

  /** 戰術修正後的射程 + 兵種 × 地形射程修正（弓兵水域 −1，PROG-2-0201）；有射程的兵種至少保留 1 */
  private getEffectiveAttackRange(unit: TroopUnit): number {
    const baseRange = resolveBattleTacticBehavior(this.context.state.battleTactic).getEffectiveAttackRange(unit, this.context.state);
    if (baseRange === 0) return 0;
    const cell = this.context.state.getCell(unit.lane, unit.depth);
    const terrain = cell?.terrain ?? TerrainType.Plain;
    return Math.max(1, baseRange + getTerrainTroopEffect(unit.type, terrain).attackRangeDelta);
  }

  private getForwardDirection(unit: TroopUnit): number {
    return unit.faction === Faction.Player ? 1 : -1;
  }

  private tryTriggerCounterReaction(
    defender: TroopUnit,
    attacker: TroopUnit,
    svc: ReturnType<typeof services>,
  ): void {
    const reaction = this.context.state.getCounterReaction(defender.id);
    if (!reaction || reaction.remainingTriggers <= 0) {
      return;
    }
    if (reaction.meleeOnly && attacker.attackRange > 1) {
      return;
    }
    if (attacker.isDead()) {
      return;
    }

    const defenderGeneral = this.context.state.getGeneral(defender.faction);
    const defenderCell = this.context.state.getCell(defender.lane, defender.depth);
    const attackerCell = this.context.state.getCell(attacker.lane, attacker.depth);
    const counterDamage = svc.formula.calculateDamage({
      attackerAttack: Math.max(1, Math.floor(defender.getEffectiveAttack() * this.getTallyAttackMod(defender) * reaction.counterRatio)),
      defenderDefense: attacker.getEffectiveDefense() * (attacker.isShieldWallActive ? 2 : 1) * this.getUnitTerrainDefenseMultiplier(attacker) * this.getTallyDefenseMod(attacker),
      attackerType: defender.type,
      defenderType: attacker.type,
      attackerTerrain: defenderCell?.terrain ?? TerrainType.Plain,
      defenderTerrain: attackerCell?.terrain ?? TerrainType.Plain,
      attackBonus: defenderGeneral?.attackBonus,
      attackerAptitudeMultiplier: this.getUnitAptitude(defender).attackMultiplier,
      defenderAptitudeMultiplier: this.getUnitAptitude(attacker).defenseMultiplier,
    });

    this.applyUnitDamage(attacker, counterDamage, defender.faction, {
      attackerId: defender.id,
      attackerLane: defender.lane,
      attackerDepth: defender.depth,
      damageSource: `counter:${reaction.battleSkillId}`,
      allowDamageLink: true,
    });

    svc.buff.applyBuff(attacker.id, StatusEffect.Weak, reaction.statusTurns);
    svc.event.emit(EVENT_NAMES.BuffApplied, {
      unitId: attacker.id,
      effect: StatusEffect.Weak,
      turns: reaction.statusTurns,
    });

    if (attacker.isDead()) {
      if (attacker.id === this.context.getPlayerGeneralUnitId()) {
        this.onGeneralUnitKilled(Faction.Player, svc);
      } else if (attacker.id === this.context.getEnemyGeneralUnitId()) {
        this.onGeneralUnitKilled(Faction.Enemy, svc);
      }
      this.onUnitKilled(attacker, defender, svc);
    }

    if (reaction.remainingTriggers <= 1) {
      this.context.state.removeCounterReaction(defender.id);
      return;
    }

    this.context.state.setCounterReaction({
      ...reaction,
      remainingTriggers: reaction.remainingTriggers - 1,
    });
  }
}