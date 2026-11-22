| 英靈歸位 | Spirit_Return | 名將死亡後英靈回歸世家 / 英靈系統的結算流程 |

### 英靈世家系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 英靈陳列室 | Spirit_Collection_Room | 家族層的英靈集合瀏覽頁，承接多卡管理與展示 |
| 英靈展示列 | Spirit_Display_Row | 家族英靈列表中的單列展示語意，直接顯示快照與切換狀態 |
| 展示權重 | Display_Weight | 英靈陳列室的預設排序權重，用來決定展示列的先後順序 |
| 家族展示焦點 | Featured_Archive_Spirit_UIDs | 家族層釘選的英靈快照清單，用來決定本期陳列室首頁預設焦點 |
| 英靈快照 | Spirit_Archive_Snapshot | 名將死亡後保留的完整歷史紀錄，包含英勇事蹟、最終屬性、最終技能與戰報摘要 |
| 英勇事蹟 | Heroic_Deeds | 英靈快照中的戰功 / 事蹟摘要文字 |
| 屬性快照 | Final_Stats_Snapshot | 英靈快照中保留的最終能力值 |
| 技能快照 | Final_Skills_Snapshot | 英靈快照中保留的最終技能列表 |
| 戰報摘要 | Battle_Record_Ref | 英靈快照中連回當年戰報或戰役紀錄的參照 |

### 轉蛋系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 轉蛋 | Gacha | 隨機抽取武將/教官的機制 |
| 保底 | Pity | 累計抽取達門檻保證出目標 |
| 硬保底 | Hard_Pity | 絕對觸發的保底機制 |
| 轉生 | Reincarnation | 重複抽到同一武將的強化機制 |
| 結義點數 | Bond_Points | 轉蛋副產物，用於傭兵轉永久 |
| 血統種子 | Bloodline_Seed | 名將池提供的角色本體價值，代表可上陣、可培育、可繁衍的入口 |
| 培育深度 | Nurture_Depth | 支援卡池提供的培育上限、事件密度與成長體驗價值 |
| 女性名將定位 | Female_Role_Type | 女性名將在名將池中的定位標籤，區分戰鬥型與輔助型，但不拆出名將池 |
| 鑽石召喚 | LOCAL_GACHA_PULL | 消耗鑽石（gems）進行的轉蛋操作，費用 100 鑽/抽，支援單抽/十連 |
| 黃金召喚 | LOCAL_GOLD_SUMMON | 消耗黃金（gold）進行的轉蛋操作，費用 500 金/抽，僅支援單抽 |
| 召喚券召喚 | LOCAL_TICKET_SUMMON | 消耗召喚券（tickets）進行的轉蛋操作，費用 1 券/抽，僅支援單抽 |
| 召喚批次 | GachaDrawRecord | 單次點擊召喚所產生的 ActionRecord Payload 快照，含時間戳記（Unix ms）、消耗資源、poolId、drawCount 與抽中武將清單（results） |
| 召喚紀錄 | GachaHistoryRecord | 為 UI 展示層設計的扁平化讀模型，由 `LocalGachaService.getRecentPullHistory()` 產生；包含 seq / timestamp / actionType / drawCount / cost / currencyKey / results，以 Timestamp 降序（最新到最舊）排列 |
| 累計抽次 | TotalPullCount | 所有 GachaDrawRecord 的 `drawCount` 總和，由 `getRecentPullHistory()` 的 `total` 欄位回傳 |

### 結緣系統（配種）
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 結緣 | Breeding | 選擇父母產生子嗣 |
| 受孕 | Conception | 結緣成功判定 |
| 神祕期 | Mystery_Phase | 0~5 歲數值隱藏 |
| 開獎 | Unveiling | 5 歲揭曉五維與因子 |
| 大器晚成 | Late_Bloomer / Daqi | 初始低但有隱藏爆發 |
| 天象異變 | Omen | 出生時視覺提示 |
| 待產凍結 | Pregnancy_Lock | 女性受孕後精力凍結 |
| 門當戶對 | Compatibility | 雙方門第匹配概念 |
| 血脈劣化 | Inbreeding_Penalty | 近親繁殖懲罰 |
| 和平血統線 | Peace_Lineage | 不要求前線連續出征、以保種與家系延續為主的結緣路徑 |

### 血統理論系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 家族樹 | Pedigree_Tree | 上 3 代 14 位祖先的因子分布 |
| 血統矩陣 | Ancestors_JSON | 14 人祖先因子的 JSON 結構 |
| 虛擬祖先 | Virtual_Ancestor | 系統自動補齊的祖輩 |
| 血脈共鳴 | Resonance | ≥3 同標籤觸發 +EP |
| 異脈加成 | Outcross_Bonus | 14 人無重複 ID 的加成 |