// @spec-source → 程式規格書.md §3.2
// PROG-1-0002: 支援角色卡基礎介面，供紅顏池 Gacha 抽卡、詳情頁與隊伍編組共用。

import type { HeroRarity } from './HeroBase';

/** 支援角色卡分類（世界觀定位）*/
export type SupportCardCategory =
  | 'beauty'       // 紅顏：主要影響外交、商業產出
  | 'advisor'      // 軍師：提升謀略型武將戰法效果
  | 'artisan'      // 工匠：加速建設與科技研發
  | 'merchant'     // 商人：提升金錢收入與貿易路線
  | 'healer';      // 醫師：戰後恢復與活力補充

/** 支援角色抵達路線類型 */
export type SupportCardRouteType =
  | 'carriage'     // 馬車：平原快、山地慢
  | 'ship'         // 水路：江南水域快
  | 'horse'        // 快馬：機動力最高
  | 'escort';      // 護送：安全係數最高，速度最慢

export interface SupportCardBase {
  /** 唯一識別字 */
  id: string;
  /** 顯示名稱 */
  name: string;
  /** 分類（影響加成類型）*/
  category: SupportCardCategory;
  /** 稀有度，對齊 HeroRarity 5 級制 */
  rarity: HeroRarity;
  /** 抵達路線類型 */
  routeType: SupportCardRouteType;
  /** 正常抵達所需回合數 */
  arrivalTime: number;
  /** 急召所需金錢（0 = 不可急召）*/
  rushPrice: number;
  /** 加成效果標籤（用於 UI 篩選與 FormulaSystem 判斷）*/
  effectTags: string[];
  /** 角色自我介紹短句（詳情頁 / Gacha 揭示文字）*/
  previewLine: string;
  /** 立繪資源路徑（相對於 resources/）*/
  portraitKey: string;
}
