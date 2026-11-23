/**
 * 史境天下風雲榜世家聲望大廳快報彈窗單元測試（PROG-2-9603）
 * 覆蓋：
 * 1. ViewState 完整組裝與結構驗證（武將名次、貢獻點數累計）
 * 2. 世家等階提升與進度顯示（isTierUpgraded）
 * 3. 語意 Token 映射符合 theme-registry.json 預設規範
 * 4. 無貢獻時 visible 為 false 靜默不彈窗
 */

import { TestSuite, assert } from './TestRunner';
import {
  buildClanPrestigeBulletinViewState,
  getClanTierNameKey,
  DEFAULT_BULLETIN_THEME_TOKENS
} from '../assets/scripts/core/systems/annual_ranking/ClanPrestigeBulletinView';

export function createClanPrestigeBulletinSuite(): TestSuite {
  const suite = new TestSuite('ClanPrestigeBulletin (世家聲望大廳快報彈窗 PROG-2-9603)');

  // 模擬世家等階門檻：0~499 (Tier 1), 500~999 (Tier 2), 1000~1999 (Tier 3), 2000~3999 (Tier 4), 4000+ (Tier 5)
  const mockTierOf = (prestige: number): number => {
    if (prestige >= 4000) return 5;
    if (prestige >= 2000) return 4;
    if (prestige >= 1000) return 3;
    if (prestige >= 500) return 2;
    return 1;
  };

  suite.test('正常貢獻組裝：累計聲望點數、武將明細與未升階狀態', () => {
    const viewState = buildClanPrestigeBulletinViewState({
      year: 1,
      contributions: [
        { generalId: 'guan_yu', boardTitleKey: 'ceremony.board.kills.title', rank: 1, points: 250 },
        { generalId: 'zhang_fei', boardTitleKey: 'ceremony.board.kills.title', rank: 3, points: 150 }
      ],
      previousPrestige: 100,
      currentPrestige: 500, // 剛好進入 Tier 2
      prestigeTierOf: mockTierOf
    });

    assert.equals(true, viewState.visible, '有貢獻時應顯示快報');
    assert.equals('ui.annual_ranking.bulletin.title', viewState.titleKey);
    assert.equals(400, viewState.summaryParams.totalPoints, '總貢獻應為 400');
    assert.equals(2, viewState.details.length, '應有 2 筆武將貢獻明細');
    assert.equals('guan_yu', viewState.details[0].generalId);
    assert.equals(250, viewState.details[0].contributionPoints);

    // 等階提升判定
    assert.equals(1, viewState.prestigeProgress.previousTier);
    assert.equals(2, viewState.prestigeProgress.currentTier);
    assert.equals(true, viewState.prestigeProgress.isTierUpgraded, '100->500 應晉升 Tier 2');
    assert.equals('ui.clan.tier.2', viewState.prestigeProgress.tierNameKey);

    // 主題語意 Token 映射
    assert.equals('panel.bg', viewState.themeTokens.panelBg);
    assert.equals('panel.border', viewState.themeTokens.panelBorder);
    assert.equals('text.title', viewState.themeTokens.titleColor);
  });

  suite.test('未升階正常展示與世家等階 i18n 鍵值回傳', () => {
    const viewState = buildClanPrestigeBulletinViewState({
      year: 2,
      contributions: [
        { generalId: 'zhao_yun', boardTitleKey: 'ceremony.board.rookie.title', rank: 5, points: 100 }
      ],
      previousPrestige: 500,
      currentPrestige: 600, // 仍在 Tier 2
      prestigeTierOf: mockTierOf
    });

    assert.equals(true, viewState.visible);
    assert.equals(100, viewState.summaryParams.totalPoints);
    assert.equals(false, viewState.prestigeProgress.isTierUpgraded, '500->600 未跨階');
    assert.equals('ui.clan.tier.2', viewState.prestigeProgress.tierNameKey);
    assert.equals('ui.clan.tier.5', getClanTierNameKey(5));
    assert.equals('ui.clan.tier.1', getClanTierNameKey(0)); // 箝制
  });

  suite.test('零貢獻且未升階時靜默不顯示', () => {
    const viewState = buildClanPrestigeBulletinViewState({
      year: 1,
      contributions: [],
      previousPrestige: 100,
      currentPrestige: 100,
      prestigeTierOf: mockTierOf
    });

    assert.equals(false, viewState.visible, '無新增聲望且未升階應靜默');
    assert.equals(0, viewState.details.length);
  });

  return suite;
}
