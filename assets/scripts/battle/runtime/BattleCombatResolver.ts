// @spec-source → 戰場部署系統.md (doc_spec_0040)、demo_技術架構.md (doc_tech_0015)、戰場適性系統.md (doc_spec_0041)；PROG-2-1429 依建檔紀錄補標出處
import { EVENT_NAMES, Faction, GAME_CONFIG, SP_PER_KILL, StatusEffect, TerrainType, WEAK_ATTACK_MULTIPLIER, Weather } from '../../core/config/Constants';
import { aiSpGainPerKill } from '../../core/systems/AiSpCharge';
import { comboChanceOfPair } from '../../core/systems/ComboAttackKin';
import type { HistoricalRelation } from '../../core/systems/KinRelation';
import { services } from '../../core/managers/ServiceLoader';
import type { TroopUnit } from '../../core/models/TroopUnit';
import { fieldTallySetMods, type TallySetMember } from '../../core/systems/TigerTallySetBonus';
import type { BattleState } from '../models/BattleState';
import { BattleTurnManager } from './BattleTurnManager';
import { resolveBattleTacticBehavior } from '../shared/BattleTacticBehavior';
import { canTargetUnderStealth, isHiddenOnTile, isRangedAttack } from '../shared/StealthTile';
import { weatherRangedHitDelta, weatherRangedRangeDelta } from '../../core/systems/WeatherTacticRestriction';
import { battleAptitudeProfileOf, hitRateOf, resolveAptitude, rollHit, type ResolvedAptitude } from '../../core/systems/BattleAptitude';
import { getTerrainTroopEffect, terrainAttackRangeCapOf, terrainEvasionBonusOf } from '../../core/systems/TerrainTroopRules';
import { zoneDefenseMultiplier } from '../shared/FormationZone';
import {
  extraAttackHitsOf,
  tallyAttackMultiplierOf,
  tallyBackRowDamageMultiplierOf,
  tallyDefenseMultiplierOf,
  tallyDefensePenetrationOf,
  tallyEnemyAuraAttackMultiplierOf,
  tallyEvasionBonusOf,
  tallyPhysicalDamageTakenOf,
  tallyTroopTypeDamageMultiplierOf,
  applyFearCharge,
  tallySplashTargetsOf,
  tallyDamageGuardOf,
  tallyIgniteCellsOf,
} from '../shared/TallyPassive';
import { clearMorale } from '../shared/Morale';
import { critDamageOf, critRateOf, rollCrit } from '../../core/systems/CombatCrit';
import { tacticTriggerRate } from '../../core/systems/TacticTriggerRate';
import { isFixedTileState, tileStateRuleOf } from '../shared/TileStateRules';
import { FIRE_HAZARD_DAMAGE_PER_TURN } from '../skills/SkillEffectFormulas';
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
  /** 兩個部隊背後武將的史實關係；沒提供時不觸發史實合攻（PROG-2-1065） */
  relationsBetween?(attackerId: string, helperId: string): readonly HistoricalRelation[];
}

export class BattleCombatResolver {
  /** 命中判定用亂數；測試可換成固定序列（PROG-2-0080） */
  /** 命中與暴擊的擲骰走戰場種子亂數源（Q25），不用 Math.random */
  public hitRandom: () => number = () => services().session.randomSource();

  constructor(private readonly context: BattleCombatResolverContext) {}

  /** 部隊所在格的適性修正：取同陣營主將的兵種 / 地形 / 天氣適性（PROG-2-0071） */
  /** 虎符部隊的攻擊乘數：星級 × 同陣營在場 Set 的攻擊加成（PROG-2-0574）× 被動地形加成（PROG-2-1433）；非虎符單位恆為 1 */
  public getTallyAttackMod(unit: TroopUnit): number {
    // 錦帆恐懼光環（PROG-2-1457）：周圍有帶光環的敵方虎符部隊時，任何部隊（含非虎符）攻擊下降
    const aura = tallyEnemyAuraAttackMultiplierOf(unit, this.context.state.units.values());
    if (!unit.tallyId) return aura;
    // 虎符被動攻擊加成（解煩／丹陽／吳國，PROG-2-1433）：依部隊所站地形判定
    const terrain = this.context.state.getCell(unit.lane, unit.depth)?.terrain ?? TerrainType.Plain;
    return unit.tallyStarMultiplier * this.tallySetMods(unit.faction).atkMod * tallyAttackMultiplierOf(unit, terrain) * aura;
  }

