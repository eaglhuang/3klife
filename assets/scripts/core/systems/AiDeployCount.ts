// @spec-source → AI武將強度系統.md F-2 AI 部署節奏公式（PROG-2-1324，WBS AIS-05 第一段）
/**
 * AiDeployCount — AI 每回合部署數（純邏輯，不依賴 cc）
 *
 * 公式：min(3, 1 + floor(回合 / 5) + 難度加成)。每 5 回合多部署 1 支，難度加成取自難度表 difficultyBonus。
 * 回合小於 1 視為 0（第一回合也至少部署 1 支）。
 *
 * Unity 對照：像 Spawner 的 SpawnRate 曲線，依 Wave 數與難度 ScriptableObject 算出這一波要生成的數量，再用上限夾住。
 */
import type { AiDifficultyEntry } from './AiDifficultyTable';

/** 規格 F-2：每回合部署數上限 */
export const AI_DEPLOY_COUNT_CAP = 3;

/** 規格 F-2：每 5 回合增加 1 */
const AI_DEPLOY_TURNS_PER_BONUS = 5;

export function getAIDeployCount(difficulty: Pick<AiDifficultyEntry, 'difficultyBonus'>, turn: number): number {
    const safeTurn = Math.max(0, Math.floor(turn));
    const turnBonus = Math.floor(safeTurn / AI_DEPLOY_TURNS_PER_BONUS);
    return Math.min(AI_DEPLOY_COUNT_CAP, 1 + turnBonus + difficulty.difficultyBonus);
}
