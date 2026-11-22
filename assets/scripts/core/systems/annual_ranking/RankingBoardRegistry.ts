/**
 * 史境天下風雲榜可插拔註冊表與評分引擎（PROG-2-9601）
 * 遵循四層架構之「純邏輯計算註冊表」，實現完全插件化擴充（TC-RNK-03）
 */

import { AnnualGeneralLedger } from './AnnualGeneralLedger';
import {
  BoardConfig,
  BoardRankResult,
  RankingCandidate,
  RankingContext,
  RankingEvidence,
  RankTrend,
  LobbyBoardPreview,
  LobbyPreviewEntry
} from './AnnualRankingTypes';

export interface IRankingBoardProvider {
  readonly boardId: string;
  readonly evaluatorKey: string;

  /**
   * 判定武將是否符合該榜單參評資格
   */
  isEligible(generalId: string, context: RankingContext, config: BoardConfig): boolean;

  /**
   * 計算該武將在本榜單之年度得分
   */
  evaluate(generalId: string, ledger: AnnualGeneralLedger, context: RankingContext, config: BoardConfig): number;

  /**
   * 生成該武將在本榜單之因果事蹟亮點與評語證據（無 LLM，結構化數據提取）
   */
  buildEvidence(
    generalId: string,
    ledger: AnnualGeneralLedger,
    score: number,
    context: RankingContext,
    config: BoardConfig
  ): RankingEvidence;
}

export class RankingBoardRegistry {
  private static _instance: RankingBoardRegistry | null = null;
  private _providers: Map<string, IRankingBoardProvider> = new Map();

  public static getInstance(): RankingBoardRegistry {
    if (!this._instance) {
      this._instance = new RankingBoardRegistry();
    }
    return this._instance;
  }

  public static resetInstance(): void {
    this._instance = null;
  }

  /**
   * 註冊榜單 Provider（TC-RNK-03，動態插拔）
   */
  public registerProvider(provider: IRankingBoardProvider): void {
    this._providers.set(provider.boardId, provider);
  }

  public getProvider(boardId: string): IRankingBoardProvider | undefined {
    return this._providers.get(boardId);
  }

  public getAllProviders(): IRankingBoardProvider[] {
    return Array.from(this._providers.values());
  }

  /**
   * 評估單一榜單名次與趨勢
   */
  public evaluateBoard(
    boardConfig: BoardConfig,
    candidateIds: string[],
    ledger: AnnualGeneralLedger,
    context: RankingContext
  ): BoardRankResult {
    const provider = this._providers.get(boardConfig.boardId);
    if (!provider) {
      return {
        boardId: boardConfig.boardId,
        year: context.year,
        quarter: context.quarter,
        candidates: [],
        isYearEndFinal: context.quarter === 4
      };
    }

    const scoredList: Array<{
      generalId: string;
      score: number;
      evidence: RankingEvidence;
      isPlayerOwned: boolean;
    }> = [];

    const prevYearBoardRanks = context.previousYearRanks?.[boardConfig.boardId] || {};

    for (const id of candidateIds) {
      if (!provider.isEligible(id, context, boardConfig)) {
        continue;
      }
      const score = provider.evaluate(id, ledger, context, boardConfig);
      if (score <= 0) {
        continue;
      }
      const evidence = provider.buildEvidence(id, ledger, score, context, boardConfig);

      let isPlayerOwned = false;
      if (context.generals) {
        const info = context.generals instanceof Map ? context.generals.get(id) : context.generals[id];
        if (info && info.isPlayerFaction) {
          isPlayerOwned = true;
        } else if (info && context.playerFactionId && info.factionId === context.playerFactionId) {
          isPlayerOwned = true;
        }
      }

      scoredList.push({
        generalId: id,
        score,
        evidence,
        isPlayerOwned
      });
    }

    // 由高至低排序；同分時依武將 ID 穩定排序
    scoredList.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.generalId.localeCompare(b.generalId);
    });

    const candidates: RankingCandidate[] = scoredList.map((item, index) => {
      const rank = index + 1;
      const prevRank = prevYearBoardRanks[item.generalId];

      let trend: RankTrend = 'NEW';
      let trendDelta: number | undefined = undefined;

      if (prevRank !== undefined && prevRank > 0) {
        if (prevRank === rank) {
          trend = 'EQUAL';
          trendDelta = 0;
        } else if (prevRank > rank) {
          trend = 'UP';
          trendDelta = prevRank - rank; // 上升 N 名
        } else {
          trend = 'DOWN';
          trendDelta = rank - prevRank; // 下降 N 名
        }
      }

      return {
        generalId: item.generalId,
        score: item.score,
        rank,
        evidence: item.evidence,
        previousRank: prevRank,
        trend,
        trendDelta,
        isPlayerOwned: item.isPlayerOwned
      };
    });

    return {
      boardId: boardConfig.boardId,
      year: context.year,
      quarter: context.quarter,
      candidates,
      isYearEndFinal: context.quarter === 4
    };
  }

  /**
   * 批次評估所有榜單
   */
  public evaluateAll(
    configs: BoardConfig[],
    candidateIds: string[],
    ledger: AnnualGeneralLedger,
    context: RankingContext
  ): Record<string, BoardRankResult> {
    const results: Record<string, BoardRankResult> = {};
    for (const config of configs) {
      if (!config.enabled) continue;
      results[config.boardId] = this.evaluateBoard(config, candidateIds, ledger, context);
    }
    return results;
  }

  /**
   * 平時大廳即時風雲榜入口資料過濾（使用者 11/22 裁決）：
   * 平時僅展示各榜前 3 名 ＋ 玩家自己武將名次。
   * 4～10 名與其餘名單保留至年終正式盛典揭曉。
   */
  public static filterLobbyPreview(
    boardResult: BoardRankResult,
    playerGeneralIds: string[],
    titleKey: string = ''
  ): LobbyBoardPreview {
    const playerSet = new Set(playerGeneralIds);
    const topThree: LobbyPreviewEntry[] = [];
    let playerSelf: LobbyPreviewEntry | undefined = undefined;

    for (const c of boardResult.candidates) {
      const isPlayer = c.isPlayerOwned || playerSet.has(c.generalId);

      if (c.rank <= 3) {
        topThree.push({
          generalId: c.generalId,
          rank: c.rank,
          score: c.score,
          evidenceSummary: c.evidence?.summary,
          trend: c.trend,
          trendDelta: c.trendDelta,
          isPlayerOwned: isPlayer
        });
      }

      // 找出玩家在該榜中最佳排名的武將
      if (isPlayer && !playerSelf) {
        playerSelf = {
          generalId: c.generalId,
          rank: c.rank,
          score: c.score,
          evidenceSummary: c.evidence?.summary,
          trend: c.trend,
          trendDelta: c.trendDelta,
          isPlayerOwned: true
        };
      }
    }

    return {
      boardId: boardResult.boardId,
      titleKey,
      topThree,
      playerSelf,
      totalCandidates: boardResult.candidates.length,
      isYearEndRevealed: boardResult.isYearEndFinal
    };
  }
}