  /** 部隊攻擊（物理）傷害的虎符被動乘數：攻方止啼符打後排 × 兵種剋制（白耳、元戎，PROG-2-1457）× 守方藤甲減傷（PROG-2-1437）；普攻、合攻、反擊共用 */
  public getTallyPhysicalDamageMod(attacker: TroopUnit, defender: TroopUnit): number {
    return tallyBackRowDamageMultiplierOf(attacker, defender)
      * tallyTroopTypeDamageMultiplierOf(attacker, defender)
      * tallyPhysicalDamageTakenOf(defender);
  }

  private applyTallyPhysicalDamageMod(damage: number, attacker: TroopUnit, defender: TroopUnit): number {
    const mod = this.getTallyPhysicalDamageMod(attacker, defender);
    return mod === 1 ? damage : Math.max(1, Math.floor(damage * mod));
  }

  /** 虎符部隊的防禦乘數：星級 × 同陣營在場 Set 的防禦加成（PROG-2-0574）× 被動防禦乘數（虎痴符，PROG-2-1444）；非虎符單位恆為 1 */
  public getTallyDefenseMod(unit: TroopUnit): number {
    if (!unit.tallyId) return 1;
    return unit.tallyStarMultiplier * this.tallySetMods(unit.faction).defMod * tallyDefenseMultiplierOf(unit);
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
    return tileStateRuleOf(this.context.state.getTileEffect(lane, depth)).blocksOnEnter;
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
    // 恐懼衝鋒（鐵騎，PROG-2-1514）：每次發動攻擊時周圍敵軍士氣扣減
    applyFearCharge(attacker, this.context.state.units.values());
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
    // 常山女迴避（PROG-2-1457）：防守方虎符迴避加成再降低命中率
    // 天氣強約束（PROG-2-1460）：遠程攻擊命中雨 -20%／霧 -30%／夜 -25%；夜襲場景已有全局 -25%，夜戰不再疊加（暫定）
    const weatherAccuracy = this.getWeatherRangedHitDelta(attacker);
    const attackerAccuracy = this.getUnitAptitude(attacker).accuracyDelta - defenderStealth - defenderEvasion - tallyEvasionBonusOf(defender) + sceneAccuracy + weatherAccuracy;
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
    const effectiveDef = defender.getEffectiveDefense() * (defender.isShieldWallActive ? 2 : 1) * this.getUnitTerrainDefenseMultiplier(defender) * this.getTallyDefenseMod(defender) * (1 - tallyDefensePenetrationOf(attacker));

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
    damage = this.applyTallyPhysicalDamageMod(damageAdjustment.damage, attacker, defender);
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
    this.resolveTallySplash(attacker, defender, damage, svc);
    this.resolveTallyIgnite(attacker, defender);

    if (!defender.isDead()) {
      this.tryTriggerCounterReaction(defender, attacker, svc);
    }
    this.resolveNavalCombinedFollowUp(attacker, defender, svc);
    this.resolveKinComboFollowUp(attacker, defender, svc);
  }

  /** 都督符火燒連營（PROG-2-1531）：目標及周圍格設為火場；固定地形格不覆蓋（同技能火場） */
  private resolveTallyIgnite(attacker: TroopUnit, defender: TroopUnit): void {
    const state = this.context.state;
    for (const cell of tallyIgniteCellsOf(attacker, defender)) {
      const existing = state.getTileEffect(cell.lane, cell.depth);
      if (existing && isFixedTileState(existing.state)) continue;
      state.setTileEffect({
        id: `tally-fire-${cell.lane}-${cell.depth}`,
        lane: cell.lane,
        depth: cell.depth,
        state: 'hazard-fire',
        damagePerTurn: FIRE_HAZARD_DAMAGE_PER_TURN,
        notes: 'tally:du-du-fu',
      });
    }
  }

