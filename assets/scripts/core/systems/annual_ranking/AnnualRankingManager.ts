/**
 * 史境天下風雲榜總控管理器（PROG-2-9601）
 * 職責：
 * 1. 載入並管理 annual-ranking-config.json 配置
 * 2. 初始化核心帳本與 4 大首發 Provider
 * 3. 匯總平時大廳即時看板資料（前 3 名 ＋ 自家名次）
 * 4. 執行年終完整結算與年度輪替
 */

import { AnnualGeneralLedger, LedgerSerializedData } from './AnnualGeneralLedger';
import {
  AnnualRankingConfig,
  BoardConfig,
  BoardRankResult,
  LobbyBoardPreview,
  RankingContext
} from './AnnualRankingTypes';
import { RankingBoardRegistry } from './RankingBoardRegistry';
import { KillsRankingProvider } from './providers/KillsRankingProvider';
import { GovernanceRankingProvider } from './providers/GovernanceRankingProvider';
import { CharmRankingProvider } from './providers/CharmRankingProvider';
import { RookieRankingProvider } from './providers/RookieRankingProvider';

export class AnnualRankingManager {
  private static _instance: AnnualRankingManager | null = null;
  private _config: AnnualRankingConfig | null = null;
  private _ledger: AnnualGeneralLedger;
  private _registry: RankingBoardRegistry;
  private _previousYearRanks: Record<string, Record<string, number>> = {};

  constructor(config?: AnnualRankingConfig, ledger?: AnnualGeneralLedger) {
    this._ledger = ledger || new AnnualGeneralLedger(1);
    this._registry = RankingBoardRegistry.getInstance();
    if (config) {
      this._config = config;
    }
    this.registerDefaultProviders();
    if (!AnnualRankingManager._instance) {
      AnnualRankingManager._instance = this;
    }
  }

  public static getInstance(config?: AnnualRankingConfig): AnnualRankingManager {
    if (!this._instance) {
      this._instance = new AnnualRankingManager(config);
    } else if (config) {
      this._instance.setConfig(config);
    }
    return this._instance;
  }

  public static resetInstance(): void {
    this._instance = null;
    RankingBoardRegistry.resetInstance();
  }

  public setConfig(config: AnnualRankingConfig): void {
    this._config = config;
  }

  public getConfig(): AnnualRankingConfig | null {
    return this._config;
  }

  public get ledger(): AnnualGeneralLedger {
    return this._ledger;
  }

  public get registry(): RankingBoardRegistry {
    return this._registry;
  }

  /**
   * 演藝熱度記帳（衰減參數取自 annual-ranking-config.json 的 charm 榜單，不硬編碼）
   */
  public recordCharmPerformance(
    generalId: string,
    playTitle: string,
    theaterPrestige: number,
    playHeat: number,
    repeatCount: number = 0,
    banquetDiploHype: number = 0
  ): void {
    const charm = this._config?.boards.find((b) => b.boardId === 'charm');
    this._ledger.recordCharmPerformance(
      generalId, playTitle, theaterPrestige, playHeat, repeatCount, banquetDiploHype,
      charm?.repeatDecayMin, charm?.repeatDecayStep
    );
  }

  /**
   * 註冊預設首發 4 大榜單 Provider
   */
  public registerDefaultProviders(): void {
    this._registry.registerProvider(new KillsRankingProvider());
    this._registry.registerProvider(new GovernanceRankingProvider());
    this._registry.registerProvider(new CharmRankingProvider());
    this._registry.registerProvider(new RookieRankingProvider());
  }

  /**
   * 取得啟用中的榜單配置清單
   */
  public getActiveBoardConfigs(): BoardConfig[] {
    if (!this._config || !this._config.boards) {
      return [];
    }
    return this._config.boards
      .filter((b) => b.enabled)
      .sort((a, b) => a.ceremonyOrder - b.ceremonyOrder);
  }

  /**
   * 取得平時大廳即時風雲榜入口資料（使用者 11/22 裁決）：
   * 僅展示各榜前 3 名 ＋ 玩家自己名次，其餘留待年終揭曉
   */
  public getLobbyPreviews(
    candidateIds: string[],
    playerGeneralIds: string[],
    context: RankingContext
  ): LobbyBoardPreview[] {
    const activeConfigs = this.getActiveBoardConfigs();
    const enrichedContext: RankingContext = {
      ...context,
      previousYearRanks: this._previousYearRanks
    };

    const results: LobbyBoardPreview[] = [];

    for (const config of activeConfigs) {
      const boardResult = this._registry.evaluateBoard(config, candidateIds, this._ledger, enrichedContext);
      const preview = RankingBoardRegistry.filterLobbyPreview(boardResult, playerGeneralIds, config.titleKey);
      results.push(preview);
    }

    return results;
  }

  /**
   * 年終正式評估（全量排名與異動計算）
   */
  public evaluateYearEnd(
    candidateIds: string[],
    context: RankingContext
  ): Record<string, BoardRankResult> {
    const activeConfigs = this.getActiveBoardConfigs();
    const enrichedContext: RankingContext = {
      ...context,
      quarter: 4,
      previousYearRanks: this._previousYearRanks
    };

    const results = this._registry.evaluateAll(activeConfigs, candidateIds, this._ledger, enrichedContext);

    // 更新歷史百名排名紀錄，供下一年比對 ▲+N / ▼-N / — / NEW
    this.updatePreviousYearRanks(results);

    return results;
  }

  /**
   * 更新前一年歷史排名快照
   */
  private updatePreviousYearRanks(results: Record<string, BoardRankResult>): void {
    const newPrevRanks: Record<string, Record<string, number>> = {};
    const maxTrack = this._config?.historyMaxRanksTracked || 100;

    Object.keys(results).forEach((boardId) => {
      newPrevRanks[boardId] = {};
      const boardRes = results[boardId];
      for (const cand of boardRes.candidates) {
        if (cand.rank <= maxTrack) {
          newPrevRanks[boardId][cand.generalId] = cand.rank;
        }
      }
    });

    this._previousYearRanks = newPrevRanks;
  }

  /**
   * 換年重置（TC-RNK-01）：封存快照並清空帳本
   */
  public resetForNewYear(nextYear?: number): void {
    this._ledger.resetYear(nextYear);
  }

  /**
   * 存檔序列化
   */
  public serialize(): {
    ledger: LedgerSerializedData;
    previousYearRanks: Record<string, Record<string, number>>;
  } {
    return {
      ledger: this._ledger.serialize(),
      previousYearRanks: this._previousYearRanks
    };
  }

  /**
   * 存檔反序列化
   */
  public deserialize(data: {
    ledger: LedgerSerializedData;
    previousYearRanks?: Record<string, Record<string, number>>;
  }): void {
    if (!data) return;
    if (data.ledger) {
      this._ledger.deserialize(data.ledger);
    }
    if (data.previousYearRanks) {
      this._previousYearRanks = data.previousYearRanks;
    }
  }
}
