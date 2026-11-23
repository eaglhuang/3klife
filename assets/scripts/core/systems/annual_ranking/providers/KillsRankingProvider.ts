/**
 * 斬將殺敵巔峰榜 Provider（PROG-2-9601）
 * 遵循 doc_spec_1284 §3.1 公式與戰場一致性（手動、極速決戰、委託代打同一套記帳）
 */

import { AnnualGeneralLedger } from '../AnnualGeneralLedger';
import { BoardConfig, RankingContext, RankingEvidence } from '../AnnualRankingTypes';
import { IRankingBoardProvider } from '../RankingBoardRegistry';

export class KillsRankingProvider implements IRankingBoardProvider {
  public readonly boardId: string = 'kills';
  public readonly evaluatorKey: string = 'kills';

  public isEligible(generalId: string, context: RankingContext, config: BoardConfig): boolean {
    // 存活武將皆有資格參選殺敵榜
    return true;
  }

  public evaluate(
    generalId: string,
    ledger: AnnualGeneralLedger,
    context: RankingContext,
    config: BoardConfig
  ): number {
    const highlights = ledger.getHighlights(generalId);
    const maxSingleBattleScore = config.maxSingleBattleScore;
    const killsDivisor = config.killsDivisor;
    const baseEnemyPowerRef = config.baseEnemyPowerRef;
    const powerClampMin = config.powerClampMin;
    const powerClampMax = config.powerClampMax;
    const leadMultiplier = config.leadMultiplier;
    const duelBonuses = config.duelBonuses;

    let totalScore = 0;

    // 從 highlights 中提取每場戰鬥明細
    for (const h of highlights) {
      if (h.meta && h.meta.enemyPower !== undefined && h.meta.kills !== undefined) {
        const rawEnemyPower = h.meta.enemyPower || 0;
        const kills = h.meta.kills || 0;
        const duelTier = (h.meta.duelTier as string) || 'none';
        const isCommander = !!h.meta.isCommander;

        // clamp(EnemyPower / baseEnemyPowerRef, min, max)
        const powerRatio = baseEnemyPowerRef > 0 ? rawEnemyPower / baseEnemyPowerRef : 1.0;
        const clampedPower = Math.min(Math.max(powerRatio, powerClampMin), powerClampMax);

        const duelBonus = duelBonuses[duelTier] || 0;
        const commanderFactor = isCommander ? leadMultiplier : 1.0;

        // ((kills / 100) * clampedPower + duelBonus) * commanderFactor
        const rawBattleScore = ((kills / killsDivisor) * clampedPower + duelBonus) * commanderFactor;
        const battleScore = Math.min(maxSingleBattleScore, Math.round(rawBattleScore));

        totalScore += battleScore;
      }
    }

    // 若 highlights 稀疏但有總數（向下相容 fallback）
    if (totalScore === 0) {
      const totalKills = ledger.getMetric(generalId, 'kills.total');
      if (totalKills > 0) {
        const maxEnemyPower = ledger.getMetric(generalId, 'kills.maxEnemyPower') || baseEnemyPowerRef;
        const powerRatio = maxEnemyPower / baseEnemyPowerRef;
        const clampedPower = Math.min(Math.max(powerRatio, powerClampMin), powerClampMax);
        totalScore = Math.round((totalKills / killsDivisor) * clampedPower);
      }
    }

    return totalScore;
  }

  public buildEvidence(
    generalId: string,
    ledger: AnnualGeneralLedger,
    score: number,
    context: RankingContext,
    config: BoardConfig
  ): RankingEvidence {
    const totalKills = ledger.getMetric(generalId, 'kills.total');
    const highlights = ledger.getHighlights(generalId);
    let maxEnemy = 0;
    let duelCount = 0;

    for (const h of highlights) {
      if (h.meta) {
        if (h.meta.enemyPower && h.meta.enemyPower > maxEnemy) {
          maxEnemy = h.meta.enemyPower;
        }
        if (h.meta.duelTier && h.meta.duelTier !== 'none') {
          duelCount++;
        }
      }
    }

    const summary = `年度總殺敵 ${totalKills} 兵，克敵最高戰力 ${maxEnemy}，斬將擊破 ${duelCount} 次，累積戰功 ${score} 分。`;

    return {
      summary,
      highlightKey: 'kills.total',
      highlightValue: totalKills,
      meta: {
        totalKills,
        maxEnemyPower: maxEnemy,
        duelCount,
        score
      }
    };
  }
}
