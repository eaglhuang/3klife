/**
 * 史境天下風雲榜與官職雙軌俸祿機制（方案B）（PROG-2-9602）
 * 遵循使用者裁決方案 B：
 * 1. 平時依官職每季領國家俸金（金）。
 * 2. 年終風雲榜上榜者另得家族銀兩＋名聲恩賞。
 * 3. 數值完全由 annual-ranking-config.json 的 salarySystem 區塊驅動，純函式無 side-effects。
 */

import type { SalarySystemConfig, RankingBountyItem } from './AnnualRankingTypes';

export interface QuarterlySalaryResult {
  officialTier: number;
  gold: number;
}

export interface AnnualRankingBountyResult {
  silver: number;
  fame: number;
  boardContributions: Array<{
    rank: number;
    silver: number;
    fame: number;
  }>;
}

/**
 * 計算季常官職俸金（國家公帑 - 金）
 * @param officialTier 官職階位 (1~5)
 * @param config 俸祿系統設定
 */
export function calculateOfficialQuarterlySalary(
  officialTier: number,
  config?: SalarySystemConfig
): QuarterlySalaryResult {
  if (!config || !config.enabled) {
    return { officialTier, gold: 0 };
  }

  const tierKey = String(Math.floor(officialTier));
  const gold = config.officialQuarterlyGold[tierKey] ?? config.defaultQuarterlyGold ?? 50;

  return {
    officialTier,
    gold: Math.max(0, gold)
  };
}

/**
 * 計算年終風雲榜上榜恩賞（家族俸祿 - 銀兩與名聲）
 * @param ranks 武將在各排行榜獲得之名次陣列 (1~100)
 * @param config 俸祿系統設定
 */
export function calculateAnnualRankingBounty(
  ranks: number[],
  config?: SalarySystemConfig
): AnnualRankingBountyResult {
  if (!config || !config.enabled) {
    return { silver: 0, fame: 0, boardContributions: [] };
  }

  const bounties = config.annualRankingBounties;
  const maxSilver = config.maxAnnualSilverPerGeneral ?? 3000;
  const maxFame = config.maxAnnualFamePerGeneral ?? 300;

  let totalSilver = 0;
  let totalFame = 0;
  const boardContributions: Array<{ rank: number; silver: number; fame: number }> = [];

  for (const rank of ranks) {
    if (rank <= 0 || rank > 100) continue;

    let item: RankingBountyItem = bounties.rankTop100;
    if (rank === 1) {
      item = bounties.rank1;
    } else if (rank <= 3) {
      item = bounties.rankTop3;
    } else if (rank <= 10) {
      item = bounties.rankTop10;
    } else if (rank <= 20) {
      item = bounties.rankTop20;
    }

    const s = item.silver || 0;
    const f = item.fame || 0;

    totalSilver += s;
    totalFame += f;
    boardContributions.push({ rank, silver: s, fame: f });
  }

  return {
    silver: Math.min(maxSilver, totalSilver),
    fame: Math.min(maxFame, totalFame),
    boardContributions
  };
}
