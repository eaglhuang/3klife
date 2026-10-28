import { GAME_CONFIG, TROOP_DEPLOY_COST, type TroopType } from '../../../core/config/Constants';
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
  spawnEnemyUnit(type: TroopType, lane: number, depth: number): void;
  isCellMovementBlocked(lane: number, depth: number): boolean;
}

export function executeBattleEnemyDeployPhase(context: BattleEnemyDeployPhaseContext): void {
  const deployCount = getAIDeployCount({ difficultyBonus: context.difficultyBonus }, context.turn);
  const decisions = context.enemyAi.decideDeploy(context.state, context.turnManager.enemyFood, deployCount);
  const deployDepth = GAME_CONFIG.GRID_DEPTH - 1;

  for (const decision of decisions) {
    if (context.state.getCell(decision.lane, deployDepth)?.occupantId) continue;
    if (context.isCellMovementBlocked(decision.lane, deployDepth)) continue;

    context.spawnEnemyUnit(decision.type, decision.lane, deployDepth);
    context.turnManager.enemyFood = Math.max(0, context.turnManager.enemyFood - TROOP_DEPLOY_COST[decision.type]);
  }
}