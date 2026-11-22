| 官職 | Officer_System | 管理大廳、治理、世界沙盤與外交權限的帳號級進度系統 |
| 官職階位 | Officer_Tier | 官職的正式層級與權限檔位 |
| 官職經驗 | Officer_Exp | 用於晉升官職的累積值 |
| 官印 | Officer_Seal | 官職身份與晉升的視覺 / 劇情載體 |
| 官職保留 | Persist_Across_Era_Shift | 天下大亂後不回退官職進度的規則 |

### 大廳系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 大廳 | Hall_Hub | 玩家登入後的長線中樞場景 |
| 幕府議事廳 | Main_Hall | 大廳的世界觀名稱與主要空間 |
| 軍事牆 | Military_Board | 大廳左牆的軍務 / 外交任務列表 |
| 內政牆 | Domestic_Board | 大廳右牆的內政 / 人脈任務列表 |
| 世界沙盤 | World_Sandtable | 中央世界局勢與遠征進度地圖 |
| 許願祭壇 | Wish_Altar | 大廳中的時間償還商城入口 |
| 自告奮勇 | Volunteer_Event | 武將主動請纓任務的彩蛋互動事件，預設不綁固定成功率公式 |

### 他國 AI 系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| Nation Profile | Nation_Profile | AI 國家的性格模板，決定內政 / 擴張 / 外交偏好 |
| 反霸權聯盟 | Anti_Hegemony_Coalition | 霸主領土佔比過高時形成的圍堵同盟，非霸主玩家與其他勢力必須被捲入 |
| 領土佔比 | Domain_Ratio | 國家目前領地佔全圖比例，用於觸發橡皮筋機制 |
| 時代更迭 | Era_Shift | 世界局勢失衡後重洗版圖的賽季化重組事件 |
| 軍事任務偵知 | Mission_Intel_Band | 依軍師智力決定的軍事提案品質層級 |

### 戰場部署系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 精銳部署上限 | Elite_Deploy_Cap | 戰場同時可維持的精銳 / 特殊兵 / 器械上限，普通小兵不計入 |
| 保留槽 | Reserve_Slot | 給高價值虎符兵或攻城器械預留的部署容量 |
| 場景預設 | Scene_Preset_ID | 套用到同一張 5×8 棋盤的 Tile-State preset 識別碼 |
| 委任保留策略 | AI_Reserve_Policy | AI 依智力品質保留糧草、虎符兵與器械槽位的正式規則 |

### 戰法場景系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 固定情報門檻 | Required_Intel_Value | 每一種場景戰法各自要求的情報值門檻，不使用共用百分比 |
| Tile 預設 ID | Tile_Preset_ID | 場景戰法注入戰場時對應的格子 preset ID |
| 環境百分點修正 | Environment_Bonus_Pct | 地形 / 天氣 / 適性 / 場景加成採加法累積的百分點修正 |

### 戰場環境（天氣）
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 天氣系統 | Weather_System | 戰場中隨回合變化、影響適性與戰法施放的環境機制 |
| 晴天 | SUNNY | 基礎天氣，無特殊修正 |
| 雨天 | RAINY | 禁用火計，影響射程與水域範圍 |
| 大霧 | FOG | 禁用火計，大幅降低視野與命中 |
| 大風 | WINDY | 火計傷害加倍，降低遠程射程與命中 |
| 夜戰 | NIGHT | 降低全軍命中，具備夜戰因子者暴擊提升 |
| 雷暴 | THUNDER | 禁用火計，大幅降低士氣，機械單位有機率損毀 |
| 天氣預報 | Weather_Schedule | 預告未來回合天氣變化的時程表 |

### 兵種（虎符）系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 虎符主分數 | TigerTallyScore | 映射虎符品質的唯一正式分數，0~100 |
| 死亡戰績分數 | Death_Battle_Score | 佔虎符品質 70% 權重的戰場表現評分 |
| 傳承品質分數 | Legacy_Quality_Score | 佔虎符品質 30% 權重的傳承敘事 / 家族品質評分 |

### 名將挑戰賽系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 報名鏡像快照 | Tournament_Team_Snapshot | 報名當下凍結的隊伍 JSON，為非同步對戰唯一權威 |
| 賽季 rollover | Season_Rollover | 每季結束後依段位進行 soft reset 的重置規則 |
| 月度場景賽 | Monthly_Scenario_Cup | 每月一次的特殊地形 / 天氣限定賽，不計入主賽積分 |
