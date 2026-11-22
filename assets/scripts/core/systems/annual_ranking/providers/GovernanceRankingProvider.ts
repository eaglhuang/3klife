/**
 * 治理貢獻排行榜 Provider（PROG-2-9601）
 * 遵循 doc_spec_1284 §3.2 公式（四季累積、單季上限 800、全年上限 3200、公務加權與自告奮勇）
 */

import { AnnualGeneralLedger } from '../AnnualGeneralLedger';
import { BoardConfig, RankingContext, RankingEvidence } from '../AnnualRankingTypes';
import { IRankingBoardProvider } from '../RankingBoardRegistry';

export class GovernanceRankingProvider implements IRankingBoardProvider {
  public readonly boardId: string = 'governance';
  public readonly evaluatorKey: string = 'governance';

  public isEligible(generalId: string, context: RankingContext, config: BoardConfig): boolean {
    return true;
  }

  public evaluate(
    generalId: string,
    ledger: AnnualGeneralLedger,
    context: RankingContext,
    config: BoardConfig
  ): number {
    const maxQuarterScore = config.maxQuarterScore || 800;
    const maxAnnualScore = config.maxAnnualScore || 3200;
    const taskWeights: Record<string, number> = config.taskWeights || {
      agriculture: 1.0,
      commerce: 1.0,
      recruitment: 1.0,
      diplomacy: 1.6,
      espionage: 1.6
    };
    const defaultTaskWeight = config.defaultTaskWeight || 1.0;
    const effClampMin = config.effClampMin !== undefined ? config.effClampMin : 0.6;
    const effClampMax = config.effClampMax !== undefined ? config.effClampMax : 1.3;
    const volunteeredMultiplier = config.volunteeredMultiplier || 1.2;

    const highlights = ledger.getHighlights(generalId);
    const quarterTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

    for (const h of highlights) {
      if (h.meta && h.meta.taskType !== undefined && h.meta.output !== undefined) {
        const q = h.meta.quarter || 1;
        const taskType = h.meta.taskType as string;
        const output = h.meta.output || 0;
        const rawEff = h.meta.effRate !== undefined ? h.meta.effRate : 1.0;
        const isVolunteered = !!h.meta.isVolunteered;

        const wTask = taskWeights[taskType] !== undefined ? taskWeights[taskType] : defaultTaskWeight;
        const mEff = Math.min(Math.max(rawEff, effClampMin), effClampMax);
        const mVol = isVolunteered ? volunteeredMultiplier : 1.0;

        const taskScore = output * wTask * mEff * mVol;
        quarterTotals[q] = (quarterTotals[q] || 0) + taskScore;
      }
    }

    // 若 highlights 稀疏但有總數 fallback
    let totalScore = 0;
    let hasQuarterData = false;
    for (let q = 1; q <= 4; q++) {
      if (quarterTotals[q] > 0) {
        hasQuarterData = true;
        totalScore += Math.min(maxQuarterScore, Math.round(quarterTotals[q]));
      }
    }

    if (!hasQuarterData) {
      const fallbackOutput = ledger.getMetric(generalId, 'gov.totalOutput');
      if (fallbackOutput > 0) {
        totalScore = Math.min(maxAnnualScore, Math.round(fallbackOutput));
      }
    }

    return Math.min(maxAnnualScore, totalScore);
  }

  public buildEvidence(
    generalId: string,
    ledger: AnnualGeneralLedger,
    score: number,
    context: RankingContext,
    config: BoardConfig
  ): RankingEvidence {
    const totalOutput = ledger.getMetric(generalId, 'gov.totalOutput');
    const highlights = ledger.getHighlights(generalId);
    let topTask = '政務處分';
    let maxTaskOutput = 0;

    for (const h of highlights) {
      if (h.meta && h.meta.output && h.meta.output > maxTaskOutput) {
        maxTaskOutput = h.meta.output;
        topTask = h.meta.taskType || topTask;
      }
    }

    const summary = `年度政務總產出 ${totalOutput}，主要功勳：${topTask}，四季治理綜評得分 ${score} 分。`;

    return {
      summary,
      highlightKey: 'gov.totalOutput',
      highlightValue: totalOutput,
      meta: {
        totalOutput,
        topTask,
        score
      }
    };
  }
}
