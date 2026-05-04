// @spec-source → 程式規格書.md §3.3
// PROG-1-0005: Gacha 抽卡池配置介面，供 GachaManager 與抽卡 UI 共用。

import type { HeroRarity } from './HeroBase';

/** 抽卡池類型 */
export type GachaPoolType =
  | 'hero'      // 名將池：可重置，抽將領
  | 'support';  // 紅顏池：支援角色

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
  currencyType?: 'gem' | 'ticket';
  /** 單次十連所需貨幣數量 */
  singlePullCost?: number;
}