  /** 南蠻巨型踐踏濺射（PROG-2-1527）：目標周圍敵軍受主傷害比例傷害，不反擊、不連結；打死照常結算 */
  private resolveTallySplash(attacker: TroopUnit, defender: TroopUnit, damage: number, svc: ReturnType<typeof services>): void {
    const { targets, ratio } = tallySplashTargetsOf(attacker, defender, this.context.state.units.values());
    for (const target of targets) {
      this.applyUnitDamage(target, Math.max(1, Math.floor(damage * ratio)), attacker.faction, {
        attackerId: attacker.id,
        attackerLane: attacker.lane,
        attackerDepth: attacker.depth,
        damageSource: 'tally-splash',
        allowDamageLink: false,
      });
      if (!target.isDead()) continue;
      if (target.id === this.context.getPlayerGeneralUnitId()) {
        this.onGeneralUnitKilled(Faction.Player, svc);
      } else if (target.id === this.context.getEnemyGeneralUnitId()) {
        this.onGeneralUnitKilled(Faction.Enemy, svc);
      }
      this.onUnitKilled(target, attacker, svc);
    }
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

    const helper = this.findCombinedHelper(attacker, defender, () => true);
    if (!helper) return;
    this.applyCombinedFollowUpDamage(helper, defender, svc, 'naval-combined-attack');
  }

  /**
   * 史實合攻（PM 裁定，PROG-2-1065）：與目標相鄰、且與攻擊方有史實關係的我方部隊，以基礎 20% 觸發（義兄弟 ×1.3），
   * 追加一次 50% 傷害，不觸發反擊、不擲命中。沒有史實關係的相鄰友軍不觸發。
   */
  private resolveKinComboFollowUp(attacker: TroopUnit, defender: TroopUnit, svc: ReturnType<typeof services>): void {
    const relationsBetween = this.context.relationsBetween;
    if (!relationsBetween || defender.isDead() || attacker.isDead()) return;
    const helper = this.findCombinedHelper(attacker, defender, (unit) => relationsBetween(attacker.id, unit.id).length > 0);
    if (!helper) return;
    const chance = comboChanceOfPair(relationsBetween(attacker.id, helper.id));
    if (this.hitRandom() >= chance) return;
    svc.event.emit(EVENT_NAMES.KinComboAttack, { attackerId: attacker.id, helperId: helper.id, targetId: defender.id });
    this.applyCombinedFollowUpDamage(helper, defender, svc, 'kin-combo-attack');
  }

  /** 合攻追加傷害：助攻方對目標的傷害 × 50%，不擲命中、不反擊 */
  private applyCombinedFollowUpDamage(
    helper: TroopUnit,
    defender: TroopUnit,
    svc: ReturnType<typeof services>,
    damageSource: 'naval-combined-attack' | 'kin-combo-attack',
  ): void {
    const helperCell = this.context.state.getCell(helper.lane, helper.depth);
    const dCell = this.context.state.getCell(defender.lane, defender.depth);
    const baseDamage = svc.formula.calculateDamage({
      attackerAttack: helper.getEffectiveAttack() * this.getTallyAttackMod(helper),
      defenderDefense: defender.getEffectiveDefense() * (defender.isShieldWallActive ? 2 : 1) * this.getUnitTerrainDefenseMultiplier(defender) * this.getTallyDefenseMod(defender) * (1 - tallyDefensePenetrationOf(helper)),
      attackerType: helper.type,
      defenderType: defender.type,
      attackerTerrain: helperCell?.terrain ?? TerrainType.Plain,
      defenderTerrain: dCell?.terrain ?? TerrainType.Plain,
      attackerAptitudeMultiplier: this.getUnitAptitude(helper).attackMultiplier,
      defenderAptitudeMultiplier: this.getUnitAptitude(defender).defenseMultiplier,
    });
    const damage = this.applyTallyPhysicalDamageMod(Math.max(1, Math.floor(baseDamage * NAVAL_COMBINED_DAMAGE_RATIO)), helper, defender);

    this.applyUnitDamage(defender, damage, helper.faction, {
      attackerId: helper.id,
      attackerLane: helper.lane,
      attackerDepth: helper.depth,
      damageSource,
      allowDamageLink: true,
    });
  }

