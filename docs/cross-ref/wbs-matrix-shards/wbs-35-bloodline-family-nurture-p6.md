# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.5 血統家族培育（6/9）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.5 血統家族培育（6/9）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.5 5. 血統、家族與培育傳承 (Bloodline, Family & Nurture) · 第 6/9 段

> 續上段（表頭重複）。工作包 LIFE-06 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **LIFE-06** | M4 | 身後傳承結算（死亡快照→英靈卡→虎符卡→寫入宗族與兵符倉） | logic | 4 | ✅ 已驗收 | LIFE-04 | 名將死亡同步產出英靈卡與虎符卡，已先退役者死亡時補發，測試涵蓋 | [master fb02ff9 重估] tests/Legacy.test.ts、LegacyTally.test.ts（run-cli 通過） |  |
| **LIFE-07** | M4 | 退役轉教官流程（確認 UI、保種結緣後轉卡片、不直接產卡） | logic | 3 | ✅ 已驗收 | LIFE-03, MENT-01 | 65 歲玩家可選擇退役轉教官卡，產生 Source=Retire 教官，且不產英靈/虎符卡 | [master fb02ff9 重估] tests/Legacy.test.ts（run-cli 通過） |  |
| **LIFE-08** | M8 | 延壽丹道具（延長 Max_Lifespan 1~5 歲及限制） | logic | 2 | 🟢 已接線 | LIFE-01 | 使用延壽丹提高 Max_Lifespan 並受次數/上限規則限制 | assets/scripts/core/systems/LongevityPill.ts（useLongevityPill，延壽 +3 歲暫定）；GameSession.useLongevityPillOnGeneral；ui/core/LongevityPillController.ts；tests/LongevityPill.test.ts、LongevityPillController.test.ts | [v17.0 更正 2026-11-07] 未開始→已接線；延壽丹邏輯與 UI 控制器早已入庫（PROG-2-1347／1348，#1150／#1151），本列漏更 |
| **LIFE-09** | M1 | 壽命消耗雙軌（不老哲學：僅主動指令消耗，培育 1 月/攻城 3 月/結緣 6 月） | logic | 3 | ✅ 已驗收 | LIFE-02 | 規則與每季增齡裁決後，主動指令依表扣月數，放置不消耗 | [v4 核對 2026-10-13] LifespanCost.ts 主動指令壽命消耗（培育 1 月/攻城 3 月/結緣 6 月）接 LifespanWiring（PROG-2-0221/0237）；tests/LifespanCost.test.ts、LifespanWiring.test.ts、SiegeLifespan.test.ts 通過 |  |
| **LIFE-10** | M7 | 精力與戰場軟懲罰（>50%/10~50%/<10% 禁用終極/主動戰法，撤退風險） | logic | 3 | ✅ 已驗收 | VIT-01 | 戰場依精力區間限制主動戰法並提高撤退風險，普攻移動不受限 | [v8 核對 2026-10-15] 戰場精力軟懲罰（051dd746）、戰法施放精力閘門（28423d05）、出陣精力帶入（877cfd29）、奧義扣精力（47de4762）；VitalityBattleGate 5 處呼叫端與測試；撤退風險 RetreatRisk 已接線 |  |
| **LIFE-11** | M9 | 演武聖境（死後精華快照，保值名將） | logic | 3 | ✅ 已驗收 | LIFE-06 | 死亡名將可保留精華並轉為可繼承資源，數值係數釐清後實作 | [v9 核對 2026-10-15] 演武聖境 LegacyArena 呼叫端（#429，0802）與 3 個測試檔；精華快照與付費復活純邏輯 |  |
| **LIFE-12** | M9 | 不老傳說活動（突破壽命上限 161 季） | logic | 2 | 🟢 已接線 | LIFE-01 | 活動期間壽命上限可突破並可回收 | 規格見 doc_spec_0316；161 季上限突破與 2 季慈悲恩典回收協議已定案 | [v17.0 更正 2026-11-07] 未開始→已接線；規格 doc_spec_0316 定案 |
| **LIFE-13** | M10 | 壽命與階段劇本文案/字串（少年/壯年/老年/退役/死亡/身後結算） | content | 1 | ✅ 已驗收 | - | 文案 Key 進 i18n 並在事件觸發時顯示 | [v9 核對 2026-10-15] 壽命劇本 LifeScriptCopy 呼叫端與四語系字串（#423，0800）；LifeScriptCopy 2 處呼叫端與 2 個測試 |  |
| **GEN-01** | M0 | 武將基礎資料結構（UID/Template_ID/Title/性別/年齡/六色屬性/Role/Status）統一入口 generals.json + GeneralConfig | data | 3 | ✅ 已驗收 | - | 235 位武將資料載入通過驗證器，欄位含 templateId/title/stats/role/status | assets/resources/data/generals.json（235 筆，皆含 templateId、stats、status）；assets/scripts/core/models/GeneralUnit.ts（GeneralConfig）；tools_node/validate-generals-data.js |  |
| **GEN-02** | M2 | 遺傳因子槽 GeneObject（Type/ID/Level/Is_Locked/Discovery_Level）資料與讀寫 | data | 2 | 🟢 已接線 | GEN-01 | 每位武將 genes 欄位含 3~5 個結構化因子並可序列化 | [v7 核對 2026-10-14] GeneObject 由 PlayerRosterService 存讀呼叫（genesForSave／genesFromSave）；GeneralUnit 尚未改用 GeneObject |  |
| **GEN-03** | M2 | 血統家族樹（Father_ID/Mother_ID/Bloodline_ID/14 人 Ancestors）與 BloodlineGraph | logic | 4 | ✅ 已驗收 | GEN-01 | 任一武將可取得完整 14 人祖譜；子嗣註冊後祖譜上移一代 | assets/scripts/core/services/BloodlineGraph.ts（master 已有）；/tmp/integ/tests/Breeding.test.ts『BloodlineGraph：真實 registry 的關羽有完整 14 人祖譜』『registerChild 後子嗣祖譜…』（pr_only 測試）；person-registry.json |  |
| **GEN-04** | M2 | 爆發力 EP 公式（共鳴+15/異脈+20/契合+25；精力+10/LUK 浮動待補） | logic | 3 | 🟢 已接線 | GEN-03, KIN-04 | computeEpMvp 與完整版 EP 在固定輸入下輸出正確加成，測試通過 | [master fb02ff9 重估] BreedingSystem.ts EP_* 常數與 calc（PROG-2-0026） |  |
| **GEN-05** | M1 | 精力系統（消耗、季度回補、待命加速）與資料欄位 vitality/maxVitality | logic | 3 | 🟢 已接線 | GEN-01 | 戰鬥/結緣/培育扣精力，季度回補依出征/待命比例，不超過上限 | [master fb02ff9 重估] BattleRoster.ts、BreedingSystem.ts 精力消耗與回復 |  |
| **GEN-06** | M3 | 職能雙軌分流（戰鬥武將 vs 專業教官）資料與規則裁決 | logic | 2 | ✅ 已驗收 | GEN-01 | Role=Combat/Mentor 規則統一（含轉職/退役切換裁決）並寫入模型與驗證 | [v6 核對 2026-10-14] 職能雙軌分流歸類與不可變更規則（f62c4ed4）；讀檔正規化（fe59432c）；入名冊套用（e50ee85b）；GeneralRole 與 RosterRoleLoad 有呼叫端與測試 |  |
| **GEN-07** | M1 | 生命週期狀態機（出生→開獎→成年→巔峰→衰老→退役） | logic | 3 | ✅ 已驗收 | GEN-01, LIFE-02 | 狀態轉換由年齡與事件驅動並可存檔還原 | [v5 核對 2026-10-14] GeneralStage.ts 生命週期狀態機接上 GeneralLifecyclePresenter（PR #149，武將詳情與培育顯示生命週期）；tests/GeneralStage.test.ts 通過 |  |
| **GEN-08** | M2 | 因子覺醒（Is_Locked 解鎖條件、碎裂特效） | logic | 3 | 🟢 已接線 | GEN-02 | 因子槽三態轉換(鎖定/裂紋/覺醒)、三大觸發源與碎裂特效契約定案 | 已由 doc_spec_0328 確立因子槽三態狀態機、戰鬥斬將(15%+LUK)/培育/里程碑三大觸發公式與碎裂演出協議 | [v17.6 更正 2026-11-07] 規格 doc_spec_0328 定案 |
| **GEN-09** | M10 | 武將詳情頁 GeneralDetailComposite 與 Skills 分頁資料流（tacticSlots/ultimateSlots → master） | ui | 4 | 🟢 已接線 | GEN-01 | 詳情頁各分頁掛載成功，Skills 分頁直接消費 GeneralConfig 槽位與 master library | assets/scripts/ui/components/general-detail/*（Basics/Stats/Aptitude/Bloodline/Skills/Extended/Overview）；tests/ucuf/compositePanel.test.ts；GeneralDetailSkillsChild.ts |  |
| **GEN-10** | M2 | 稱號系統（Template_ID+Title 辨識同名不同版本） | data | 1 | ✅ 已驗收 | GEN-01 | 所有武將具 title 並於 UI 顯示『名稱・稱號』 | [v6 核對 2026-10-14] 稱號顯示格式與同名辨識（4fba11f7）；名稱接上稱號 UI（493ba48a）；GeneralTitle 2 處呼叫端 |  |
| **GEN-11** | M3 | 六色屬性成長曲線（年齡-屬性衰減、巔峰期加成） | logic | 2 | ✅ 已驗收 | LIFE-02 | 依年齡階段修正屬性，與 LIFE-02 係數一致 | [v6 核對 2026-10-14] 六色屬性依年齡階段修正（0dac2cd8）；武將年齡接入戰力與詳情（4ef0915f）；GeneralGrowth 2 處呼叫端 |  |
| **GEN-12** | M2 | 近親警告與 Inbreeding 判定（同源血脈警示） | logic | 1 | 🟢 已接線 | GEN-03 | 3 代內共同祖先禁止結緣，同 Bloodline_ID 子嗣 Vitality_Max×0.7，UI 警告可顯示 | [v5 核對 2026-10-14] 同源血脈警告接上結緣血緣列（01578ada，PROG-2-0317）；判定與 UI 文字已接，測試見 BondingSetup.test.ts |  |
| **GEN-13** | M9 | 演武筆記（升級/千人斬產出戰法筆記交教官） | logic | 2 | 🟢 已接線 | GEN-06 | 達成條件產出筆記物件並可交給教官轉化 | [v11 核對 2026-10-20] 戰後里程碑發戰法筆記（50fcd7c0、931ddc6e，PROG-2-0816/0817）；MilestoneRewards 與 PlayerInventory 接 GameSession，BattleNoteGrant 測試存在。升級來源未核對 |  |
| **GEN-14** | M10 | 武將劇本台詞（5 歲開獎天象、退役語錄、英靈告別、大器晚成批語、職能分流選擇） | content | 2 | 🟢 已接線 | - | 台詞 Key 進 i18n 並於對應事件顯示 | FarewellLetterInbox、LateBloomClue、Unveiling 台詞 | [v17.3 更正 2026-11-07] 純邏輯→已接線；已由 doc_spec_0312 補齊英靈告別三檔原文、天象與四向宿命劇本庫 |
| **KIN-01** | M2 | 關係類型與 Schema 定義（史實 5 種+動態 4 種） | data | 1 | ✅ 已驗收 | - | HistoricalRelation/DynamicRelation 型別與 JSON schema 完成 | [v7 核對 2026-10-14] KinRelation 關係 Schema（58403015）與測試，5 處呼叫端 |  |
