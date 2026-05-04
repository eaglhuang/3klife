// @spec-source → 程式規格書.md §3.1
// PROG-1-0001: 武將基礎介面，供初始武將資料、Gacha 抽卡池與 UI 展示共用。
// 不依賴 Cocos 節點；可被 GeneralConfig 實作或 extends。

export type HeroRarity =
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic';

export type HeroElement =
  | 'metal'
  | 'wood'
  | 'water'
  | 'fire'
  | 'earth';

export type HeroInitialRole =
  | 'commander'
  | 'vanguard'
  | 'strategist'
  | 'support'
  | 'scout';

export interface HeroBase {
  /** 唯一識別字，與 generals.json id 一致 */
  id: string;
  /** 顯示名稱 */
  name: string;
  /** 稱號（如【魏武】）*/
  title: string;
  /** 出身地域（史實郡縣），用於血脈與地圖關聯 */
  originRegion: string;
  /** 核心特質標籤（影響 generator 傾向與 gacha 池分類）*/
  coreFactorTag: string;
  /** 稀有度 */
  rarity: HeroRarity;
  /** 五行屬性 */
  element: HeroElement;
  /** 初始上場定位 */
  initialRole: HeroInitialRole;
  /** 角色自我介紹短句（詳情頁 / Gacha 揭示文字）*/
  introLine: string;
  /** 立繪資源路徑（相對於 resources/）*/
  portraitKey: string;
  /** 戰鬥語音資源路徑（相對於 resources/）*/
  battleVoiceKey: string;
}