  /** 與目標四方向相鄰的我方非主將、存活部隊，且通過 accept 條件（固定掃描順序，取第一個） */
  private findCombinedHelper(attacker: TroopUnit, defender: TroopUnit, accept: (unit: TroopUnit) => boolean): TroopUnit | null {
    const offsets = [{ dl: 0, dd: 1 }, { dl: 0, dd: -1 }, { dl: 1, dd: 0 }, { dl: -1, dd: 0 }];
    for (const { dl, dd } of offsets) {
      const cell = this.context.state.getCell(defender.lane + dl, defender.depth + dd);
      if (!cell?.occupantId) continue;
      const unit = this.context.state.units.get(cell.occupantId);
      if (!unit || unit.id === attacker.id || unit.faction !== attacker.faction) continue;
      if (unit.isDead() || this.isGeneralUnit(unit.id)) continue;
      if (!isOrthogonallyAdjacent(unit.lane, unit.depth, defender.lane, defender.depth)) continue;
      if (accept(unit)) return unit;
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
      /** 已被代為承傷轉移過，不再轉移（PROG-2-1530） */
      skipGuard?: boolean;
    },
  ): void {
    const svc = services();
    // 無敵（白馬銀槍·不滅，PM 裁定）：有無敵狀態的單位本次結算傷害歸零，不扣血、不發傷害事件
    if (svc.buff.hasBuff(unit.id, StatusEffect.Invincible)) return;
    // 代為承傷（白耳護主將 PROG-2-1529、惡來護友軍 PROG-2-1530）：改由相鄰護衛承受，護衛陣亡照常結算
    const guard = options.skipGuard ? null : tallyDamageGuardOf(unit, this.context.state.units.values(), () => this.isGeneralUnit(unit.id));
    if (guard) {
      this.applyUnitDamage(guard, damage, attackerFaction, { ...options, damageSource: 'tally-guard', skipGuard: true });
      if (guard.isDead()) this.onUnitKilled(guard, null, svc);
      return;
    }
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
        general.addSp(killer.faction === Faction.Enemy ? aiSpGainPerKill(this.context.state.aiSpGainModifier) : SP_PER_KILL);
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
  private getWeatherRangedHitDelta(attacker: TroopUnit): number {
    if (!isRangedAttack(attacker.attackRange)) return 0;
    const weather = this.context.state.weather;
    if (weather === Weather.Night && this.context.state.sceneFlags.nightRaid) return 0;
    return weatherRangedHitDelta(weather);
  }

  private getEffectiveAttackRange(unit: TroopUnit): number {
    const baseRange = resolveBattleTacticBehavior(this.context.state.battleTactic).getEffectiveAttackRange(unit, this.context.state);
    if (baseRange === 0) return 0;
    const cell = this.context.state.getCell(unit.lane, unit.depth);
    const terrain = cell?.terrain ?? TerrainType.Plain;
    // 天氣強約束（PROG-2-1460）：大風遠程射程 -2，最少留 1 格
    const weatherRange = isRangedAttack(unit.attackRange) ? weatherRangedRangeDelta(this.context.state.weather) : 0;
    const range = Math.max(1, baseRange + getTerrainTroopEffect(unit.type, terrain).attackRangeDelta + weatherRange);
    // 林地 D 視野受限（PROG-2-0789）：射程上限 1，只打相鄰格
    const cap = terrainAttackRangeCapOf(terrain, this.getUnitAptitude(unit).terrain);
    return cap === null ? range : Math.min(range, cap);
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
    // 反擊屬於被動自動觸發（PROG-2-1317）：依守方武將智力擲發動率；未過不反擊，也不消耗觸發次數
    if (defenderGeneral && this.hitRandom() >= tacticTriggerRate(defenderGeneral.int)) {
      return;
    }
    const defenderCell = this.context.state.getCell(defender.lane, defender.depth);
    const attackerCell = this.context.state.getCell(attacker.lane, attacker.depth);
    const counterDamage = svc.formula.calculateDamage({
      attackerAttack: Math.max(1, Math.floor(defender.getEffectiveAttack() * this.getTallyAttackMod(defender) * reaction.counterRatio)),
      defenderDefense: attacker.getEffectiveDefense() * (attacker.isShieldWallActive ? 2 : 1) * this.getUnitTerrainDefenseMultiplier(attacker) * this.getTallyDefenseMod(attacker) * (1 - tallyDefensePenetrationOf(defender)),
      attackerType: defender.type,
      defenderType: attacker.type,
      attackerTerrain: defenderCell?.terrain ?? TerrainType.Plain,
      defenderTerrain: attackerCell?.terrain ?? TerrainType.Plain,
      attackBonus: defenderGeneral?.attackBonus,
      attackerAptitudeMultiplier: this.getUnitAptitude(defender).attackMultiplier,
      defenderAptitudeMultiplier: this.getUnitAptitude(attacker).defenseMultiplier,
    });

    this.applyUnitDamage(attacker, this.applyTallyPhysicalDamageMod(counterDamage, defender, attacker), defender.faction, {
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