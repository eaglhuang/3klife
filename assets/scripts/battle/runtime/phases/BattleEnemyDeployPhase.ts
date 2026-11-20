// @spec-source → 戰場部署系統.md (doc_spec_0040)、demo_技術架構.md (doc_tech_0015)；PROG-2-1429 依建檔紀錄補標出處
import { Faction, GAME_CONFIG, TROOP_DEPLOY_COST, TroopType } from '../../../core/config/Constants';
import { pickDefenseReinforceLane } from '../../../core/systems/DefenseBattle';
import {
  BOSS_GUARD_TROOP,
  BOSS_GUARD_UNIT_NAME,
  bossGuardLanes,
  bossGuardSummonLine,
  isBossGuardGeneral,
  isBossGuardSummonDue,
} from '../../../core/systems/BossGuardSummon';
import { getAIDeployCount } from '../../../core/systems/AiDeployCount';
import type { EnemyAI } from '../../controllers/EnemyAI';
import type { BattleState } from '../../models/BattleState';
import { BattleTurnManager } from '../BattleTurnManager';

export interface BattleEnemyDeployPhaseContext {
  readonly state: BattleState;
  readonly enemyAi: EnemyAI;
  readonly turnManager: BattleTurnManager;
  /** 當前回合數（1 起算），用於 F-2 部署數 */
  readonly turn: number;
  /** 敵方難度加成（ai-difficulty.json 的 difficultyBonus），用於 F-2 部署數 */
  readonly difficultyBonus: number;
  /** 明確教學戰鬥才套有限波次；一般戰鬥維持原公式與 Boss 親衛隊。 */
  readonly tutorialBattle?: boolean;
  spawnEnemyUnit(type: TroopType, lane: number, depth: number, unitName?: string): void;
  isCellMovementBlocked(lane: number, depth: number): boolean;
  /** 戰報提示（親衛隊現身）；測試替身可不實作 */
  announce?(line: string): void;
  /** 教學引導：寫進戰報並跳畫面提示；測試替身可不實作 */
  guide?(line: string): void;
  /** 已經提醒過「沒人守」的路線；由控制器保管，整場共用，免得同一路每回合洗版（PROG-2-9349） */
  readonly leakHintedLanes?: Set<number>;
  /** 守城戰每回合補派工兵隊數（PROG-2-9429）；非守城或未設定為 0 */
  readonly defenseEngineerReinforce?: number;
  /** 補派選路同數時的亂數；缺省取第一條 */
  readonly random?: () => number;
}

export function executeBattleEnemyDeployPhase(context: BattleEnemyDeployPhaseContext): void {
  // 教學限定：出兵數照 GAME_CONFIG.tutorialEnemyDeployByTurn 的波次表，表外的回合不再補兵。
  // 不改兵種數值、主將、基地血量或一般戰鬥難度公式。
  const deployCount = context.tutorialBattle
    ? (GAME_CONFIG.tutorialEnemyDeployByTurn[context.turn - 1] ?? 0)
    : getAIDeployCount({ difficultyBonus: context.difficultyBonus }, context.turn);
  const meetPlayerLane = !!context.tutorialBattle && GAME_CONFIG.tutorialEnemyMeetsPlayerLane;
  // 教學戰的波次表就是劇本：出兵數不再被敵軍糧草卡住，否則表上寫 8 隊實際只出得了 6 隊（PROG-2-9346）
  const deployBudget = context.tutorialBattle ? Number.POSITIVE_INFINITY : context.turnManager.enemyFood;
  const decisions = context.enemyAi.decideDeploy(context.state, deployBudget, deployCount, { meetPlayerLane });
  const spawnedLanes: number[] = [];
  const deployDepth = GAME_CONFIG.GRID_DEPTH - 1;
  if (!context.tutorialBattle) summonBossGuard(context, deployDepth);

  for (const decision of decisions) {
    if (context.state.getCell(decision.lane, deployDepth)?.occupantId) continue;
    if (context.isCellMovementBlocked(decision.lane, deployDepth)) continue;

    context.spawnEnemyUnit(decision.type, decision.lane, deployDepth);
    context.turnManager.enemyFood = Math.max(0, context.turnManager.enemyFood - TROOP_DEPLOY_COST[decision.type]);
    spawnedLanes.push(decision.lane);
  }
  reinforceDefenseEngineers(context, deployDepth);
  // 教學引導：告訴新玩家敵軍從哪一路來、要在同一路正面迎擊（PROG-2-9340）
  if (context.tutorialBattle && spawnedLanes.length > 0) context.guide?.(tutorialEnemyLaneHintLine(spawnedLanes));
  // 教學引導：敵軍所在的路上我方一隊都沒有，就提醒補防。敵軍出兵後、玩家下一次部署前就跳，還來得及攔（PROG-2-9349）
  if (context.tutorialBattle && context.leakHintedLanes && context.state.units) {
    const open = unguardedEnemyLanes(context.state.units.values());
    for (const lane of Array.from(context.leakHintedLanes)) if (!open.includes(lane)) context.leakHintedLanes.delete(lane);
    const fresh = open.filter((lane) => !context.leakHintedLanes!.has(lane));
    for (const lane of fresh) context.leakHintedLanes.add(lane);
    if (fresh.length > 0) context.guide?.(tutorialUnguardedLaneHintLine(fresh));
  }
}

