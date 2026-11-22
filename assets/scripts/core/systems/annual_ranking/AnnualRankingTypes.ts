/**
 * 史境天下風雲榜與年終頒獎典禮核心類型定義（PROG-2-9601）
 * 遵循 doc_spec_1284 與四層可插拔獨立架構
 */

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

export interface AnnualRankingConfig {
  version: string;
  comment: string;
  lobbyDisplayLimit: number;
  ceremonyDisplayLimit: number;
  historyMaxRanksTracked: number;
  boards: BoardConfig[];
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
}

export interface RankingContext {
  year: number;
  quarter: number;
  generals: Map<string, RankingGeneralInfo> | Record<string, RankingGeneralInfo>;
  playerFactionId?: string;
  previousYearRanks?: Record<string, Record<string, number>>; // boardId -> generalId -> rank
}
