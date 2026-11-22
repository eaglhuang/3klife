/**
 * 史境天下風雲榜與年終頒獎典禮核心測試（PROG-2-9601 PR1 + PR2）
 * 遵循專案 TestRunner 與 run-cli 自動註冊機制
 * 覆蓋：
 * 1. TC-RNK-01：年度結算、帳本歸零、歷年快照封存
 * 2. TC-RNK-02：戰場記帳一致性（手動、極速決戰、委託代打經由 Hook 寫入）
 * 3. TC-RNK-03：可插拔擴充架構（自訂 Provider 零改動擴充）
 * 4. 平時大廳前 3 名 ＋ 玩家自己名次過濾邏輯與 View 遮蔽（11/22 使用者裁決）
 * 5. 首發 4 大榜單數值算例與上限邊界驗證
 * 6. PR2 典禮演出腳本組裝、雙主持傳承、諸侯全息立繪彈幕、梯形大合照 DTO
 */

import { TestSuite, assert } from './TestRunner';
import { AnnualGeneralLedger } from '../assets/scripts/core/systems/annual_ranking/AnnualGeneralLedger';
import { RankingBoardRegistry, IRankingBoardProvider } from '../assets/scripts/core/systems/annual_ranking/RankingBoardRegistry';
import { AnnualRankingManager } from '../assets/scripts/core/systems/annual_ranking/AnnualRankingManager';
import { BoardConfig, RankingContext, RankingEvidence } from '../assets/scripts/core/systems/annual_ranking/AnnualRankingTypes';
import { KillsRankingProvider } from '../assets/scripts/core/systems/annual_ranking/providers/KillsRankingProvider';
import { GovernanceRankingProvider } from '../assets/scripts/core/systems/annual_ranking/providers/GovernanceRankingProvider';
import { RookieRankingProvider } from '../assets/scripts/core/systems/annual_ranking/providers/RookieRankingProvider';
import { AnnualRankingHook } from '../assets/scripts/core/systems/annual_ranking/AnnualRankingHook';
import { CeremonyScriptAssembler } from '../assets/scripts/core/systems/annual_ranking/CeremonyScriptAssembler';
import { LobbyRankingBoardView } from '../assets/scripts/core/systems/annual_ranking/LobbyRankingBoardView';

