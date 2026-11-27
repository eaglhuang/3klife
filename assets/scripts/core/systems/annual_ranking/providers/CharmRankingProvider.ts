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
    // 紅顏榜只排女將；沒帶性別資料的呼叫端（舊流程）維持不限
    const info = context.generals instanceof Map ? context.generals.get(generalId) : context.generals?.[generalId];
    return !info?.gender || info.gender === 'F';
  }

  public evaluate(
    generalId: string,
    ledger: AnnualGeneralLedger,
    context: RankingContext,
    config: BoardConfig
  ): number {
    const maxTotalVotes = config.maxTotalVotes;
    const hypeDivisor = config.hypeDivisor;
    const maxSingleGeneralVotes = config.maxSingleGeneralVotes;
    const voterMin = config.voterMin ?? 10;
    const voterMax = config.voterMax ?? 150;
    const mwBase = config.matchWeightBase ?? 0.8;
    const mwStep = config.matchWeightStep ?? 0.1;
    const mwBuckets = config.matchWeightBuckets ?? 5;
    const mwSeedMul = config.matchWeightSeedMul ?? 7;

    const totalHype = ledger.getMetric(generalId, 'charm.totalHype');
    if (totalHype <= 0) {
      return 0;
    }

    // 取得候選武將的魅力數值（CHA，基準 50~100）
    let cha = config.defaultCha !== undefined ? config.defaultCha : 70;
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
      const voterCount = Math.max(voterMin, Math.min(voterMax, count));
      // Persona 共振微幅隨機因子（確定性加權）
      for (let i = 0; i < voterCount; i++) {
        // 使用確定性權重
        const matchWeight = mwBase + ((i * mwSeedMul + cha) % mwBuckets) * mwStep;
        const vote = Math.min(maxSingleGeneralVotes, Math.round(baseVotePerGeneral * matchWeight));
        totalVotes += vote;
      }
    } else {
      // 預設基礎群眾投票
      totalVotes = Math.round(baseVotePerGeneral * (config.fallbackVoterMultiplier ?? 25));
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
    let topPlay = config.fallbackTopPlayTitle ?? '';
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
