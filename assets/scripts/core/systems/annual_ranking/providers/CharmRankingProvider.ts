/**
 * 紅顏表演魅力榜 Provider（PROG-2-9601）
 * 遵循 doc_spec_1284 §3.3 公式（雙軌熱度＋全國武將分群投票、總票數封頂 9999）
 */

import { AnnualGeneralLedger } from '../AnnualGeneralLedger';
import { BoardConfig, RankingContext, RankingEvidence } from '../AnnualRankingTypes';
import { IRankingBoardProvider } from '../RankingBoardRegistry';

export class CharmRankingProvider implements IRankingBoardProvider {
  public readonly boardId: string = 'charm';
  public readonly evaluatorKey: string = 'charm';

  public isEligible(generalId: string, context: RankingContext, config: BoardConfig): boolean {
    return true;
  }

  public evaluate(
    generalId: string,
    ledger: AnnualGeneralLedger,
    context: RankingContext,
    config: BoardConfig
  ): number {
    const maxTotalVotes = config.maxTotalVotes || 9999;
    const hypeDivisor = config.hypeDivisor || 50;
    const maxSingleGeneralVotes = config.maxSingleGeneralVotes || 50;

    const totalHype = ledger.getMetric(generalId, 'charm.totalHype');
    if (totalHype <= 0) {
      return 0;
    }

    // 取得候選武將的魅力數值（CHA，基準 50~100）
    let cha = 70;
    if (context.generals) {
      const info = context.generals instanceof Map ? context.generals.get(generalId) : context.generals[generalId];
      if (info && info.cha !== undefined) {
        cha = info.cha;
      }
    }

    const chaFactor = 1 + cha / 100;
    const baseVotePerGeneral = Math.min(maxSingleGeneralVotes, Math.max(0, (totalHype / hypeDivisor) * chaFactor));

    // 模擬全國存活武將的投票數
    let totalVotes = 0;
    if (context.generals) {
      const count = context.generals instanceof Map ? context.generals.size : Object.keys(context.generals).length;
      // 假設投票群體約 10~150 人
      const voterCount = Math.max(10, Math.min(150, count));
      // Persona 共振微幅隨機因子（確定性加權）
      for (let i = 0; i < voterCount; i++) {
        // 使用確定性權重
        const matchWeight = 0.8 + ((i * 7 + cha) % 5) * 0.1; // 0.8 ~ 1.2
        const vote = Math.min(maxSingleGeneralVotes, Math.round(baseVotePerGeneral * matchWeight));
        totalVotes += vote;
      }
    } else {
      // 預設基礎群眾投票
      totalVotes = Math.round(baseVotePerGeneral * 25);
    }

    return Math.min(maxTotalVotes, totalVotes);
  }

  public buildEvidence(
    generalId: string,
    ledger: AnnualGeneralLedger,
    score: number,
    context: RankingContext,
    config: BoardConfig
  ): RankingEvidence {
    const highlights = ledger.getHighlights(generalId);
    let topPlay = '鳳儀亭';
    let maxHype = 0;

    for (const h of highlights) {
      if (h.meta && h.meta.playTitle) {
        const hVal = h.value || 0;
        if (hVal > maxHype) {
          maxHype = hVal;
          topPlay = h.meta.playTitle;
        }
      }
    }

    const totalHype = ledger.getMetric(generalId, 'charm.totalHype');
    const summary = `年度總演藝與交際熱度 ${Math.round(totalHype)}，代表演出劇目《${topPlay}》，吸粉狂攬 ${score} 票。`;

    return {
      summary,
      highlightKey: 'charm.totalHype',
      highlightValue: totalHype,
      meta: {
        totalHype,
        topPlay,
        votes: score
      }
    };
  }
}
