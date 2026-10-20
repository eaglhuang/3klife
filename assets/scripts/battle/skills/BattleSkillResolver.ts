import type { FormationZone } from '../shared/FormationZone';
import { Faction, StatusEffect, TerrainType, Weather } from '../../core/config/Constants';
import { GeneralUnit } from '../../core/models/GeneralUnit';
import { TroopUnit } from '../../core/models/TroopUnit';
import type { BattleSkillRequest, SkillExecutionResult } from '../../shared/SkillRuntimeContract';
import type { BattleSkillCellRef } from './BattleSkillTargetSelector';

export interface BattleSkillExecutionContext {
  getFactionUnits(faction: Faction): TroopUnit[];
  getOpposingUnits(casterFaction: Faction): TroopUnit[];
  getBoardCells(): BattleSkillCellRef[];
  getUnit(unitId: string): TroopUnit | null;
  getCasterGeneral(casterFaction: Faction): GeneralUnit | null;
  getTerrain(lane: number, depth: number): TerrainType;
  /** 施放者所在格（PROG-2-0756：衝鋒判定直線用）；舊測試 context 可不提供，視為無衝鋒 */
  getCasterCell?(casterFaction: Faction): { lane: number; depth: number } | null;
  /** 目前戰場天氣（PROG-2-0406：火計大風 ×2）；舊測試 context 可不提供，視為晴天 */
  getWeather?(): Weather;
  /** 目前戰鬥回合數（PROG-2-0773：威震華夏首回合加倍用）；舊測試 context 可不提供，視為非首回合 */
  getTurnNumber?(): number;
  /** 戰場種子亂數源（爆擊擲骰用）；舊測試 context 可不提供，視為不擲骰 */
  randomSource?(): number;
  /** 施放者的戰場單位 id（PROG-2-0761：防禦區陣亡即移除用）；舊測試 context 可不提供 */
  getCasterUnitId?(casterFaction: Faction): string | null;
  /** 站位上的持續防禦區倍率（PROG-2-0761）；舊測試 context 可不提供，視為 1 */
  getDefenseZoneMultiplier?(unit: TroopUnit): number;
  /** 新增持續防禦區（PROG-2-0761） */
  addFormationZone?(zone: FormationZone): void;
  /** 位移：目標格是否可站立（PROG-2-0767）；舊測試 context 可不提供，視為不可位移 */
  isCellFreeForPush?(lane: number, depth: number): boolean;
  /** 位移：把單位搬到新格（PROG-2-0767） */
  pushUnitTo?(unit: TroopUnit, lane: number, depth: number): void;
  /** 對單位施加持續傷害（毒箭，PROG-2-0766）；舊測試 context 可不提供 */
  addUnitDot?(unit: TroopUnit, ratio: number, turns: number): void;
  /** 把指定格設為火場等持續傷害格（PROG-2-0757）；舊測試 context 可不提供 */
  setTileHazard?(cell: { lane: number; depth: number }, damagePerTurn: number): void;
  applyDamage(unit: TroopUnit, damage: number, casterFaction: Faction): void;
  healUnit(unit: TroopUnit, amount: number, casterFaction: Faction): void;
  applyBuff(unit: TroopUnit, effect: StatusEffect, turns: number): void;
  registerDamageLink(primaryUnit: TroopUnit, linkedUnits: TroopUnit[], shareRatio: number, battleSkillId: string): void;
  registerCounterReaction(targetUnit: TroopUnit, battleSkillId: string, counterRatio: number, statusTurns: number, triggers: number, meleeOnly: boolean): void;
  registerActionReset(targetUnit: TroopUnit, battleSkillId: string, firstHitMultiplier: number, extraActions: number): void;
  emitSkillEffect(skillId: string, casterFaction: Faction): void;
}

export interface BattleSkillResolver {
  canResolve(request: BattleSkillRequest): boolean;
  execute(request: BattleSkillRequest, context: BattleSkillExecutionContext): SkillExecutionResult;
}
