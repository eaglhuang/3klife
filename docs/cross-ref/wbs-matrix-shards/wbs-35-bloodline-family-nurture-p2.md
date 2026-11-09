# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.5 血統家族培育（2/9）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.5 血統家族培育（2/9）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.5 5. 血統、家族與培育傳承 (Bloodline, Family & Nurture) · 第 2/9 段

> 續上段（表頭重複）。工作包 BLT-11 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **BLT-11** | M9 | 血脈歸宗 Bloodline_Merge 與史實名門加成（袁紹四世三公） | logic | 4 | ✅ 已驗收 | BLT-03 | 同名不同版本合併並移植特殊因子；名門有預設家譜加成 | core/systems/BloodlineMerge.ts；GameSession.mergeBloodlineFor；tests/BloodlineMerge.test.ts 通過；規格書 doc_spec_0546（血脈歸宗因子移植狀態機與同名版本合併規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0546 落地，同名同血脈四大拒絕原因、V1/V2確定性移植與歸宗令扣除守則確立 |
| **BLT-12** | M10 | 祖紋命篆／命紋靈獸視覺契約、血脈逸聞四格漫畫、血脈傳承奧義五階 | content | 8 | 🟢 已接線 | BLT-06 | 六靈獸原型有 badge/紋樣/人格/覺醒傾向對照表並接進 UI | 規格見 doc_spec_0639；TotemBeastArchetype 六大靈獸原型視覺契約、四格逸聞資料結構與五階奧義傳承階梯 | [v18.31 核對 2026-11-08] 規格 doc_spec_0639 定案；視覺契約與四格逸聞裁決完結 |
| **BLT-13** | M11 | 血統色譜六色底層落地與字典 Tag Pool（100 武將=100 行） | data | 3 | ✅ 已驗收 | BLT-01 | 字典六色齊備，祖先條目全部以字典 ID 引用 | [v15 核對 2026-10-21] 血統色譜 Tag Pool 字典注入：ServiceLoader 注入字典 → BreedingService.generateVirtualAncestry 呼叫（養成線 2026-10-21 核對；PM 2026-10-21 裁定升已驗收），TagPoolAncestorLookup.test.ts 存在 |  |
| **BUI-01** | M10 | 血統樹節點結構與 Layout JSON（BloodlineTreeRoot/Gen1~3Container/NodeCard/MainTargetPanel） | ui | 4 | 🟢 已接線 | - | bloodline-tree-main.json 節點名稱與規格 §2 一致並可載入 | BloodlineTreeBinding 被 BloodlineTreePanel、Ds3BloodlineTree 匯入；PROG-2-1048（#1056）、PROG-2-1049（#1059） | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **BUI-02** | M10 | NodeCard 共用 prefab 與資料映射（名稱/地點/因子星數/Portrait/Stats/Genes/Tags） | ui | 3 | 🟢 已接線 | BUI-01 | 14 張卡片由遞迴資料實體化並正確賦值 | BloodlineNodeCards 被 BloodlineTreeBinding 匯入；PROG-2-1028（#849） | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **BUI-03** | M10 | 資料注入：UIPreviewBuilder 接受深層嵌套基因樹 | logic | 2 | 🟢 已接線 | BUI-02 | config 一次遞迴 14 位先祖建立節點 | 嵌套基因樹遞迴成 14 位先祖 slot；PROG-2-1029（#852） | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **BUI-04** | M10 | UIBloodlineConnections.ts 動態貝茲連線（Graphics，WorldPosition） | ui | 3 | 🟢 已接線 | BUI-02 | 不同螢幕比例下連線不破圖 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **BUI-05** | M10 | 主角底部區（立繪、稀有度、覺醒/未解鎖因子 SkillDetails、LegendPanel） | ui | 3 | 🟢 已接線 | BUI-01 | MainTargetPanel 顯示子代立繪、稀有度與因子狀態 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **BUI-06** | M10 | 顏色 token 整合（六色因子色碼進 uid-design-tokens） | data | 1 | 🟢 已接線 | - | 連線與卡框顏色全部取自 token | 規格見 doc_spec_0640；六色因子全域 Token 契約、動態貝茲曲線漸變混色與選中高亮動效 | [v18.31 核對 2026-11-08] 規格 doc_spec_0640 定案；因子Token與漸變色渲染標準確立 |
| **BUI-07** | M10 | 效能防呆（僅父母＋子代掛 SpriteFrame，其餘共用低解析度 icon） | ui | 2 | 🟡 純邏輯 | BUI-02 | 同畫面 DrawCall 與貼圖記憶體在預算內 | 規格見 doc_spec_0638；AncestorRenderPolicy 三級紋理階梯渲染、DrawCall<=35 與顯存<=28MB 動態降級 | [v18.31 核對 2026-11-08] 規格 doc_spec_0638 定案；祖譜渲染效能防呆確立 |
| **BUI-08** | M10 | 祖紋命篆視覺母語（命紋拓印背景、node badge、靈獸小圖騰） | content | 5 | 🟢 已接線 | BUI-01 | 既有 hierarchy 上套用色調/badge/紋樣且資訊可讀 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **FUL-01** | M2 | Discovery_Level 可見性模型與三階段門檻（config/gameplay.json） | logic | 2 | ✅ 已驗收 | - | 依玩家等級回傳 Visible_Types/Locked_Types，門檻可由 config 修改 | core/systems/FactorMask.ts；tests/FactorMask.test.ts 通過；規格書 doc_spec_0545（因子視覺遮罩與玩家發現等級三階段模型規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0545 落地，藍粉綠(1)/白紅(20)/紫(45)三階段門檻與雙旗標解耦模型確立 |
| **FUL-02** | M2 | GeneObject 的 Discovery_Level 與 Is_Locked 雙旗標分離 | data | 1 | ✅ 已驗收 | FUL-01 | UI 可見與實際生效分開判定 | core/systems/FactorMask.ts factorMaskView；規格書 doc_spec_0545（因子視覺遮罩與玩家發現等級三階段模型規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0545 落地，revealed(看得到)與active(生效中)雙旗標四態表與字串契約確立 |
| **FUL-03** | M2 | 視覺遮罩 UI（灰鎖『??? (Lv N 解鎖)』→彩色亮起動畫） | ui | 3 | 🟢 已接線 | FUL-02 | 未達等級顯示鎖頭字串，解鎖播放亮起動畫 | [v5 核對 2026-10-14] 因子遮罩接上結緣與詳情畫面（827eea6c，PROG-2-0275）；FactorMask 有 3 處外部呼叫端；灰鎖動畫未核對 |  |
| **FUL-04** | M3 | 培育窺探（每回合 0.08×(1+教官等級×0.1)） | logic | 2 | ✅ 已驗收 | FUL-02 | 培育回合依公式機率揭露鎖住因子並出提示 | core/systems/FactorAwakening.ts nurturePeekChance；tests/FactorAwakening.test.ts 通過；規格書 doc_spec_0547（學府培育窺探與戰場特定動作因子覺醒機率模型規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0547 落地，8%基準率、教官星等階梯加成、幸運加速與訓練格共鳴確立 |
| **FUL-05** | M5 | 戰場覺醒（每場 0.05，特定動作 0.15） | logic | 3 | ✅ 已驗收 | FUL-02 | 戰鬥結算依動作機率解鎖因子並播放鎖頭碎裂 | core/systems/FactorAwakening.ts rollBattleAwakening；BattleSpecialActions 整合；規格書 doc_spec_0547（學府培育窺探與戰場特定動作因子覺醒機率模型規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0547 落地，常規5%藍粉、特定動作15%全色系與動作標籤定向匹配確立 |
| **FUL-06** | M11 | Server 欄位 Player_Level／Unlock_Phase 與階段通知文案 | server | 2 | 🟢 已接線 | FUL-01 | 升級跨階段時推送 Phase2/3 文案並持久化 | [v14 核對 2026-10-21] 因子解鎖階段接到 GameSession（b9a42843，PROG-2-0881，#654）；GameSession 呼叫 UnlockPhase，ServerSchemaFul06.test.ts 存在。伺服器未部署，依 PM 裁定定為已接線 |  |
| **FUL-07** | M9 | 名士占卜提前預覽鎖住因子方向 | logic | 3 | ✅ 已驗收 | FUL-02 | 占卜可顯示未解鎖因子類別提示 | core/systems/SageDivination.ts；SageOracleController；tests/SageDivination.test.ts 通過；規格書 doc_spec_0548（名將占卜因子定向覺醒與先知陷阱扭曲預言規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0548 落地，六大名士偏好準確率、3倍抽樣權重、先知陷阱扭曲與零無辜扣款確立 |
| **FUL-08** | M8 | 先知陷阱（預覽準確率≠100%）與解鎖加速道具/覺醒催化劑 | logic | 3 | ✅ 已驗收 | FUL-07 | 預覽有可配置誤差，道具可調整機率 | core/systems/SageDivination.ts（準確率70~85%）；GeneCatalyst.ts（+25%繼承機率）；規格書 doc_spec_0548（名將占卜因子定向覺醒與先知陷阱扭曲預言規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0548 落地，先知陷阱二元分支、偏見提示色與求籤令消耗防護確立 |
| **FBR-01** | M2 | 六色因子定義與因子字典 schema（Gene_Dictionary/Tag Pool） | data | 3 | 🟢 已接線 | - | 字典六色齊全，欄位含 Gene_ID/Type/Max_Level/Effect | [master fb02ff9 重估] FactorInheritance.ts buildFactorDictionary（六色，PROG-2-0035） |  |
| **FBR-02** | M2 | GeneObject 結構與序列化 | data | 1 | 🟢 已接線 | FBR-01 | {Type,ID,Level,Is_Locked,Discovery_Level} 可存取 | [v7 核對 2026-10-14] GeneObject 序列化經武將資料載入與因子存讀接線（e1695b27，PROG-2-0409／0410）；GeneralDataWiring 測試 |  |
| **FBR-03** | M2 | 因子繼承邏輯（父母 100%/祖輩 50%/曾祖 25%、教官不參與） | logic | 3 | ✅ 已驗收 | FBR-01 | inheritFactors 依機率與星等分布產出因子 | /tmp/integ/assets/scripts/core/systems/FactorInheritance.ts inheritFactors；/tmp/integ/tests/Breeding.test.ts 『因子進池』『星等分布』『同因子取最高星』 |  |
| **FBR-04** | M5 | 因子覺醒機制（戰場動作／培育事件解鎖，鎖頭碎裂） | logic | 3 | ✅ 已驗收 | FBR-02 | 覺醒事件把 Is_Locked 置 false 並廣播 | core/systems/FactorAwakening.ts awakenFactor；tests/FactorAwakening.test.ts 通過；規格書 doc_spec_0549（因子覺醒機制與鎖頭碎裂廣播事件規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0549 落地，四大途徑色系白名單、五重排他校驗、全域事件與專屬題詞確立 |
| **FBR-05** | M7 | 因子-戰法連動：綠色 TP×0.5、粉色地形效果（水戰合攻/大霧免疫/林地 +1） | logic | 4 | ✅ 已驗收 | FBR-03 | 持有對應綠因子學戰法 TP 減半；粉因子觸發地形效果 | core/systems/FactorTacticLinkage.ts；tests/FactorTacticLinkage.test.ts 通過；規格書 doc_spec_0550（綠粉因子戰法TP折扣與地形戰場效果連動規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0550 落地，綠色TP減半無條件進位、水域合攻50%追擊、大霧100%必中與林地移動+1確立 |