/** 守城補派工兵（PROG-2-9429）：派到我方部隊最少、且部署格空著的路；不扣敵軍糧草 */
function reinforceDefenseEngineers(context: BattleEnemyDeployPhaseContext, deployDepth: number): void {
  const count = context.defenseEngineerReinforce ?? 0;
  if (count <= 0 || context.tutorialBattle || context.state.siegeDefender !== Faction.Player) return;
  for (let i = 0; i < count; i++) {
    const playerCount = new Array<number>(GAME_CONFIG.GRID_LANES).fill(0);
    for (const [, unit] of context.state.units) {
      if (unit.faction === Faction.Player && !unit.isDead() && unit.lane >= 0 && unit.lane < GAME_CONFIG.GRID_LANES) playerCount[unit.lane] += 1;
    }
    const open: number[] = [];
    for (let lane = 0; lane < GAME_CONFIG.GRID_LANES; lane++) {
      if (!context.state.getCell(lane, deployDepth)?.occupantId && !context.isCellMovementBlocked(lane, deployDepth)) open.push(lane);
    }
    const lane = pickDefenseReinforceLane(open, playerCount, context.random ?? (() => 0));
    if (lane === null) return;
    context.spawnEnemyUnit(TroopType.Engineer, lane, deployDepth);
    context.state.defenseEngineersReinforced += 1;
  }
}

/** 有敵軍、但我方一隊都沒有的路線（由小到大）。陣亡的不算；我方武將棋子站在那一路也算有人守。 */
export function unguardedEnemyLanes(units: Iterable<{ faction: Faction; lane: number; isDead?: () => boolean }>): number[] {
  const enemy = new Set<number>(), own = new Set<number>();
  for (const unit of units) {
    if (unit.isDead?.()) continue;
    (unit.faction === Faction.Enemy ? enemy : own).add(unit.lane);
  }
  return Array.from(enemy).filter((lane) => !own.has(lane)).sort((a, b) => a - b);
}

/** 教學戰空路提示。路線以 1 起算。 */
export function tutorialUnguardedLaneHintLine(lanes: readonly number[]): string {
  const names = [...lanes].sort((a, b) => a - b).map((lane) => `第 ${lane + 1} 路`).join('、');
  return `${names}沒人守，敵軍正逼近主將！派兵到這一路攔截`;
}

/** 教學戰敵軍出兵提示。路線以 1 起算，由小到大列出。 */
export function tutorialEnemyLaneHintLine(lanes: readonly number[]): string {
  const names = [...lanes].sort((a, b) => a - b).map((lane) => `第 ${lane + 1} 路`).join('、');
  return `敵軍從${names}來襲！部隊只打同一路正面的敵人，派剋制的兵種到同一路迎擊`;
}

/**
 * Boss 親衛隊（關卡設計系統「Boss AI 與特殊挑戰機制」，PROG-2-1862）：
 * 敵方主將為 Boss 且血量降到一半以下時，本場一次，在敵方後排最靠中間的空格生成親衛隊。
 */
function summonBossGuard(context: BattleEnemyDeployPhaseContext, depth: number): void {
  const general = context.state.getGeneral(Faction.Enemy);
  if (!general || general.isDead()) return;
  const isBoss = isBossGuardGeneral(general.id, general.name);
  if (!isBossGuardSummonDue(general.currentHp, general.maxHp, isBoss, context.state.bossGuardSummoned)) return;
  context.state.bossGuardSummoned = true;

  const freeLanes: number[] = [];
  for (let lane = 0; lane < GAME_CONFIG.GRID_LANES; lane++) {
    if (context.state.getCell(lane, depth)?.occupantId) continue;
    if (context.isCellMovementBlocked(lane, depth)) continue;
    freeLanes.push(lane);
  }
  for (const lane of bossGuardLanes(freeLanes, GAME_CONFIG.GRID_LANES)) {
    context.spawnEnemyUnit(BOSS_GUARD_TROOP, lane, depth, BOSS_GUARD_UNIT_NAME);
  }
  context.announce?.(bossGuardSummonLine(general.name));
}