export function createAnnualRankingCoreSuite(): TestSuite {
  const suite = new TestSuite('AnnualRankingCore (史境天下風雲榜核心機制 PROG-2-9601)');

  const testConfig = {
    version: '1.0.0',
    comment: '測試配置',
    lobbyDisplayLimit: 3,
    ceremonyDisplayLimit: 10,
    historyMaxRanksTracked: 100,
    boards: [
      {
        boardId: 'kills',
        evaluatorKey: 'kills',
        ceremonyOrder: 1,
        enabled: true,
        titleKey: 'ceremony.board.kills.title',
        descriptionKey: 'ceremony.board.kills.desc',
        honorTitleKey: 'ceremony.board.kills.honor',
        maxSingleBattleScore: 3000,
        killsDivisor: 100,
        baseEnemyPowerRef: 1000,
        powerClampMin: 0.6,
        powerClampMax: 2.5,
        leadMultiplier: 1.15,
        duelBonuses: { none: 0, officer: 150, elite: 300, legend: 600 }
      },
      {
        boardId: 'governance',
        evaluatorKey: 'governance',
        ceremonyOrder: 2,
        enabled: true,
        titleKey: 'ceremony.board.governance.title',
        descriptionKey: 'ceremony.board.governance.desc',
        honorTitleKey: 'ceremony.board.governance.honor',
        maxQuarterScore: 800,
        maxAnnualScore: 3200,
        taskWeights: {
          agriculture: 1.0,
          commerce: 1.0,
          recruitment: 1.0,
          diplomacy: 1.6,
          espionage: 1.6
        },
        defaultTaskWeight: 1.0,
        effClampMin: 0.6,
        effClampMax: 1.3,
        volunteeredMultiplier: 1.2
      },
      {
        boardId: 'charm',
        evaluatorKey: 'charm',
        ceremonyOrder: 3,
        enabled: true,
        titleKey: 'ceremony.board.charm.title',
        descriptionKey: 'ceremony.board.charm.desc',
        honorTitleKey: 'ceremony.board.charm.honor',
        maxTotalVotes: 9999,
        hypeDivisor: 50,
        maxSingleGeneralVotes: 50,
        repeatDecayMin: 0.6,
        repeatDecayMax: 1.0
      },
      {
        boardId: 'rookie',
        evaluatorKey: 'rookie',
        ceremonyOrder: 4,
        enabled: true,
        titleKey: 'ceremony.board.rookie.title',
        descriptionKey: 'ceremony.board.rookie.desc',
        honorTitleKey: 'ceremony.board.rookie.honor',
        maxAge: 22,
        debutBaseMin: 50,
        debutBaseMax: 350,
        prodigyBonus: 150,
        scoreWeights: {
          debut: 1.0,
          kills: 1.0,
          governance: 1.0,
          charmVotes: 0.8
        }
      }
    ]
  };

  suite.test('TC-RNK-01: 年度結算、帳本歸零與歷年快照封存', () => {
    const ledger = new AnnualGeneralLedger(1);
    ledger.recordBattlePerformance('zhao_yun', 1200, 1500, 'elite', true, 'manual');
    ledger.recordGovernanceOutput('zhuge_liang', 1, 'diplomacy', 500, 1.2, true);

    assert.equals(1200, ledger.getMetric('zhao_yun', 'kills.total'));
    assert.equals(500, ledger.getMetric('zhuge_liang', 'gov.totalOutput'));

    // 換年歸零
    ledger.resetYear(2);
    assert.equals(2, ledger.currentYear);
    // 次年數據歸零
    assert.equals(0, ledger.getMetric('zhao_yun', 'kills.total'));
    assert.equals(0, ledger.getMetric('zhuge_liang', 'gov.totalOutput'));

    // 第 1 年歷史快照封存完整
    const snap1 = ledger.getSnapshot(1);
    assert.isTrue(snap1 !== undefined);
    assert.equals(1200, snap1?.metrics['zhao_yun']['kills.total']);
    assert.equals(500, snap1?.metrics['zhuge_liang']['gov.totalOutput']);
  });

  suite.test('TC-RNK-02: 戰場記帳一致性（手動、極速決戰、委託代打經由 Hook 寫入）', () => {
    AnnualRankingManager.resetInstance();
    const manager = new AnnualRankingManager(testConfig);

    // 三位武將在相同條件下分別透過手動、極速決戰、委託代打經由 Hook 結算
    AnnualRankingHook.recordBattle({ generalId: 'gen_manual', kills: 2000, enemyPower: 1200, duelTier: 'elite', isCommander: true, battleMode: 'manual' }, manager.ledger);
    AnnualRankingHook.recordBattle({ generalId: 'gen_speed', kills: 2000, enemyPower: 1200, duelTier: 'elite', isCommander: true, battleMode: 'speed' }, manager.ledger);
    AnnualRankingHook.recordBattle({ generalId: 'gen_delegate', kills: 2000, enemyPower: 1200, duelTier: 'elite', isCommander: true, battleMode: 'delegate' }, manager.ledger);

    const provider = new KillsRankingProvider();
    const context: RankingContext = { year: 1, quarter: 4, generals: {} };
    const config = testConfig.boards[0];

    const scoreManual = provider.evaluate('gen_manual', manager.ledger, context, config);
    const scoreSpeed = provider.evaluate('gen_speed', manager.ledger, context, config);
    const scoreDelegate = provider.evaluate('gen_delegate', manager.ledger, context, config);

    assert.isTrue(scoreManual > 0);
    assert.equals(scoreManual, scoreSpeed, '極速決戰得分應與手動戰鬥完全相同');
    assert.equals(scoreManual, scoreDelegate, '委託代打得分應與手動戰鬥完全相同');
  });

  suite.test('TC-RNK-03: 四層架構可插拔擴充（自訂名師 Provider 零改動擴充）', () => {
    AnnualRankingManager.resetInstance();
    const manager = new AnnualRankingManager(testConfig);

    class PrivateTutorRankingProvider implements IRankingBoardProvider {
      public readonly boardId: string = 'private_tutor';
      public readonly evaluatorKey: string = 'private_tutor';

      public isEligible(generalId: string, context: RankingContext, config: BoardConfig): boolean {
        return true;
      }
      public evaluate(generalId: string, ledger: AnnualGeneralLedger, context: RankingContext, config: BoardConfig): number {
        return ledger.getMetric(generalId, 'tutor.popularScore');
      }
      public buildEvidence(generalId: string, ledger: AnnualGeneralLedger, score: number, context: RankingContext, config: BoardConfig): RankingEvidence {
        return {
          summary: `私塾人氣得分 ${score}`,
          highlightKey: 'tutor.popularScore',
          highlightValue: score
        };
      }
    }

    manager.registry.registerProvider(new PrivateTutorRankingProvider());

    const expandedConfig = {
      ...testConfig,
      boards: [
        ...testConfig.boards,
        {
          boardId: 'private_tutor',
          evaluatorKey: 'private_tutor',
          ceremonyOrder: 5,
          enabled: true,
          titleKey: 'ceremony.board.tutor.title',
          descriptionKey: 'ceremony.board.tutor.desc',
          honorTitleKey: 'ceremony.board.tutor.honor'
        }
      ]
    };
    manager.setConfig(expandedConfig);

    manager.ledger.addMetric('sima_hui', 'tutor.popularScore', 2400);
    manager.ledger.addMetric('zheng_xuan', 'tutor.popularScore', 1800);

    const context: RankingContext = { year: 1, quarter: 4, generals: {} };
    const results = manager.evaluateYearEnd(['sima_hui', 'zheng_xuan'], context);

    assert.isTrue(results['private_tutor'] !== undefined, '擴充的 private_tutor 榜單應正確評估');
    assert.equals(2, results['private_tutor'].candidates.length);
    assert.equals('sima_hui', results['private_tutor'].candidates[0].generalId);
    assert.equals(2400, results['private_tutor'].candidates[0].score);
    assert.equals(1, results['private_tutor'].candidates[0].rank);
  });

  suite.test('平時大廳看板與 View 控制器（僅展示前 3 名 ＋ 玩家自己名次，其餘遮蔽）', () => {
    AnnualRankingManager.resetInstance();
    const manager = new AnnualRankingManager(testConfig);

    const generals = [
      { id: 'npc_1', score: 2500 },
      { id: 'npc_2', score: 2200 },
      { id: 'npc_3', score: 1900 },
      { id: 'npc_4', score: 1600 },
      { id: 'npc_5', score: 1400 },
      { id: 'player_gen', score: 1200 }, // 第 6 名
      { id: 'npc_7', score: 900 },
      { id: 'npc_8', score: 500 }
    ];

    const generalInfoMap = new Map();
    for (const g of generals) {
      generalInfoMap.set(g.id, {
        generalId: g.id,
        isPlayerFaction: g.id === 'player_gen'
      });
      manager.ledger.recordBattlePerformance(g.id, g.score * 5, 1000, 'none', false, 'manual');
    }

    const context: RankingContext = {
      year: 1,
      quarter: 2, // 平時第 2 季
      generals: generalInfoMap
    };

    const view = new LobbyRankingBoardView(manager);
    const display = view.getBoardDisplayCards(
      'kills',
      generals.map(g => g.id),
      ['player_gen'],
      context
    );

    // 驗證卡片清單：前 3 名 ＋ 玩家自家武將（共 4 張）
    assert.equals(4, display.cards.length);
    assert.equals('第 1 名', display.cards[0].rankText);
    assert.equals('第 2 名', display.cards[1].rankText);
    assert.equals('第 3 名', display.cards[2].rankText);

    // 玩家武將卡片在第 4 張，展示名次為第 6 名
    assert.equals('第 6 名', display.cards[3].rankText);
    assert.equals('player_gen', display.cards[3].generalId);
    assert.equals(true, display.cards[3].isPlayer);
    assert.equals(false, display.cards[3].isMasked);
    assert.equals(false, display.isYearEndRevealed);
  });

  suite.test('年終典禮演出組裝器與大合照 DTO 構建驗證', () => {
    AnnualRankingManager.resetInstance();
    const manager = new AnnualRankingManager(testConfig);

    // 模擬年終殺敵與新人武將數據
    manager.ledger.recordBattlePerformance('guan_yu', 3000, 2000, 'legend', true, 'manual');
    manager.ledger.recordBattlePerformance('zhang_fei', 2500, 1800, 'elite', true, 'manual');

    const generalMap = new Map();
    generalMap.set('guan_yu', { generalId: 'guan_yu', isPlayerFaction: true });
    generalMap.set('zhang_fei', { generalId: 'zhang_fei', isPlayerFaction: true });

    const context: RankingContext = { year: 1, quarter: 4, generals: generalMap };
    const boardResults = manager.evaluateYearEnd(['guan_yu', 'zhang_fei'], context);

    // 組裝典禮演出劇本
    const assembly = CeremonyScriptAssembler.assembleCeremony({
      year: 1,
      boardResults,
      livingMonarchIds: [
        { id: 'cao_cao', name: '曹操', factionId: 'wei' },
        { id: 'liu_bei', name: '劉備', factionId: 'shu' }
      ],
      playerFactionId: 'shu',
      gameTick: 1040
    });

    // 驗證雙主持人（第 1 屆為史小境＋司馬徽）
    assert.equals('shi_xiaojing', assembly.hosts[0].hostId);
    assert.equals('sima_hui', assembly.hosts[1].hostId);
    assert.equals(true, assembly.hosts[0].isFirstYearHost);

    // 驗證 StoryCue 包含開場、諸侯全息立繪連線、聚光燈、冠軍感言、大合照快門
    const cueTypes = assembly.cues.map(c => c.type);
    assert.isTrue(cueTypes.indexOf('PROLOGUE_HOST_ENTRY') >= 0);
    assert.isTrue(cueTypes.indexOf('MONARCH_HOLOGRAM_CONNECT') >= 0);
    assert.isTrue(cueTypes.indexOf('CHAMPION_SPOTLIGHT') >= 0);
    assert.isTrue(cueTypes.indexOf('GRAND_PHOTO_SHUTTER') >= 0);

    // 驗證大合照 DTO 站位結構
    const photo = assembly.photoBackdropDto;
    assert.equals(1, photo.year);
    assert.equals('TRAPEZOID_TWO_LAYER', photo.layoutPattern);
    assert.isTrue(photo.frontRowGenerals.indexOf('guan_yu') >= 0, '冠軍應在前排焦點');
    assert.isTrue(photo.backRowGenerals.indexOf('cao_cao') >= 0, '諸侯投影應在後排');
  });

  suite.test('殺敵榜上限與戰力 Clamp 邊界驗證', () => {
    const ledger = new AnnualGeneralLedger(1);
    ledger.recordBattlePerformance('lu_bu', 100000, 5000, 'legend', true, 'manual');

    const provider = new KillsRankingProvider();
    const context: RankingContext = { year: 1, quarter: 4, generals: {} };
    const score = provider.evaluate('lu_bu', ledger, context, testConfig.boards[0]);

    assert.equals(3000, score, '單場戰鬥得分應被上限 3000 夾制');
  });

  suite.test('治理榜單季上限 800 與全年上限 3200 驗證', () => {
    const ledger = new AnnualGeneralLedger(1);
    ledger.recordGovernanceOutput('xun_yu', 1, 'diplomacy', 10000, 1.3, false);
    ledger.recordGovernanceOutput('xun_yu', 2, 'diplomacy', 10000, 1.3, false);
    ledger.recordGovernanceOutput('xun_yu', 3, 'diplomacy', 10000, 1.3, false);
    ledger.recordGovernanceOutput('xun_yu', 4, 'diplomacy', 10000, 1.3, false);

    const provider = new GovernanceRankingProvider();
    const context: RankingContext = { year: 1, quarter: 4, generals: {} };
    const score = provider.evaluate('xun_yu', ledger, context, testConfig.boards[1]);

    assert.equals(3200, score, '治理榜四季合計應為上限 3200');
  });

  suite.test('新人王榜資格判定與奇才加成驗證', () => {
    const ledger = new AnnualGeneralLedger(1);
    const provider = new RookieRankingProvider();
    const config = testConfig.boards[3];

    const generalMap = new Map();
    generalMap.set('young_hero', {
      generalId: 'young_hero',
      age: 20,
      debutYear: 1,
      isProdigy: true,
      cha: 80, int: 80, pol: 80, lea: 80
    });
    generalMap.set('veteran', {
      generalId: 'veteran',
      age: 35,
      debutYear: 1,
      isProdigy: false
    });

    const context: RankingContext = { year: 1, quarter: 4, generals: generalMap };

    assert.equals(true, provider.isEligible('young_hero', context, config));
    assert.equals(false, provider.isEligible('veteran', context, config));

    const score = provider.evaluate('young_hero', ledger, context, config);
    assert.isTrue(score >= 150 + 150, '新人王得分應包含奇才加成 150');
  });

  return suite;
}
