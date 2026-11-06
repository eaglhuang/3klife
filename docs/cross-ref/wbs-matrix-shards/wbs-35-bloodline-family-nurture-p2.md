# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.5 血統家族培育（2/9）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.5 血統家族培育（2/9）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.5 5. 血統、家族與培育傳承 (Bloodline, Family & Nurture) · 第 2/9 段

> 續上段（表頭重複）。工作包 BLT-11 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **BLT-11** | M9 | 血脈歸宗 Bloodline_Merge 與史實名門加成（袁紹四世三公） | logic | 4 | ✅ 已驗收 | BLT-03 | 同名不同版本合併並移植特殊因子；名門有預設家譜加成 | [v10 核對 2026-10-20] 血脈歸宗接線 mergeBloodlineFor（479fd076，PROG-2-0710），GameSession 呼叫；BloodlineMerge 測試與跨存檔端到端測試（05d8b5af）。名門加成與歸宗令扣除未逐項核對 |  |
| **BLT-12** | M10 | 祖紋命篆／命紋靈獸視覺契約、血脈逸聞四格漫畫、血脈傳承奧義五階 | content | 8 | 🟢 已接線 | BLT-06 | 六靈獸原型有 badge/紋樣/人格/覺醒傾向對照表並接進 UI | [v14 核對 2026-10-21] 五階奧義摘要 UltimateStageSummary 與 UltimateProgress 接 GeneralDetailSkillsChild（UltimateActionView 有呼叫端與測試）；靈獸原型表對齊規格（7f5ea2b5）。視覺契約與血脈逸聞四格漫畫未做；PM 2026-10-20 確認維持已接線，本項屬 M10 商業項，待裁決 |  |
| **BLT-13** | M11 | 血統色譜六色底層落地與字典 Tag Pool（100 武將=100 行） | data | 3 | ✅ 已驗收 | BLT-01 | 字典六色齊備，祖先條目全部以字典 ID 引用 | [v15 核對 2026-10-21] 血統色譜 Tag Pool 字典注入：ServiceLoader 注入字典 → BreedingService.generateVirtualAncestry 呼叫（養成線 2026-10-21 核對；PM 2026-10-21 裁定升已驗收），TagPoolAncestorLookup.test.ts 存在 |  |
| **BUI-01** | M10 | 血統樹節點結構與 Layout JSON（BloodlineTreeRoot/Gen1~3Container/NodeCard/MainTargetPanel） | ui | 4 | 🟡 純邏輯 | - | bloodline-tree-main.json 節點名稱與規格 §2 一致並可載入 | [v16.4 核對 2026-10-27] PROG-2-1048 已在 master（血統樹 14 人版型節點，bloodline-tree-main.json＋BloodlineTreeLayout.test.ts）；BloodlineTreeBinding.ts 無 src 呼叫端，故記純邏輯；任務卡 in-review，未完成／未驗收 |  |
| **BUI-02** | M10 | NodeCard 共用 prefab 與資料映射（名稱/地點/因子星數/Portrait/Stats/Genes/Tags） | ui | 3 | 🟡 純邏輯 | BUI-01 | 14 張卡片由遞迴資料實體化並正確賦值 | assets/scripts/ui/panels/BloodlineTreePanel.ts（Label 填字，無 Portrait/Stats/Genes） |  |
| **BUI-03** | M10 | 資料注入：UIPreviewBuilder 接受深層嵌套基因樹 | logic | 2 | 🟡 純邏輯 | BUI-02 | config 一次遞迴 14 位先祖建立節點 | assets/scripts/core/services/BloodlineGraph.ts getAncestorChain（BFS）；BloodlineTreePanel.loadTree；無測試 |  |
| **BUI-04** | M10 | UIBloodlineConnections.ts 動態貝茲連線（Graphics，WorldPosition） | ui | 3 | 🟢 已接線 | BUI-02 | 不同螢幕比例下連線不破圖 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **BUI-05** | M10 | 主角底部區（立繪、稀有度、覺醒/未解鎖因子 SkillDetails、LegendPanel） | ui | 3 | 🟢 已接線 | BUI-01 | MainTargetPanel 顯示子代立繪、稀有度與因子狀態 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **BUI-06** | M10 | 顏色 token 整合（六色因子色碼進 uid-design-tokens） | data | 1 | 🟡 純邏輯 | - | 連線與卡框顏色全部取自 token | [v16 核對 2026-10-21] 六色因子色碼 token 外移 uid-design-tokens.json（70549226，PROG-2-1051，#760）；FactorTagTokens.ts 與 FactorTagTokens.test.ts 存在，src 無呼叫端 |  |
| **BUI-07** | M10 | 效能防呆（僅父母＋子代掛 SpriteFrame，其餘共用低解析度 icon） | ui | 2 | ⚪ 未開始 | BUI-02 | 同畫面 DrawCall 與貼圖記憶體在預算內 | 無 |  |
| **BUI-08** | M10 | 祖紋命篆視覺母語（命紋拓印背景、node badge、靈獸小圖騰） | content | 5 | 🟢 已接線 | BUI-01 | 既有 hierarchy 上套用色調/badge/紋樣且資訊可讀 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **FUL-01** | M2 | Discovery_Level 可見性模型與三階段門檻（config/gameplay.json） | logic | 2 | 🟢 已接線 | - | 依玩家等級回傳 Visible_Types/Locked_Types，門檻可由 config 修改 | [v7 核對 2026-10-14] FactorMaskState 接 UI 與階段摘要（de1360db，PROG-2-0513）；三階段門檻沿用 gameplay.json |  |
| **FUL-02** | M2 | GeneObject 的 Discovery_Level 與 Is_Locked 雙旗標分離 | data | 1 | 🟢 已接線 | FUL-01 | UI 可見與實際生效分開判定 | [v7 核對 2026-10-14] Discovery_Level 與 Is_Locked 雙旗標經 FactorMask 接線（de1360db，PROG-2-0513） |  |
| **FUL-03** | M2 | 視覺遮罩 UI（灰鎖『??? (Lv N 解鎖)』→彩色亮起動畫） | ui | 3 | 🟢 已接線 | FUL-02 | 未達等級顯示鎖頭字串，解鎖播放亮起動畫 | [v5 核對 2026-10-14] 因子遮罩接上結緣與詳情畫面（827eea6c，PROG-2-0275）；FactorMask 有 3 處外部呼叫端；灰鎖動畫未核對 |  |
| **FUL-04** | M3 | 培育窺探（每回合 0.08×(1+教官等級×0.1)） | logic | 2 | 🟢 已接線 | FUL-02 | 培育回合依公式機率揭露鎖住因子並出提示 | [master fb02ff9 重估] FactorAwakening.ts NURTURE_PEEK_*（PROG-2-0052 後續） |  |
| **FUL-05** | M5 | 戰場覺醒（每場 0.05，特定動作 0.15） | logic | 3 | 🟢 已接線 | FUL-02 | 戰鬥結算依動作機率解鎖因子並播放鎖頭碎裂 | [master fb02ff9 重估] BattleSpecialActions.ts 特定動作偵測（PROG-2-0048） |  |
| **FUL-06** | M11 | Server 欄位 Player_Level／Unlock_Phase 與階段通知文案 | server | 2 | 🟢 已接線 | FUL-01 | 升級跨階段時推送 Phase2/3 文案並持久化 | [v14 核對 2026-10-21] 因子解鎖階段接到 GameSession（b9a42843，PROG-2-0881，#654）；GameSession 呼叫 UnlockPhase，ServerSchemaFul06.test.ts 存在。伺服器未部署，依 PM 裁定定為已接線 |  |
| **FUL-07** | M9 | 名士占卜提前預覽鎖住因子方向 | logic | 3 | 🟢 已接線 | FUL-02 | 占卜可顯示未解鎖因子類別提示 | [v9 核對 2026-10-15] SageFactorPreview 由 SageOracleController 呼叫（名士占卜預覽鎖住因子方向）；占卜畫面未逐項核對 |  |
| **FUL-08** | M8 | 先知陷阱（預覽準確率≠100%）與解鎖加速道具/覺醒催化劑 | logic | 3 | 🟢 已接線 | FUL-07 | 預覽有可配置誤差，道具可調整機率 | assets/scripts/core/systems/SageDivination.ts 名士占卜準確率 70~85%（左慈 70%～諸葛亮／龐統 85%），assets/scripts/core/systems/GeneCatalyst.ts 覺醒催化劑（繼承機率 +25 個百分點，限一次）；tests/GeneCatalyst*.test.ts | [v17.0 更正 2026-11-07] 未開始→已接線；先知陷阱（準確率≠100%）與催化劑早已入庫（SageDivination；GeneCatalyst PROG-2-0104、BLT-10 PROG-2-0864／0865），本列漏更 |
| **FBR-01** | M2 | 六色因子定義與因子字典 schema（Gene_Dictionary/Tag Pool） | data | 3 | 🟢 已接線 | - | 字典六色齊全，欄位含 Gene_ID/Type/Max_Level/Effect | [master fb02ff9 重估] FactorInheritance.ts buildFactorDictionary（六色，PROG-2-0035） |  |
| **FBR-02** | M2 | GeneObject 結構與序列化 | data | 1 | 🟢 已接線 | FBR-01 | {Type,ID,Level,Is_Locked,Discovery_Level} 可存取 | [v7 核對 2026-10-14] GeneObject 序列化經武將資料載入與因子存讀接線（e1695b27，PROG-2-0409／0410）；GeneralDataWiring 測試 |  |
| **FBR-03** | M2 | 因子繼承邏輯（父母 100%/祖輩 50%/曾祖 25%、教官不參與） | logic | 3 | ✅ 已驗收 | FBR-01 | inheritFactors 依機率與星等分布產出因子 | /tmp/integ/assets/scripts/core/systems/FactorInheritance.ts inheritFactors；/tmp/integ/tests/Breeding.test.ts 『因子進池』『星等分布』『同因子取最高星』 |  |
| **FBR-04** | M5 | 因子覺醒機制（戰場動作／培育事件解鎖，鎖頭碎裂） | logic | 3 | 🟢 已接線 | FBR-02 | 覺醒事件把 Is_Locked 置 false 並廣播 | [master fb02ff9 重估] FactorAwakening.ts + BattleSpecialActions.ts（PROG-2-0044/0048） |  |
| **FBR-05** | M7 | 因子-戰法連動：綠色 TP×0.5、粉色地形效果（水戰合攻/大霧免疫/林地 +1） | logic | 4 | ✅ 已驗收 | FBR-03 | 持有對應綠因子學戰法 TP 減半；粉因子觸發地形效果 | [v8 核對 2026-10-15] 因子-戰法連動純規則（dd7cfb5f）、林地移動+1 與大霧免疫接線（043210b8，e6d4a928 改粉色）、水域合攻 +50%（c6df9961）、綠因子戰法折扣（6b3df0b3）；FactorTacticLinkage 4 處呼叫端與測試 |  |
