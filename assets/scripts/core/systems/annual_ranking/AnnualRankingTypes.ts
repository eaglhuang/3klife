/**
 * 史境天下風雲榜與年終頒獎典禮核心類型定義（PROG-2-9601 / PROG-2-9602）
 * 遵循 doc_spec_1284 與四層可插拔獨立架構
 */

import type { LedgerSerializedData } from './AnnualGeneralLedger';

export interface BoardConfig {
  boardId: string;
  evaluatorKey: string;
  ceremonyOrder: number;
  enabled: boolean;
  titleKey: string;
  descriptionKey: string;
  honorTitleKey: string;
  [key: string]: any;
}

/** 大廳看板文字表（全部來自 annual-ranking-config.json 的 lobbyTexts；{rank}、{score}、{n} 為佔位符） */
export interface LobbyTextTable {
  rankLabel: string;
  scoreLabel: string;
  yearEndHidden: string;
  trendUp: string;
  trendDown: string;
  trendEqual: string;
  trendNew: string;
}

export interface ClanPrestigeConfig {
  enabled: boolean;
  baseContribution: number;
  maxPerGeneral: number;
  multipliers: {
    rank1: number;
    rankTop3: number;
    rankTop10: number;
    rankTop100: number;
    [key: string]: number;
  };
}

export interface RankingBountyItem {
  silver: number;
  fame: number;
}

export interface SalarySystemConfig {
  enabled: boolean;
  officialQuarterlyGold: Record<string, number>;
  defaultQuarterlyGold: number;
  annualRankingBounties: {
    rank1: RankingBountyItem;
    rankTop3: RankingBountyItem;
    rankTop10: RankingBountyItem;
    rankTop20: RankingBountyItem;
    rankTop100: RankingBountyItem;
    [key: string]: RankingBountyItem;
  };
  maxAnnualSilverPerGeneral: number;
  maxAnnualFamePerGeneral: number;
}

export interface AnnualRankingConfig {
  version: string;
  comment: string;
  lobbyDisplayLimit: number;
  ceremonyDisplayLimit: number;
  historyMaxRanksTracked: number;
  lobbyTexts: LobbyTextTable;
  boards: BoardConfig[];
  clanPrestige?: ClanPrestigeConfig;
  salarySystem?: SalarySystemConfig;
}

export interface MetricHighlight {
  key: string;
  value: number;
  meta?: Record<string, any>;
  timestamp?: number;
}

export interface RankingEvidence {
  summary: string;
  highlightKey: string;
  highlightValue: number;
  relatedEntityId?: string;
  meta?: Record<string, any>;
}

export type RankTrend = 'NEW' | 'EQUAL' | 'UP' | 'DOWN';

export interface RankingCandidate {
  generalId: string;
  score: number;
  rank: number;
  evidence: RankingEvidence;
  previousRank?: number;
  trend: RankTrend;
  trendDelta?: number;
  isPlayerOwned?: boolean;
}

export interface BoardRankResult {
  boardId: string;
  year: number;
  quarter: number;
  candidates: RankingCandidate[];
  isYearEndFinal: boolean;
}

export interface LobbyPreviewEntry {
  generalId: string;
  rank: number;
  score?: number;
  evidenceSummary?: string;
  trend: RankTrend;
  trendDelta?: number;
  isPlayerOwned: boolean;
  isMasked?: boolean; // 若為大廳遮蔽項目（第 4 名之後非玩家者）
}

export interface LobbyBoardPreview {
  boardId: string;
  titleKey: string;
  topThree: LobbyPreviewEntry[];
  playerSelf?: LobbyPreviewEntry;
  totalCandidates: number;
  isYearEndRevealed: boolean;
}

export interface RankingGeneralInfo {
  generalId: string;
  name?: string;
  factionId?: string;
  isPlayerFaction?: boolean;
  age?: number;
  cha?: number;
  int?: number;
  pol?: number;
  lea?: number;
  debutYear?: number;
  isGraduateThisYear?: boolean;
  isProdigy?: boolean;
  persona?: string;
  /** 性別（紅顏榜只排女將；未提供視為不限） */
  gender?: 'M' | 'F';
}

export interface RankingContext {
  year: number;
  quarter: number;
  generals: Map<string, RankingGeneralInfo> | Record<string, RankingGeneralInfo>;
  playerFactionId?: string;
  previousYearRanks?: Record<string, Record<string, number>>; // boardId -> generalId -> rank
}

export interface AnnualRankingSaveData {
  ledger?: LedgerSerializedData;
  previousYearRanks?: Record<string, Record<string, number>>;
  congratulatedByYear?: Record<number, string[]>;
  ceremonyArchives?: Record<number, any>;
  salaryClaimedYears?: number[];
  quarterlySalaryClaims?: Record<string, boolean>; // `${year}_Q${quarter}` -> claimed
}
