// @spec-source → 戰場部署系統.md (doc_spec_0040)、demo_技術架構.md (doc_tech_0015)；PROG-2-1429 依建檔紀錄補標出處
import { Faction, GAME_CONFIG, TROOP_DEPLOY_COST, type TroopType } from '../../../core/config/Constants';
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
  spawnEnemyUnit(type: TroopType, lane: number, depth: number, unitName?: string): void;
  isCellMovementBlocked(lane: number, depth: number): boolean;
  /** 戰報提示（親衛隊現身）；測試替身可不實作 */
  announce?(line: string): void;
}

export function executeBattleEnemyDeployPhase(context: BattleEnemyDeployPhaseContext): void {
  const deployCount = getAIDeployCount({ difficultyBonus: context.difficultyBonus }, context.turn);
  const decisions = context.enemyAi.decideDeploy(context.state, context.turnManager.enemyFood, deployCount);
  const deployDepth = GAME_CONFIG.GRID_DEPTH - 1;
  summonBossGuard(context, deployDepth);

  for (const decision of decisions) {
    if (context.state.getCell(decision.lane, deployDepth)?.occupantId) continue;
    if (context.isCellMovementBlocked(decision.lane, deployDepth)) continue;

    context.spawnEnemyUnit(decision.type, decision.lane, deployDepth);
    context.turnManager.enemyFood = Math.max(0, context.turnManager.enemyFood - TROOP_DEPLOY_COST[decision.type]);
  }
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
