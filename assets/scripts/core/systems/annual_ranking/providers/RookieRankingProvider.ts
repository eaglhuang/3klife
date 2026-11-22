/**
 * 年度最佳新人王 Provider（PROG-2-9601）
 * 遵循 doc_spec_1284 §3.5（出道當年限定、終身參選一次、綜合戰功/治理/魅力/奇才加成）
 */

import { AnnualGeneralLedger } from '../AnnualGeneralLedger';
import { BoardConfig, RankingContext, RankingEvidence } from '../AnnualRankingTypes';
import { IRankingBoardProvider } from '../RankingBoardRegistry';

export class RookieRankingProvider implements IRankingBoardProvider {
  public readonly boardId: string = 'rookie';
  public readonly evaluatorKey: string = 'rookie';

  public isEligible(generalId: string, context: RankingContext, config: BoardConfig): boolean {
    const maxAge = config.maxAge;
    if (!context.generals) {
      return true;
    }

    const info = context.generals instanceof Map ? context.generals.get(generalId) : context.generals[generalId];
    if (!info) return true;

    // 當年結業出仕，或當年新仕官且年齡 <= 22
    if (info.isGraduateThisYear) {
      return true;
    }

    if (info.debutYear !== undefined && info.debutYear === context.year) {
      if (info.age !== undefined && info.age <= maxAge) {
        return true;
      }
    }

    // 若未特別註記 debutYear 但標記為新人
    if (info.age !== undefined && info.age <= 18) {
      return true;
    }

    return false;
  }

  public evaluate(
    generalId: string,
    ledger: AnnualGeneralLedger,
    context: RankingContext,
    config: BoardConfig
  ): number {
    const prodigyBonus = config.prodigyBonus;
    const debutBaseMin = config.debutBaseMin;
    const debutBaseMax = config.debutBaseMax;
    const weights = config.scoreWeights;

    let info: any = undefined;
    if (context.generals) {
      info = context.generals instanceof Map ? context.generals.get(generalId) : context.generals[generalId];
    }

    // 出道基礎分 S_debut (依據四維或結業評級，50~350)
    let debutBase = 150;
    let isProdigy = false;
    if (info) {
      isProdigy = !!info.isProdigy;
      const totalAttr = (info.cha || 60) + (info.int || 60) + (info.pol || 60) + (info.lea || 60);
      debutBase = Math.min(debutBaseMax, Math.max(debutBaseMin, Math.round(totalAttr / 2)));
    }

    // 戰功、治理、魅力等各項累積指標
    const killsTotal = ledger.getMetric(generalId, 'kills.total');
    const killsScore = Math.round(killsTotal / 10); // 簡易折算

    const govTotal = ledger.getMetric(generalId, 'gov.totalOutput');
    const govScore = Math.round(govTotal / 2);

    const charmHype = ledger.getMetric(generalId, 'charm.totalHype');
    const charmVoteScore = Math.round(charmHype / 5);

    const prodigyAdd = isProdigy ? prodigyBonus : 0;

    const totalRookieScore = Math.round(
      debutBase * (weights.debut || 1.0) +
      killsScore * (weights.kills || 1.0) +
      govScore * (weights.governance || 1.0) +
      charmVoteScore * (weights.charmVotes || 0.8) +
      prodigyAdd
    );

    return Math.max(0, totalRookieScore);
  }

  public buildEvidence(
    generalId: string,
    ledger: AnnualGeneralLedger,
    score: number,
    context: RankingContext,
    config: BoardConfig
  ): RankingEvidence {
    let info: any = undefined;
    if (context.generals) {
      info = context.generals instanceof Map ? context.generals.get(generalId) : context.generals[generalId];
    }

    const isGrad = info?.isGraduateThisYear ? '太學及第' : '初出茅廬';
    const isProdigy = info?.isProdigy ? '（世家天驕）' : '';
    const summary = `${isGrad}${isProdigy}，出仕首年綜合成績斬獲 ${score} 分，展露少年英雄氣象！`;

    return {
      summary,
      highlightKey: 'rookie.totalScore',
      highlightValue: score,
      meta: {
        score,
        isGraduate: !!info?.isGraduateThisYear,
        isProdigy: !!info?.isProdigy
      }
    };
  }
}
