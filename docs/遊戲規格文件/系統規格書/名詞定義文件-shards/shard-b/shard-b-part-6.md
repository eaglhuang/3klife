| 天命重置 | Fate_Reset | 重 roll 天命波動 |
| 種母 | Breeding_Mother | 高 LUK 女性配種母體 |

### 留存系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 告別信 | Farewell_Letter | 傭兵退場自動生成 |
| 退役回流 | Retirement_Reflow | 退役轉教官 |
| 世代成就 | Legacy_Achievement | 因子跨 3 代傳承 |
| 病毒行銷 | Viral_Marketing | 名牌社交傳播 |

### 經濟系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 糧草 | Food | 養兵/行軍 |
| 黃金 | Gold | 招募/建設 |
| 城市兵源 | City_Troops | 城市可撥給出征的可見軍事庫存 |
| 名聲 | Fame | 解鎖門檻 |
| 精元 | Jing_Yuan | 付費貨幣 |
| 百寶閣 | Shop | 商城 |
| 月卡 | Monthly_Card | 30 天每日加成 |
| 通行證 | Season_Pass | 季度任務獎勵 |
| 地窖保護 | Cellar_Protection | 戰敗或低資源時仍保留最低糧草 / 黃金操作水位的保底機制 |
| 每日補貼 | Daily_Subsidy | 每日登入時對低資源玩家補到最低遊玩線的救濟 |
| 賽事經濟 | Tournament_Economy | 挑戰賽報名、額外參戰與 BOSS 挑戰券的經濟子回圈 |

### MVP
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| MVP | MVP | 最小可玩版本 |
| P0/P1/P2 | Priority_0/1/2 | 功能優先級 |
| 三代循環 | Three_Gen_Loop | 祖→父→子驗收標準 |
| 核心迴圈 | Core_Loop | 結緣→培育→戰場→傳承 |

---

### 資料中心系統（DC）

> 定義來源：`docs/資料中心架構規格書.md (doc_tech_0009)` (doc_tech_0009) v1.1

#### 稀有度系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 稀有度 | RarityTier | 核心五級武將品質；戰力、適性、EP 與資料盤點的唯一真相來源 |
| 普通 | N / common | 一般武將；核心 tier 最低層 |
| 稀有 | R / rare | 稀有武將 |
| 精銳 | SR / epic | 精銳武將 |
| 傳說 | SSR / legendary | 傳說武將 |
| 神話 | UR / mythic | 神話武將；`characterCategory` 需為 `mythical` 或手動指定 |
| 商業稀有度分層 | CommercialRarityBand | 白 / 綠 / 藍 / 紫 / 金 / 紅 / 彩七色展示層；由核心 tier 與商業規則衍生，不回寫戰力 |
| 招牌金卡白名單 | featuredBandIds | 少數角色可被強制包裝成金卡的商業白名單 |
| 雙軸稀有度判定 | DualAxisRarity | 以 maxStat 和 avg5 兩個指標各自判定 tier，取較高者 |
| 最高單項屬性 | maxStat | 六維屬性中最高的單項值 |
| 去 luk 五維平均 | avg5 | 六維去掉 LUK 後的平均值 |

#### 角色分類
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 角色分類 | characterCategory | civilian / general / famed / mythical / titled |
| 平民 | civilian | 無武將職份的一般人物 |
| 一般將領 | general | 標準武將 |
| 名將 | famed | 具高知名度的名將 |
| 神話人物 | mythical | 神話/半神級別，自動歸為 UR |
| 帝王/封號 | titled | 帝王或有封號人物（預留擴充） |

#### 資料分層儲存
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 索引層 | L0 / DataCatalog | App 啟動時載入，~50KB，350 武將 × 150B |
| 活躍層 | L1 / Active | 進入 Lobby 預載，當前陣容 30 位 × 5KB |
| 倉庫層 | L2 / Storage | 開倉庫/圖鑑時分頁載入，20 位/頁 × 5KB |
| 故事層 | L3 / Lore | 點開人物詳情時載入，每位 2-5KB |
| 歷史層 | L4 / History | 查看戰績時載入，每季 ~50KB |
| 血統層 | L5 / Bloodline | 查看血統樹時載入，每位 1-3KB |
| 儲存適配器 | DataStorageAdapter | 抽象層統一 IndexedDB (Web) / SQLite (Native) API |
| 索引目錄 | DataCatalog | L0 快速查表服務 |
| 分頁載入器 | DataPageLoader | L1-L5 按需分頁載入服務 |

#### 血統正規化
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 人物登記冊 | PersonRegistry | 去重的中央人物主檔，每人只有一筆記錄 |