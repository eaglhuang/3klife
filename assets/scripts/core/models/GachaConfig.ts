// @spec-source → 程式規格書.md §3.3
// PROG-1-0005: Gacha 抽卡池配置介面，供 GachaManager 與抽卡 UI 共用。

import type { HeroRarity } from './HeroBase';

/** 抽卡池類型 */
export type GachaPoolType =
  | 'hero'      // 名將池：可重置，抽將領
  | 'support'   // 紅顏池：支援角色
  | 'mentor'    // 支援卡池：只產生教官卡，不入名冊（PROG-2-1085）
  | 'destiny'   // 宿命池：新手開場免費十連，每輪必出一位宿命名將（PROG-2-2243）
  | 'limited';  // 限定池：每週輪替一位焦點武將，只收靈玉（PROG-2-9024）

export interface GachaConfig {
  /** 唯一識別字 */
  poolId: string;
  /** 顯示名稱 */
  poolName: string;
  /** 抽卡池類型 */
  poolType: GachaPoolType;
  /** 是否支援「重置後再抽」（名將池為 true，抽到即移出下次池）*/
  resetEnabled: boolean;
  /** 保底稀有度：連抽未出此級時觸發保底 */
  guaranteeRarity: HeroRarity;
  /** 保底閾值（累計抽數）*/
  guaranteeThreshold: number;
  /** 單次操作抽取數量（1 或 10）*/
  pickCount: number;
  /** 本池候選 id 列表（引用 generals.json 或 support-cards.json 中的 id）*/
  candidateIds: string[];
  /** 是否每個 id 僅可被首抽命中一次（重置後恢復）*/
  firstPickOnly: boolean;
  /** 抽卡結果揭示前是否需要用戶確認（防止誤觸）*/
  confirmRequired: boolean;
  /** 急召/補抽所需資源類型（'gem' | 'ticket'）*/
  currencyType?: 'gem' | 'ticket' | 'mentorTicket';
  /** 單次十連所需貨幣數量 */
  singlePullCost?: number;
  /** 必出名單：每輪從這裡抽 guaranteedCount 位（宿命池＝六大宿命名將，PROG-2-2243）*/
  guaranteedIds?: string[];
  /** 每輪必出幾位（恰好這個數）*/
  guaranteedCount?: number;
  /** 其餘格子的一般武將稀有度（從武將資料篩，不另列名單）*/
  fillerRarityTiers?: string[];
  /** 一般武將排除的性別（女性歸紅顏池）*/
  fillerExcludeGender?: string;
  /** 結果畫面呈現（轉蛋系統統一入口讀取；PROG-2-9020）。沒給的欄位走 poolType 預設 */
  presentation?: GachaPoolPresentationConfig;
}

/** 抽完之後「再抽」鍵的行為：付費再抽、免費重轉（宿命池）、不可再抽 */
export type GachaRepullMode = 'paid' | 'freeReroll' | 'none';
/** 全螢幕展示完的武將：移到結果面板左側，或收起只留面板 */
export type GachaHeroReveal = 'side' | 'hide';
/** 抽到的東西去哪：武將名冊，或只變教官卡 */
export type GachaInventoryTarget = 'roster' | 'mentorCard';
/** 結果畫面使用的貨幣顯示 */
export type GachaDisplayCurrency = 'gems' | 'gold' | 'tickets' | 'mentorTickets';

export interface GachaPoolPresentationConfig {
  /** 單抽標題（例：召喚券） */
  title?: string;
  /** 十連標題（例：召喚券十連） */
  tenTitle?: string;
  currency?: GachaDisplayCurrency;
  repull?: GachaRepullMode;
  heroReveal?: GachaHeroReveal;
  inventory?: GachaInventoryTarget;
  /** 以下為池別文案覆寫；沒給就用結果畫面的一般文案 */
  header?: string;
  /** 重轉過時接在標題後，{n} 換成次數 */
  headerResetSuffix?: string;
  heroSub?: string;
  backLabel?: string;
  repullLabel?: string;
}
