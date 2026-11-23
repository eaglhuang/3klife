/**
 * 史境天下風雲榜與官職雙軌俸祿機制（方案B）單元測試（PROG-2-9602）
 * 覆蓋：
 * 1. 季常官職俸金依階位（1~5）計算與邊界回退預設值
 * 2. 年終風雲榜上榜恩賞（銀兩＋名聲）多榜累計算例
 * 3. 單人年度銀兩（上限 3000）與名聲（上限 300）箝制
 * 4. 存檔白名單領取狀態防重記帳與反序列化一致性
 */

import { TestSuite, assert } from './TestRunner';
import { AnnualRankingManager } from '../assets/scripts/core/systems/annual_ranking/AnnualRankingManager';
import {
  calculateOfficialQuarterlySalary,
  calculateAnnualRankingBounty
} from '../assets/scripts/core/systems/annual_ranking/AnnualRankingSalary';
import type { SalarySystemConfig } from '../assets/scripts/core/systems/annual_ranking/AnnualRankingTypes';

export function createAnnualRankingSalarySuite(): TestSuite {
  const suite = new TestSuite('AnnualRankingSalary (史境天下風雲榜與官職俸祿雙軌方案B PROG-2-9602)');

  const testSalaryConfig: SalarySystemConfig = {
    enabled: true,
    officialQuarterlyGold: {
      '1': 50,
      '2': 100,
      '3': 200,
      '4': 350,
      '5': 600
    },
    defaultQuarterlyGold: 50,
    annualRankingBounties: {
      rank1: { silver: 1000, fame: 100 },
      rankTop3: { silver: 600, fame: 60 },
      rankTop10: { silver: 300, fame: 30 },
      rankTop20: { silver: 150, fame: 15 },
      rankTop100: { silver: 50, fame: 5 }
    },
    maxAnnualSilverPerGeneral: 3000,
    maxAnnualFamePerGeneral: 300
  };

  const testAnnualRankingConfig = {
    version: '1.1.0',
    comment: '測試配置',
    lobbyDisplayLimit: 3,
    ceremonyDisplayLimit: 10,
    historyMaxRanksTracked: 100,
    lobbyTexts: {
      rankLabel: '第 {rank} 名',
      scoreLabel: '{score} 分',
      yearEndHidden: '年終揭曉',
      trendUp: '▲+{n}',
      trendDown: '▼-{n}',
      trendEqual: '—',
      trendNew: 'NEW',
    },
    boards: [],
    salarySystem: testSalaryConfig
  };

  suite.test('純函式計算：季常官職俸金各品階驗算', () => {
    assert.equals(50, calculateOfficialQuarterlySalary(1, testSalaryConfig).gold);
    assert.equals(100, calculateOfficialQuarterlySalary(2, testSalaryConfig).gold);
    assert.equals(200, calculateOfficialQuarterlySalary(3, testSalaryConfig).gold);
    assert.equals(350, calculateOfficialQuarterlySalary(4, testSalaryConfig).gold);
    assert.equals(600, calculateOfficialQuarterlySalary(5, testSalaryConfig).gold);

    // 未知階位回退
    assert.equals(50, calculateOfficialQuarterlySalary(99, testSalaryConfig).gold);
    // 未啟用配置
    assert.equals(0, calculateOfficialQuarterlySalary(3, { ...testSalaryConfig, enabled: false }).gold);
  });

  suite.test('純函式計算：年終風雲榜恩賞多榜累計與上限箝制', () => {
    // 算例 1：榜首單冠 (1000 銀, 100 名聲)
    const b1 = calculateAnnualRankingBounty([1], testSalaryConfig);
    assert.equals(1000, b1.silver);
    assert.equals(100, b1.fame);
    assert.equals(1, b1.boardContributions.length);

    // 算例 2：跨榜第 2 名 (600, 60) + 第 8 名 (300, 30) = (900 銀, 90 名聲)
    const b2 = calculateAnnualRankingBounty([2, 8], testSalaryConfig);
    assert.equals(900, b2.silver);
    assert.equals(90, b2.fame);

    // 算例 3：第 15 名 (150, 15) + 第 55 名 (50, 5) = (200 銀, 20 名聲)
    const b3 = calculateAnnualRankingBounty([15, 55], testSalaryConfig);
    assert.equals(200, b3.silver);
    assert.equals(20, b3.fame);

    // 算例 4：單人上限箝制（四冠王 4000 銀、400 名聲 -> 箝制為 3000 銀、300 名聲）
    const bMax = calculateAnnualRankingBounty([1, 1, 1, 1], testSalaryConfig);
    assert.equals(3000, bMax.silver, '年度銀兩應箝制在上限 3000');
    assert.equals(300, bMax.fame, '年度名聲應箝制在上限 300');

    // 算例 5：未入榜或非百強
    const bZero = calculateAnnualRankingBounty([105, -1, 0], testSalaryConfig);
    assert.equals(0, bZero.silver);
    assert.equals(0, bZero.fame);
    assert.equals(0, bZero.boardContributions.length);
  });

  suite.test('Manager 整合：雙軌發放防重記帳與存檔反序列化驗證', () => {
    const manager = new AnnualRankingManager(testAnnualRankingConfig as any);

    // 季常俸金領取檢查
    assert.equals(false, manager.isQuarterlySalaryClaimed(1, 1));
    manager.markQuarterlySalaryClaimed(1, 1);
    assert.equals(true, manager.isQuarterlySalaryClaimed(1, 1));
    assert.equals(false, manager.isQuarterlySalaryClaimed(1, 2));

    // 年終恩賞領取檢查
    assert.equals(false, manager.isAnnualRankingBountyClaimed(1));
    manager.markAnnualRankingBountyClaimed(1);
    assert.equals(true, manager.isAnnualRankingBountyClaimed(1));
    assert.equals(false, manager.isAnnualRankingBountyClaimed(2));

    // 存檔與讀檔反序列化
    const saved = manager.serialize();
    assert.isTrue(Array.isArray(saved.salaryClaimedYears));
    assert.equals(1, saved.salaryClaimedYears!.length);
    assert.equals(1, saved.salaryClaimedYears![0]);
    assert.equals(true, saved.quarterlySalaryClaims!['1_Q1']);

    const restoredManager = new AnnualRankingManager(testAnnualRankingConfig as any);
    restoredManager.restoreSaveData(saved);

    assert.equals(true, restoredManager.isQuarterlySalaryClaimed(1, 1), '反序列化後已領取季度應為 true');
    assert.equals(false, restoredManager.isQuarterlySalaryClaimed(1, 2), '未領取季度應為 false');
    assert.equals(true, restoredManager.isAnnualRankingBountyClaimed(1), '反序列化後已領取年度應為 true');
    assert.equals(false, restoredManager.isAnnualRankingBountyClaimed(2), '未領取年度應為 false');
  });

  return suite;
}
