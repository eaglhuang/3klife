| 靈獸原型 | Beast_Archetype | 命紋靈獸的大類型，如龍 / 虎 / 鶴 / 玄龜 / 狼 / 麒麟；決定人格傾向與奧義偏向 |
| 覺醒傾向 | Awakening_Tendency | 血脈更容易因哪些戰績 / 事件累積覺醒進度的標記 |
| 血脈性格註記 | Bloodline_Persona_Tags | 用於命頁深層人格區的 2~3 個短標籤，不直接等於六維屬性 |
| 覺醒階 | Awakening_Stage | 血脈傳承奧義目前已點亮的階段數 |
| 星階上限 | Stage_Cap | 血脈傳承奧義目前可開啟到的最高階數，由升星決定 |
| 祖紋命篆 | Ancestral_Sigil | 古老血脈符號系統，語感近甲骨、金文、小篆、玉刻痕 |
| 表象面 | Surface_Face | 武將以歷史人物 / 日常英雄形象被玩家看見的一面 |
| 血脈面 | Bloodline_Face | 武將受祖靈、命紋與因果牽引後顯現的潛在一面 |
| 血脈逸聞 | Bloodline_Vignette | 以靜態連環漫畫呈現的名將血脈故事內容層 |

// 中央化關係定義：
// RIVAL（宿敵）等關係型態的權威定義應由 `家族關係（史實相性）系統`（HistoricalRelation table）提供，
// 其他系統（如戰場部署、結緣、事件系統）應從該中心化資料表讀取對應效果與合成規則，避免跨系統硬編或不一致。
// 範例：`HistoricalRelation.getRelation(TemplateA, TemplateB) == RIVAL` → 系統統一套用該關係的受孕/戰場/劇本效果。

### 因子爆發系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 因子 | Gene / GeneObject | 遺傳最小單位 |
| 六色因子 | Six-Color Genes | 藍粉綠紫白紅 |
| 覺醒 | Awakening | 隱藏因子解鎖亮起 |
| 標籤庫 | Tag_Pool / Gene_Dictionary | 共用因子定義字典 |
| Discovery_Level | Discovery_Level | UI 可見的等級門檻 |
| TP 折扣 | TP_Discount | 綠色因子學習戰法減半 |
| 洗因子 | Gene_Farming | 大量配種追求特定因子 |
| 純種 | Purebred | 14 人全同因子的極品 |
| 戰法種子 | Skill_Seed | 綠色因子 |
| 天命波動 | LUK_Fluctuation | 紫色因子對 EP 的隨機加減 |

### 名士預言系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 名士 | Sage | 提供占卜的 NPC |
| 求籤令 | Oracle_Token | 占卜消耗道具 |
| 偏見 | Bias | 名士偏好加權 |
| 先知陷阱 | Oracle_Trap | 準確率上限導致重複消費 |
| 矛盾預言 | Conflicting_Prediction | 不同名士相反結論 |

### 傭兵系統（試用）
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 傭兵 | Mercenary | 試用期武將（6 日） |
| 結義 | Bonding | 試用→永久 |
| 試用券 | Trial_Ticket | 獲取傭兵的道具 |
| 退場 | Expiry | 6 日到期離隊 |
| 演武筆記 | Battle_Note | 傭兵戰鬥紀錄回傳 |
| 插畫進度 | Illustration_Stage | 5 階段情感插圖 |
| 名牌 | Nametag | 原主名字標籤 |

### 培育系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 培育 | Nurture | 36 回合鏡像訓練 |
| 鏡像快照 | Snapshot | 數值分身 |
| 入學令 | Admission_Token | 培育名額道具 |
| 回合 | Round | 培育最小時間單位 |
| 三階段學年 | Phase_Block | 36 回合拆成基礎打底 / 中期專精 / 畢業衝刺的節奏區段 |
| 畢業 | Graduation | 36 回合結束 |
| 評級 | Rating | S/A/B/C |
| 畢業標籤 | Graduation_Tags | 培育完成後輸出的戰術傾向摘要，供關卡推薦與戰前 intel 使用 |
| 事件 | Event | 隨機因子覺醒/受傷 |
| 自動培育 | Auto_Nurture | AI 一鍵培育 |

### 關卡設計系統
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 連環破 | Stage_Chain | 由多個子關卡串接而成的正式挑戰鏈 |
| 戰前偵查 | Preview_Intel | 進關前揭露敵將、主機制、風險標籤與 loadout 缺口的資訊層 |
| 軍師 HUD | Strategist_HUD | 戰中顯示主題危害、互動物件狀態與戰術缺口的摘要資訊層 |
| 互動物件 | Interactive_Object | 落石機關、水門、營帳、陷阱等可被觸發或回收的場景單位 |