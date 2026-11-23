/**
 * 史境天下風雲榜世家聲望大廳快報彈窗 ViewState 組裝器（PROG-2-9603）
 * 職責：
 * 1. 於年終盛典結算或戰後回歸大廳時，若家族武將有世家聲望新增貢獻，組裝快報通知 ViewState
 * 2. 採用主題系統語意 Token（panel.bg, panel.border, text.title, button.primary.*）
 * 3. 支援四語系 i18n 鍵值（ui.annual_ranking.bulletin.*）
 * 4. 純函式架構，零 side-effects，易於單元測試與 Cocos UI 綁定
 */

export interface ClanPrestigeContributionDetail {
  generalId: string;
  generalNameKey: string;
  boardTitleKey: string;
  rank: number;
  contributionPoints: number;
}

export interface ClanPrestigeBulletinViewState {
  visible: boolean;
  titleKey: string;
  summaryTextKey: string;
  summaryParams: {
    totalPoints: number;
    year: number;
  };
  details: ClanPrestigeContributionDetail[];
  prestigeProgress: {
    previousPrestige: number;
    currentPrestige: number;
    previousTier: number;
    currentTier: number;
    isTierUpgraded: boolean;
    tierNameKey: string;
  };
  themeTokens: {
    panelBg: string;
    panelBorder: string;
    titleColor: string;
    buttonBg: string;
    buttonBorder: string;
  };
  confirmButtonKey: string;
}

export interface BuildBulletinParams {
  year: number;
  contributions: Array<{
    generalId: string;
    generalNameKey?: string;
    boardTitleKey: string;
    rank: number;
    points: number;
  }>;
  previousPrestige: number;
  currentPrestige: number;
  prestigeTierOf: (prestige: number) => number;
  customThemeTokens?: Partial<{
    panelBg: string;
    panelBorder: string;
    titleColor: string;
    buttonBg: string;
    buttonBorder: string;
  }>;
}

/** 預設主題語意 Token（對齊 theme-registry.json 之 default theme） */
export const DEFAULT_BULLETIN_THEME_TOKENS = {
  panelBg: 'panel.bg',
  panelBorder: 'panel.border',
  titleColor: 'text.title',
  buttonBg: 'button.primary.bg',
  buttonBorder: 'button.primary.border',
};

/**
 * 世家等階對應 i18n key（Tier 1~5）
 */
export function getClanTierNameKey(tier: number): string {
  const clamped = Math.max(1, Math.min(5, Math.floor(tier)));
  return `ui.clan.tier.${clamped}`;
}

/**
 * 組裝世家快報彈窗 ViewState
 */
export function buildClanPrestigeBulletinViewState(
  params: BuildBulletinParams
): ClanPrestigeBulletinViewState {
  const {
    year,
    contributions,
    previousPrestige,
    currentPrestige,
    prestigeTierOf,
    customThemeTokens
  } = params;

  let totalPoints = 0;
  const details: ClanPrestigeContributionDetail[] = [];

  for (const item of contributions) {
    if (item.points > 0) {
      totalPoints += item.points;
      details.push({
        generalId: item.generalId,
        generalNameKey: item.generalNameKey ?? `general.name.${item.generalId}`,
        boardTitleKey: item.boardTitleKey,
        rank: item.rank,
        contributionPoints: item.points
      });
    }
  }

  const prevTier = prestigeTierOf(previousPrestige);
  const curTier = prestigeTierOf(currentPrestige);
  const isTierUpgraded = curTier > prevTier;

  const themeTokens = {
    ...DEFAULT_BULLETIN_THEME_TOKENS,
    ...(customThemeTokens ?? {})
  };

  return {
    visible: totalPoints > 0 || isTierUpgraded,
    titleKey: 'ui.annual_ranking.bulletin.title',
    summaryTextKey: 'ui.annual_ranking.bulletin.summary',
    summaryParams: {
      totalPoints,
      year
    },
    details,
    prestigeProgress: {
      previousPrestige,
      currentPrestige,
      previousTier: prevTier,
      currentTier: curTier,
      isTierUpgraded,
      tierNameKey: getClanTierNameKey(curTier)
    },
    themeTokens,
    confirmButtonKey: 'ui.annual_ranking.bulletin.btn_confirm'
  };
}
