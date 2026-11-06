<!-- doc_id: doc_index_1054 -->
# 3KLife WBS 全量功能進度盤點矩陣 (v16.9)

> 本檔由 `3KLife-WBS-2026-10-14-v16.9.csv` 結構化轉檔生成，登錄為 `doc_index_1054`。
> 匯整全專案 783 項工作包之工時、依賴、驗收條件、現況證據與多版本核對歷程。
> 自動維護關聯：`docs/cross-ref/cross-ref-進度.md (doc_index_0017)`、`docs/doc-id-registry.md`。

---

## §1. 全案 WBS 執行率與健康度儀表板 (Dashboard)

### 1.1 核心總覽指標

| 指標項目 | 數值 / 統計 | 說明 |
|---|---|---|
| **總工作包數** | **783** 項 | 涵蓋遊戲戰鬥、數值、內政、血統、大廳、UI 與底層全系統 |
| **總預估工時** | **2057.5** 小時 (約 257.2 人天) | 專案全週期總工程量預算 |
| **✅ 已驗收** | **131** 項 (16.7%) | 已通過實機驗收、單元測試且具備完整證據 |
| **🟢 已接線** | **333** 項 (42.5%) | 邏輯代碼已落地並與相鄰模組/場景串接，待進一步驗收 |
| **🟡 純邏輯** | **82** 項 (10.5%) | 邏輯類別/函數已撰寫，尚缺前端 UI 或呼叫鏈接線 |
| **📄 僅資料** | **44** 項 (5.6%) | 僅有 JSON/配置檔定義，等待邏輯消費 |
| **⚪ 未開始** | **193** 項 (24.6%) | 待排期或等待前置依賴完成之項目 |
| **🚀 實作覆蓋率** | **59.3%** | (已驗收 + 已接線) 合計 464 項，已達專案六成基底 |

### 1.2 里程碑進度達成看板 (M0 ~ M11)

| 里程碑 | 項目總數 | 工時(h) | 已驗收 | 已接線 | 純邏輯 | 僅資料 | 未開始 | 交付達成率 (已驗收+已接線) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **M0** | 25 | 47.0 | 7 | 9 | 6 | 1 | 2 | **64.0%** |
| **M1** | 28 | 60.0 | 13 | 12 | 3 | 0 | 0 | **89.3%** |
| **M2** | 57 | 137.0 | 17 | 33 | 3 | 0 | 4 | **87.7%** |
| **M3** | 45 | 116.0 | 19 | 23 | 2 | 1 | 0 | **93.3%** |
| **M4** | 17 | 44.5 | 10 | 7 | 0 | 0 | 0 | **100.0%** |
| **M5** | 39 | 99.5 | 13 | 25 | 1 | 0 | 0 | **97.4%** |
| **M6** | 35 | 95.0 | 8 | 24 | 3 | 0 | 0 | **91.4%** |
| **M7** | 100 | 290.0 | 10 | 55 | 14 | 8 | 13 | **65.0%** |
| **M8** | 77 | 184.0 | 9 | 32 | 3 | 5 | 28 | **53.2%** |
| **M9** | 140 | 367.5 | 16 | 47 | 13 | 3 | 61 | **45.0%** |
| **M10** | 148 | 414.0 | 4 | 60 | 18 | 22 | 44 | **43.2%** |
| **M11** | 72 | 203.0 | 5 | 6 | 16 | 4 | 41 | **15.3%** |

### 1.3 類型分佈 (Work Package Types)

| 類型代碼 | 工作類型 | 數量 | 佔比 | 重點關注 |
|:---:|---|:---:|:---:|---|
| **logic** | 業務邏輯與系統控制器 | 408 | 52.1% | 狀態機、戰鬥運算、事件分派、資料轉換 |
| **ui** | 介面佈局與視覺渲染 | 136 | 17.4% | CompositePanel、ChildPanel、UCUF 節點元件 |
| **data** | 靜態資料表與 Schema | 80 | 10.2% | JSON 配置、表格一致性、常數定義 |
| **content** | 遊戲內容與劇本文案 | 72 | 9.2% | 武將故事、戰鬥台詞、日常事件、名士預言 |
| **server** | 通訊與資料同步 | 51 | 6.5% | 存讀檔、網路同步、離線收益運算 |
| **tool** | 自動化工具與管線 | 20 | 2.6% | 裁切工具、規格校驗、Cross-ref 掃描 |
| **test** | 自動化測試套件 | 16 | 2.0% | 單元測試、整合測試、回歸守護 |

---

## §2. 優先缺口與待接線速查 (Top Priority Backlog)

> 本表篩選出標記有 **缺口優先序** 或 **待接線序** 的關鍵項目，供隊長派工或協作者開卡優先參考。

| ID | 里程碑 | 工作包 | 狀態 | 缺口優先序 | 待接線序 | 依賴 | 驗收條件簡述 |
|---|:---:|---|:---:|:---:|:---:|---|---|
| **TIME-11** | M8 | 付費延壽丹/時間加速/季末禮包 | ⚪ 未開始 | 1 | - | TIME-03 | 道具可延壽 1~2 季或跳過治理季... |
| **FBR-09** | M2 | 因子變異 Star Jump（Q38）與洗因子商業鉤 | 🟡 純邏輯 | - | 1 | FBR-03 | 混血配種低機率星等跳升（如 3→5），不跨色轉化... |
| **BRD-13** | M8 | 結緣商業道具（補元散、安胎藥/送子符、求籤令、成長環境） | ⚪ 未開始 | 2 | - | BRD-03 | 道具可修改精力/受孕率並消耗... |
| **NUM-04** | M0 | 數值常數集中化 NumericalConfig JSON + FormulaRegistry（I 節） | 🟡 純邏輯 | - | 2 | - | Counter/Aptitude/Age/Reincarnation/Ult/Tally ... |
| **FUL-08** | M8 | 先知陷阱（預覽準確率≠100%）與解鎖加速道具/覺醒催化劑 | ⚪ 未開始 | 3 | - | FUL-07 | 預覽有可配置誤差，道具可調整機率... |
| **TERM-01** | M0 | ID 命名契約驗證器（UID/Template_ID/Bloodline_ID/Gene_ID/V_PID/SIGIL/SPIRIT_TALLY/ATM-ID） | 🟡 純邏輯 | - | 3 | - | validate 工具對 generals/gene-dictionary/bloodli... |
| **LIFE-08** | M8 | 延壽丹道具（延長 Max_Lifespan 1~5 歲及限制） | ⚪ 未開始 | 4 | - | LIFE-01 | 使用延壽丹提高 Max_Lifespan 並受次數/上限規則限制... |
| **GDP-10** | M0 | 管線工具測試與 CI 整合 | 🟡 純邏輯 | - | 4 | GDP-03, GDP-04 | ingest→merge→validate 以 fixture 跑端到端並進 comput... |
| **VIT-08** | M8 | 月卡精力+20%、待產縮短道具（商業化） | ⚪ 未開始 | 5 | - | VIT-03 | 月卡狀態使回復×1.2，待產縮短道具減少剩餘季數... |
| **DS-02** | M1 | General 主結構欄位落地（Template_ID/Phase/Talent_Stats/Prowess_Stats/Genes/Ancestors_JSON/Profile_Presentation 等） | 🟡 純邏輯 | - | 5 | DS-01 | GeneralUnit 型別與 generals.json 涵蓋規格範例全部欄位並通過 s... |
| **LIFE-12** | M9 | 不老傳說活動（突破壽命上限 161 季） | ⚪ 未開始 | 6 | - | LIFE-01 | 活動期間壽命上限可突破並可回收... |
| **DS-04** | M1 | Data.* 子系統掛載點骨架（培育/結緣/教官/經濟/時間/治理/大廳/日誌/他國/官職等約 25 條路徑） | 🟡 純邏輯 | - | 6 | DS-01 | Root Data 預設值含全部掛載路徑，缺漏欄位由 Migration 補齊... |
| **FATE-09** | M10 | 因子色彩對應職能視覺化（卡片） | ⚪ 未開始 | 7 | - | FATE-05 | 武將卡片上藍/粉因子色彩與職能標籤對應，色彩表有文件... |
| **DS-07** | M1 | 2-2 補充欄位列舉驗證（Revelation_Level、Breeding_Mode、Default_Tab、Pool_Positioning 等 34 條） | 🟡 純邏輯 | - | 7 | DS-04 | 所有列舉欄位寫入非法值被驗證器拒絕，附測試... |
| **GEN-14** | M10 | 武將劇本台詞（5 歲開獎天象、退役語錄、英靈告別、大器晚成批語、職能分流選擇） | ⚪ 未開始 | 8 | - | - | 台詞 Key 進 i18n 並於對應事件顯示... |
| **GDUI-07** | M2 | 五階血脈傳承奧義邏輯：Stage_Cap/Stage_Current、名聲+事蹟點亮、升星開上限 | 🟡 純邏輯 | - | 8 | - | 升星僅改 Stage_Cap、覺醒僅改 Stage_Current，名聲 100/300/... |
| **LUK-01** | M2 | LUK 屬性資料（Stats.luk、LUK_Max、前期隱藏旗標） | 🟡 純邏輯 | - | 9 | - | 武將資料含 luk 與 Is_Visible，LUK_Max 由紫因子計算... |
| **REV-03** | M0 | 教官系統 VIT_Max→Vitality_Max 統一（2.6，P0） | 📄 僅資料 | 9 | - | - | 全部規格與程式僅用 Vitality_Max... |
| **TRP-15** | M7 | 虎符特殊戰法執行（34 條兵種專屬戰法接 BattleSkill 管線） | 🟡 純邏輯 | - | 10 | TRP-04 | 每條虎符戰法對應 battleSkillId 並有 smoke 測試... |
| **APT-10** | M2 | 白色因子→天氣抗性/免疫 | ⚪ 未開始 | 10 | - | APT-09 | 白色因子提供特定天氣免疫或加成... |
| **LUK-03** | M2 | 紫色因子定義與 LUK 上限（50+等級×10） | 🟢 已接線 | 11 | - | LUK-01 | 紫因子 ★5 時 LUK_Max=100... |
| **NUM-02** | M7 | 單挑接受判定與拒絕懲罰（score≥0.58） | 🟡 純邏輯 | - | 11 | NUM-01 | score=0.45HP+0.35兵力+0.2戰力，≥0.58接受；拒絕全軍攻防與HP減半... |
| **REV-04** | M2 | 宿敵 EP 懲罰、組合奧義、混種戰法交叉引用（2.7~2.9） | ⚪ 未開始 | 12 | - | - | 三項規格決議並回寫相關規格書... |
| **KIN-05** | M2 | 宿敵配種『狼性』白色因子引入 | ⚪ 未開始 | 13 | - | KIN-04 | 宿敵配對有機率給予子嗣狼性白色因子... |
| **GCH-11** | M3 | 支援卡教官被動技能驗證與教官碎片/碎片庫 | 📄 僅資料 | 14 | - | GCH-02 | SR/SSR 支援卡被動技能經驗證載入；重複卡分解為教官碎片進碎片庫並可合成低稀有支援卡... |
| **TRP-04** | M7 | 特殊兵種資料表（16 通用 + 18 專屬共 34 筆）含戰法/Skin/血脈欄位 | 📄 僅資料 | 15 | - | TRP-01 | TroopDef 34 筆含 Is_Special/Required_Tally/Bloo... |
| **DEP-12** | M7 | 場景 preset 對部署權重影響與 Q64 虎符 Set 羈絆 | ⚪ 未開始 | 16 | - | SCN-02, DEP-11 | 攻城戰保留器械槽；集齊五虎將符觸發同場加成... |
| **KIN-09** | M7 | 合攻聯動（義兄弟/夫妻相鄰格合攻+30%） | 🟢 已接線 | 17 | - | KIN-06 | 相鄰格有義兄弟時合攻觸發率+30% 並有戰場演出... |
| **TRP-01** | M7 | 七大基礎兵種數值與特性定義（騎/步/弓/盾/槍/水/機械） | 📄 僅資料 | 18 | - | - | troop-definitions 與 troops.json 含七兵種 Attack/D... |
| **TERM-07** | M7 | 虎符 Q61~Q65 裁決欄位約束（糧耗、Set 羈絆、無冷卻、無 TallyCategory） | ⚪ 未開始 | 19 | - | TERM-03 | TALLY_GRAIN_COST 與 SET_BONUS_DEFS 為單一常數來源，sch... |

---

## §3. 分模組全量工作包清單 (Module Breakdown Tables)

### 3.1 1. 戰鬥核心系統 (Battle Core)

> 涵蓋兵種虎符、武將奧義、守軍戰力、督軍技能、關卡進程、戰法連鎖、場景機制、戰場部署、適性影響與戰術 AI。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **TRP-01** | M7 | 七大基礎兵種數值與特性定義（騎/步/弓/盾/槍/水/機械） | data | 2 | 📄 僅資料 | - | troop-definitions 與 troops.json 含七兵種 Attack/Defense/Move/Range 並通過 schema 驗證 | assets/resources/data/troops.json 僅有 cavalry/infantry/shield/archer/pikeman/engineer/medic/navy 八鍵（含 engineer/medic、缺 SIEGE 機械）；assets/resources/data/master/troop-definitions.json 的 data[] 為空陣列 |  |
| **TRP-02** | M7 | 五角兵種剋制與機械被近戰剋制傷害倍率 | logic | 2 | ✅ 已驗收 | TRP-01 | 單元測試覆蓋 5 組剋制 ×1.3、反向 ×0.8、近戰剋機械 ×1.5 | [v6 核對 2026-10-14] 兵種剋制表改為規格五角、機械被近戰 ×1.5（4fa7790c，PROG-2-0341）；反向被剋 ×0.8（d24c6b90，PROG-2-0340）；FormulaSystem 與戰場接線 |  |
| **TRP-03** | M5 | 武將兵種適性指揮效率（S1.2~D0.8）套用至部隊攻防 | logic | 1 | ✅ 已驗收 | TRP-01 | 部隊攻防 = 基礎 × APTITUDE_MOD[適性]，測試覆蓋 S~D | [v3 核對 2026-10-13] BattleAptitude.ts 接入 BattleCombatResolver.getUnitAptitude；tests/BattleAptitude.test.ts 含「S 平原騎兵比 D 更痛」戰場回歸 |  |
| **TRP-04** | M7 | 特殊兵種資料表（16 通用 + 18 專屬共 34 筆）含戰法/Skin/血脈欄位 | data | 3 | 📄 僅資料 | TRP-01 | TroopDef 34 筆含 Is_Special/Required_Tally/Bloodline_Beast_ID/Sigil_Pattern_ID/Spirit_Face_Style，schema 驗證通過 | assets/resources/ui-spec/content/elite-troop-codex-v1.json 34 筆名錄（僅 UI 文案，非 TroopDef）；master/troop-definitions.json 為空 |  |
| **TRP-05** | M8 | 虎符資料模型與背包（TigerTally/PlayerTallyCollection/Server 表） | data | 3 | 📄 僅資料 | TRP-04 | TigerTally 型別、本機存檔結構與 server DDL 落地並可序列化 | assets/scripts/shared/TallyCardContract.ts 僅為卡面 UI 契約（TallyCardData），無 Quality/Star/Equipped_General_UID 等欄位 |  |
| **TRP-06** | M4 | TigerTallyScore 品質映射（0.7 戰績+0.3 傳承；R/SR/SSR/UR 門檻） | logic | 1 | ✅ 已驗收 | TRP-05 | 純函式測試：分數 39/40/65/85 邊界對應品質 | [v4 核對 2026-10-13] TigerTallyScore 品質映射（既有）；陣亡分數權重暫定於 TallyDeathSettlement.ts（PROG-2-0236）；戰績分來源仍為暫定 |  |
| **TRP-07** | M4 | 虎符三進路產出（死亡結算/招降移交/封賞結算） | logic | 4 | ✅ 已驗收 | TRP-05, TRP-06 | 死亡結算產卡、招降隔季移交、勝無退路君主獲封賞各有整合測試 | [master fb02ff9 重估] tests/TigerTally.test.ts、LegacyTally.test.ts（run-cli 通過） |  |
| **TRP-08** | M5 | 虎符裝備/卸下/轉交與唯一持有、君主沒收、陣亡退回君主 | logic | 3 | ✅ 已驗收 | TRP-05 | 一將一符、一符一將、死亡自動退君主、沒收觸發降忠，單元測試通過 | [v4 核對 2026-10-13] TigerTallyHoldings.ts（一符一將、陣亡退回君主、沒收）接 GameSession/LegacyService（PROG-2-0233/0235/0236/0239）；tests/TigerTallyHoldings.test.ts、TigerTally.test.ts 通過 |  |
| **TRP-09** | M5 | 虎符拔除/換上忠誠度與反洗機制（每季1次、連續×1.5、轉蛋名將鎖100） | logic | 2 | ✅ 已驗收 | TRP-08 | 依品質增減忠誠、clamp 0~100、連續兩季×1.5，忠誠<30拒命/<10叛變機率可測 | [v4 核對 2026-10-13] TigerTallyLoyalty 接 GameSession 與存檔（PROG-2-0218）；BattleController.ts 忠誠<30 每回合拒令（PROG-2-0219）；tests/TigerTallyLoyalty.test.ts、TigerTallyWiring.test.ts 通過；換上/拔除 UI 未核對 |  |
| **TRP-10** | M7 | 虎符星級養成 1~3★ 戰鬥經驗升星（含品質封頂與 +8%/★） | logic | 2 | 🟢 已接線 | TRP-05 | 累積 100/350 經驗自動升 2/3★；R 封頂 3★；星級倍率 1.08~1.40 | [v7 核對 2026-10-14] TigerTallyStar 接卡片實例星級與戰鬥經驗（06a3b38a、ccc4a29f，PROG-2-0571），4 處呼叫端；升星 UI 未核對 |  |
| **TRP-11** | M8 | 4~5★ 虎符精華突破（成功率80/50、保底符、UR+10%、失敗扣材料） | logic | 2 | 🟢 已接線 | TRP-10 | 突破扣金幣與精華、成功率與失敗規則經測試，保底符 100% | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **TRP-12** | M7 | 虎符糧草消耗表與戰場召喚扣糧/扣投入兵力/糧不足8折 | logic | 3 | 🟢 已接線 | TRP-05 | 召喚虎符部隊同時扣糧草（品質×星級查表）與出征軍勢兵力；季末糧<50 次場8折 | [v6 核對 2026-10-14] 虎符糧不足 8 折接線（e4f8a267，PROG-2-0331）；糧草消耗表既有 |  |
| **TRP-13** | M7 | 虎符適性乘數（地形S~D、家族共鳴+8%、史實羈絆+5%、性別+6%） | logic | 2 | ✅ 已驗收 | TRP-05 | getTallyAffinityMod 測試覆蓋地形/家族/性別組合 | [v6 核對 2026-10-14] 虎符適性乘數接上戰場管線（7e3a73b0）與出陣 UI 帶入參數（f5762a7d）；TallyDeployAffinity 1 處呼叫端、測試通過 |  |
| **TRP-14** | M7 | Set 羈絆（五虎將/江東十二虎臣/曹魏五謀）判定與攻防加成 | logic | 2 | 🟢 已接線 | TRP-04, TRP-12 | getActiveSets 以在場虎符部隊（含好友）判定，同 Set 不疊加，BattleController 套用加成 | [v7 核對 2026-10-14] TigerTallySetBonus 接戰場 BattleCombatResolver（915a50b5，PROG-2-0574）；陣容面板 UI 未核對 |  |
| **TRP-15** | M7 | 虎符特殊戰法執行（34 條兵種專屬戰法接 BattleSkill 管線） | logic | 5 | 🟡 純邏輯 | TRP-04 | 每條虎符戰法對應 battleSkillId 並有 smoke 測試 | assets/scripts/battle/skills/adapters/TigerTallyTacticAdapter.ts（buildRequest）；tests/BattleSkillSourceTranslator.test.ts；34 條戰法本身未逐條落地 |  |
| **TRP-16** | M10 | 虎符卡面 UI：名錄、詳情、卡片顯示投入兵力/糧耗/星級倍率 | ui | 4 | 🟢 已接線 | TRP-04 | EliteTroopCodex 34 筆可瀏覽；卡面顯示投入兵力、糧草、星級倍率、場上限制 | assets/scripts/ui/components/EliteTroopCodexComposite.ts、TigerTallyComposite.ts、TigerTallyDetailComposite.ts、TigerTallyPanel.ts；ui-spec screens elite-troop-codex-screen.json/tiger-tally-screen.json；糧耗/投入兵力欄位未見 |  |
| **TRP-17** | M10 | troops_*.png 八張部隊卡圖量產與 fallback 規則 | content | 2 | 🟢 已接線 | - | assets/resources/ui/tiger-tally/card-art/ 含 8 張 287x142 troops_<type>.png，缺圖退回 troops.png | [v16.4 核對 2026-10-27] 程式已接線（戰場線已完成）；缺美術資產：troops_*.png 八張部隊卡圖 ；規格宣稱已交付，但 git 內僅有 card-art/troops.png 與 talisman/01~NN.png，無 troops_cavalry.png 等；docs/tasks/battle-ui-p1-tally-card-art-troops-fix_task.md |  |
| **TRP-18** | M10 | 英靈插卡演出（祖紋亮起→靈獸虛影→英靈面→軍勢進場）與血脈紋樣一致性 | ui | 4 | 🟢 已接線 | TRP-16 | 插卡流程四段演出可播放，旗紋/兵牌/卡面共用同一 Sigil_Pattern_ID | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（純邏輯）；待 QA／實機驗收 | 純邏輯→已接線；#1320 TallyInsertTarget 接 CharacterDs3AptitudeChild；演出部分未逐項核對 |
| **TRP-19** | M10 | 兵種/虎符 UI 字串與劇本文案（G/H 節 Key 落地） | content | 1 | 🟡 純邏輯 | - | UI_TALLY_*、UI_TROOP_* 等 Key 進入 i18n 且畫面引用 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **TRP-20** | M9 | 虎符名錄圖鑑（P2）與委任AI虎符出展策略（依智力，細節歸 doc_spec_0040） | logic | 3 | ⚪ 未開始 | TRP-12 | 圖鑑記錄已獲虎符；委任模式依智力/糧草決定出展時機 | EliteTroopCodex 為靜態 34 筆名錄，無「已獲」狀態；委任 AI 無 |  |
| **ULT-01** | M7 | 奧義母表 ultimate-definitions.json（13 名將×5 槽=65 條）與 ultimateSlots 對齊 | data | 2 | ✅ 已驗收 | - | 65 條皆有 id/templateId/slot/scalingStat/inheritanceGeneId，schema 驗證通過 | assets/resources/data/master/ultimate-definitions.json 共 65 條；tools_node/generate-ultimate-definitions.js；tools_node/validate-generals-data.js |  |
| **ULT-02** | M7 | 專屬奧義綁定（templateId↔ultimateSlots，runtime generals.json） | data | 1 | 🟢 已接線 | ULT-01 | GeneralUnit.ultimateSlots 由 generals.json 載入，GeneralDetail 可查表 | assets/scripts/core/models/GeneralUnit.ts ultimateSlots；assets/scripts/ui/components/general-detail/GeneralDetailSkillsChild.ts；BattleSceneLoader.ts:511 |  |
| **ULT-03** | M7 | 轉生解鎖邏輯（1~5 轉開奧義欄位、屬性上限 1000~1500） | logic | 2 | 📄 僅資料 | ULT-02 | 依轉生次數回傳已解鎖槽位，存檔寫入 Is_Unlocked | ultimateSlots 有 isLocked 欄位；轉生/重複抽卡機制本身未見（grep reincarnation 無執行邏輯） |  |
| **ULT-04** | M7 | 精力消耗與施放前置檢查（5~10%，不足阻擋、戰鬥限用1次） | logic | 2 | 🟢 已接線 | ULT-03 | 施放扣精力百分比、精力不足提示、每場限用1次，單元測試覆蓋 | 規格 F-3-0-1 自述『驗證 SP 滿條件』未打勾；程式 BattleScene 以 SP 能量而非精力%（無 vitalityCostPct 運算） | 未開始→已接線；v16.9 協調線回報：#1267／PROG-2-1451 完成；UltimateDamage 由 BattleSkillDispatcher 呼叫 |
| **ULT-05** | M7 | 奧義傷害公式 base_power×(1+lv×0.15)×stat_modifier | logic | 1 | 🟢 已接線 | ULT-01 | 公式函式與 BattleSkillDamageResolver 整合，測試覆蓋 5 檔 base_power | assets/scripts/battle/skills/BattleSkillDamageResolver.ts；tests/BattleSkillDamageResolver.test.ts（未確認使用 ult_level×0.15 公式） | 純邏輯→已接線；#1451/#1453 UltimateDamage 接 BattleSkillDispatcher |
| **ULT-06** | M7 | Battle target policy（targetMode/manualTargeting/autoAimMode）與固定範圍直接施放 | logic | 3 | ✅ 已驗收 | ULT-01 | 12 個已綁定 battleSkillId 的 target policy 快照與 selector 一致 | assets/scripts/battle/skills/BattleSkillTargetSelector.ts；tests/BattleSkillTargetSelector.test.ts、BattleSkillProfileAutoTargeting.test.ts、BattleControllerSkillTargeting.test.ts |  |
| **ULT-07** | M7 | BattleScene 奧義按鈕列表與 SkillSourceType.Ultimate 統一入口 | ui | 3 | 🟢 已接線 | ULT-06, ULT-04 | SP 滿時按鈕可按、施放後 SP 歸零、與 legacy general skill 不混用 | assets/scripts/ui/components/UltimateSelectPopup.ts、UltimateSelectPopupComposite.ts、battle/views/BattleUIBridge.ts:495、BattleSkillTargetingFlow.ts；規格 checklist 該三項仍未勾 |  |
| **ULT-08** | M7 | UBURST/UTEAMBUFF/UTEAMHEAL/USINGLE 首批家族 resolver（P0 首批可玩包） | logic | 5 | 🟢 已接線 | ULT-06 | 四家族 unit test 通過，各自代表奧義 smoke 可施放 | assets/scripts/battle/skills/resolvers/BuffDebuffSkillResolver.ts、HealSkillResolver.ts、ProjectedDamageSkillResolver.ts；tests/BattleSkillExecutor.test.ts（含 liu-bei-rally ally-all）；65 條中僅 61 條有 battleSkillId，執行家族覆蓋不全 | 純邏輯→已接線；協調線指示：已由既有 BattleSkillProfiles 路徑覆蓋，結案 |
| **ULT-09** | M7 | UALLDEBUFF/UAREA/UCONTROL 戰場策略包 resolver | logic | 5 | 🟢 已接線 | ULT-08 | 三家族 unit test + 代表奧義（諸葛亮、周瑜、貂蟬）smoke | assets/scripts/battle/skills/resolvers/CounterSkillResolver.ts、LinkSkillResolver.ts、ResetSkillResolver.ts；tests/BattleSkillExecutor.test.ts；沉默/魅惑/偷行動條未見 | 純邏輯→已接線；協調線指示：已由既有 BattleSkillProfiles 路徑覆蓋，結案 |
| **ULT-10** | M7 | USPECIAL 高階規則包（復活、增益轉移、行動條重置、死亡觸發、場勢切換） | logic | 5 | ⚪ 未開始 | ULT-09 | 白名單特殊規則逐項單元測試，battle state 重算 | 部分 Reset/Counter resolver 可能相關，但復活/增益轉移/死亡觸發無實作 |  |
| **ULT-11** | M0 | shared runtime contract（shared/skill-runtime.ts 與 schema） | data | 1 | 🟢 已接線 | - | SkillRuntimeContract 型別與 JSON schema 同步，ultimate-definitions 加 family/coeff/duration/cinematicProfile | [v16.8 更正 2026-10-28] SkillRuntimeContract 的 family、coefficient、durationTurns 欄位由 BattleController、BattleSkillDispatcher 使用，ultimate-definitions.json 含 family |  |
| **ULT-12** | M10 | 奧義演出系統（全屏特效、鏡頭、BattleCry、HUD/battle log 文案） | ui | 5 | 🟢 已接線 | ULT-07 | 每家族至少一套 cinematicProfile 可播放，battle log 與說明一致 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **ULT-13** | M7 | 委任/敵方 AI 按家族施放奧義規則 | logic | 3 | 🟢 已接線 | ULT-08 | AI 依家族判斷時機，測試覆蓋斬殺線/血線/敵密度 | assets/scripts/battle/controllers/EnemyAI.ts 僅處理兵種部署，無奧義決策 | 未開始→已接線；#1296 AiUltimateFamilyRule 接 BattleController |
| **ULT-14** | M9 | 血脈傳承奧義五階（星階門檻×名聲覺醒進度，命紋靈獸加成） | logic | 5 | 🟢 已接線 | ULT-02 | isBloodlineUltimateStageUnlocked 與 awakening_gain 單元測試，命頁顯示名聲/事蹟需求 | 無（grep Bloodline_Transmission/awakening 無實作） | 未開始→已接線；BloodlineTransmissionUltimate 已接 GameSession／UltimateProgress（既有呼叫端） |
| **ULT-15** | M2 | 子嗣奧義覺醒（綠色因子 level×0.05 機率，家傳奧義） | logic | 3 | ⚪ 未開始 | ULT-01 | 培育中依綠色因子等級擲覺醒，寫入 Is_Inherited 與 Source_Parent_UID | gene-dictionary.json 存在但無奧義覺醒邏輯 |  |
| **ULT-16** | M8 | 奧義升級（重複解鎖升 Lv）與奧義圖鑑 | logic | 3 | 🟢 已接線 | ULT-03 | 重複取得升級並顯示 Lv；圖鑑列出已解鎖 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **ULT-17** | M9 | 組合奧義（赤壁大火等跨武將）與英靈附體（祖先虛影雙發） | logic | 5 | ⚪ 未開始 | ULT-10 | 獨立子系統母規格成立後再驗收 | 規格 F-8 標示待獨立母規格；無 |  |
| **ULT-18** | M11 | 奧義 Server 表 / 存檔結構（GeneralUltimates、ult_records） | server | 2 | 🟢 已接線 | ULT-03 | 解鎖/等級/家傳旗標持久化並可同步 | 無 | 未開始→已接線；協調線確認養成線：完成（記已接線，待 QA） |
| **ULT-19** | M10 | 奧義 UI 字串與劇本（解鎖/施放/精力不足/家傳） | content | 1 | 🟢 已接線 | - | UI_ULT_* Key 進入 i18n | 無（grep UI_ULT_ 無結果） | 純邏輯→已接線（戰場線指出並核對）：ui.ultimate.* 5 鍵（charging/label/ready/unassigned/unassigned_toast）四語系檔皆有，由 ActionCommandComposite（經 BattleScenePanel）、BattleSkillTargetingFlow、BattleUIBridge 使用；劇本部分未逐項核對 |
| **GRD-01** | M7 | Tile-State Machine 底層：Normal/Hazard/Force-Move/Stealth 四狀態定義與 JSON/資料結構（Q33=D） | logic | 3 | 🟡 純邏輯 | - | 格子狀態以資料驅動，可宣告 onEnterDamage/onEnterPush/onEnterHide，單元測試覆蓋四狀態 | [v8 核對 2026-10-15] TileStateRules 四類格子狀態分類（0019881a）與測試；無 src 呼叫端 |  |
| **GRD-02** | M7 | Hazard 傷害格（火燒延燒、落石固定高傷）每回合結算 | logic | 2 | 🟢 已接線 | GRD-01 | 進入或停留 Hazard 格依 damagePerTurn 扣血，延燒規則可測 | assets/scripts/battle/runtime/phases/BattleTileEffectPhase.ts（damagePerTurn 結算）；BattleTacticBehavior.ts 建 hazard-fire/hazard-rock |  |
| **GRD-03** | M7 | Force-Move 位移格（水淹推退，受阻轉傷害） | logic | 2 | 🟢 已接線 | GRD-01 | forcedMoveDirection/steps 推移，受阻改為傷害，測試覆蓋 | [v8 核對 2026-10-15] ForcedMoveTile 由 BattleAutoMovePhase 呼叫（3133bf4d、bcdf167e）；水淹推退畫面未核對 |  |
| **GRD-04** | M7 | Stealth 掩體格（森林埋伏，進入隱蔽防遠程） | logic | 2 | 🟢 已接線 | GRD-01 | 進入 ambush-field 後遠程無法鎖定，離開失效，測試覆蓋 | [v8 核對 2026-10-15] StealthTile 接進目標選取（b6b489f4）與直接攻擊掩體判定（aba07b20）；森林埋伏畫面未核對 |  |
| **GRD-05** | M10 | 格子視覺層：VFX/Decal 掛載使同邏輯多表現（毒沼/火海） | ui | 3 | 🟡 純邏輯 | GRD-01 | 同一 Hazard 邏輯可切換 fire/poison 兩套 Decal+VFX 且不改邏輯 | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（純邏輯）；待 QA／實機驗收 |  |
| **SPV-01** | M10 | 英靈虎符視覺契約文件落地（spirit-tally-and-elite-troop-contract-v1） | content | 1 | ⚪ 未開始 | - | 契約文件存在於 repo 並被兵種/人物頁規格引用 | 補遺引用 artifacts/ui-qa/UI-2-0054/spirit-tally-and-elite-troop-contract-v1.md；repo 內未驗證存在（artifacts 目錄非追蹤範圍） |  |
| **SPV-02** | M10 | 每位核心名將四件組：本體血脈 slot、英靈卡形象、英靈虎符 crest、特種軍隊旗紋/兵牌 | content | 5 | ⚪ 未開始 | SPV-01 | 首批核心名將資料表含四欄且資源存在 | 無（grep crest/bloodline crest family 無對應資料） |  |
| **SPV-03** | M10 | 特種軍隊造型回收 bloodline crest family（旗紋/兵牌/武器細節） | content | 4 | ⚪ 未開始 | SPV-02 | 軍隊美術引用同一 Sigil_Pattern_ID | 無 |  |
| **SPV-04** | M9 | 血脈卡/英靈卡 → 英靈虎符的資料與 UI 鏈（名將→血脈卡→虎符→軍隊） | ui | 3 | 📄 僅資料 | SPV-02 | 人物頁可從英靈卡進入虎符與軍隊，三者同一血脈標識 | assets/resources/ui-spec/screens/spirit-tally-detail-screen.json、tiger-tally-detail-panel-screen.json；資料鏈未串 |  |
| **SPV-05** | M10 | 後續任務卡 UI-2-0061/0062/0063（趣聞內容層、重複卡分流與血脈灌注、命鏡 Loading 文案） | content | 5 | ⚪ 未開始 | SPV-04 | 三張任務卡各自驗收 | 補遺列為後續任務；本組未見對應檔案 |  |
| **LVL-01** | M7 | 連環破主鏈資料（Stage_ID/Chain_ID/Boss/Theme/Required_Loadout/Preview_Intel）與前置解鎖 | data | 3 | 🟡 純邏輯 | - | 關卡節點表含六欄，典韋→許褚→曹操鏈順序解鎖可測 | [v6 核對 2026-10-14] 連環破主鏈節點表與驗證（07d34d5a）純邏輯；StageChainNodes 無 src 呼叫端 |  |
| **LVL-02** | M5 | 關卡進度與解鎖狀態存檔（連環破進度） | logic | 2 | ✅ 已驗收 | LVL-01 | 完成前置關後下一關解鎖並持久化 | [v4 核對 2026-10-13] StageChainProgress.ts 通關進度存檔與連環破順序解鎖（PROG-2-0214/0215）；tests/StageChainProgress.test.ts 通過 |  |
| **LVL-03** | M7 | 戰前偵查面板（Enemy_Name/Core_Mechanic/Risk_Tags/Recommended_Loadout_Check 四塊，不揭露站位） | ui | 4 | ⚪ 未開始 | LVL-01 | 進關前顯示四塊資訊，Formation_Preview 不出現 | 無（grep Preview_Intel/Risk_Tags 無結果）；BattleEntryParams/DeployPanel 無偵查 |  |
| **LVL-04** | M7 | Recommended_Loadout 三態檢核（已具備/缺少/高風險）與『高風險仍可挑戰』 | logic | 3 | 🟡 純邏輯 | LVL-03 | 依當前 loadout（非收藏）計算三態，缺口時不鎖死 | [v9 核對 2026-10-15] LoadoutCheck 推薦配置三態檢核純邏輯與測試；無 src 呼叫端 |  |
| **LVL-05** | M7 | 戰法槽位容量（智力/培育/關卡）與關卡推薦對策槽位數 | logic | 3 | 🟡 純邏輯 | LVL-04 | 槽位數 = f(智力,培育,關卡等級)，關卡寫明推薦槽數 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（純邏輯）；待 QA／實機驗收 |  |
| **LVL-06** | M7 | 軍師 HUD 四摘要欄（Theme_Hazard/Interactive_Object_Status/Stage_Salvage_Summary/Recommended_Loadout_Gap） | ui | 4 | 🟡 純邏輯 | LVL-03, LVL-08 | HUD 顯示四欄且不洩漏埋伏點與 AI 路徑 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（純邏輯）；待 QA／實機驗收 |  |
| **LVL-07** | M10 | 特殊戰場視覺四層（背景/棋盤Decal/立牌VFX/HUD）與棋盤提示語言 | ui | 5 | 📄 僅資料 | GRD-05 | 四層可獨立替換；落石/營帳/陷阱不畫死背景；關鍵格微光低於 HUD | assets/resources/data/scene-backgrounds.json；battle/shared/BattleSceneMode.ts；分層與 Decal 未見 |  |
| **LVL-08** | M7 | Interactive_Object 四類（Rockfall_Node/Floodgate/Camp_Target/Trap_Cluster）與擊破/觸發狀態 | logic | 4 | 📄 僅資料 | GRD-01 | 四類物件可被擊破或觸發並產生狀態 | battle/shared/BattleTacticBehavior.ts 以 setTileEffect 建 hazard-rock/night-raid camp；無 Interactive_Object 抽象 |  |
| **LVL-09** | M8 | Stage_Salvage 戰後結算（石材/木材/補給/情報，一次結算入經濟） | logic | 3 | 🟢 已接線 | LVL-08 | 戰鬥結束一次彙總 Salvage 並寫入戰後摘要，戰中不改帳號經濟 | 無（grep Salvage 無結果） | 未開始→已接線；#1462 StageSalvage 接 BattleTileEffectPhase |
| **LVL-10** | M7 | 四主題關卡內容（峽谷落石/水淹圍堵/夜襲掠奪/森林埋伏）各含主互動物件與收益 | content | 8 | 📄 僅資料 | LVL-08, LVL-09 | 四主題各一關可玩，標示主要互動物件與可回收收益 | encounters.json 僅 1 場；BattleTacticBehavior.ts 有 hazard-rock/river-current/night-raid/ambush-field 場景戰法雛形 |  |
| **LVL-11** | M7 | Boss AI：主將血量<50% 召喚親衛隊（呂布、曹操） | logic | 3 | 🟡 純邏輯 | LVL-01 | HP 降至 50% 觸發一次親衛隊召喚，測試覆蓋 | [v9 核對 2026-10-15] BossGuardSummon Boss 親衛隊召喚純邏輯與測試；無 src 呼叫端 |  |
| **LVL-12** | M10 | 攝影機固定 2.5D 斜視角與 UI 安全區 | ui | 2 | 🟢 已接線 | - | 各主題關卡共用固定鏡頭，棋盤不被 HUD 遮擋 | battle/views/BattleScene.ts 固定鏡頭（未逐項驗收）；規格 H 節 |  |
| **LVL-13** | M9 | 軍師演武模式與釋放敵將頓悟捷徑門檻（Q50=D） | logic | 3 | ⚪ 未開始 | LVL-01 | 待 Q50 選項 D 內容明確後驗收 | 無；規格僅在 MCQ 記錄出現 |  |
| **TAC-01** | M7 | 統一戰法請求/結果契約 BattleSkillRequest / SkillExecutionResult + shared contract | logic | 2 | 🟢 已接線 | - | 五種來源皆可轉成同一 BattleSkillRequest，型別於 shared 被 Battle/UI 共用 | assets/scripts/shared/SkillRuntimeContract.ts；tests/BattleSkillExecutor.test.ts（未能本地執行） |  |
| **TAC-02** | M7 | 五來源轉譯器 Seed/Bloodline/Mentor/Scene/TigerTally Adapter | logic | 3 | 🟢 已接線 | TAC-01 | 每個來源至少 1 個 integration test 通過，tacticSlots 可轉 request | assets/scripts/battle/skills/adapters/*.ts（6檔）；tests/BattleSkillSourceTranslator.test.ts |  |
| **TAC-03** | M7 | P0 傷害投射包 TDIR/TLINE/TFAN（單體/直線/扇形/falloff/穿甲） | logic | 4 | 🟢 已接線 | TAC-01 | unit test 驗各 targetMode 命中集合與倍率 falloff；施放到扣血整合通過 | assets/scripts/battle/skills/resolvers/ProjectedDamageSkillResolver.ts、BattleSkillDamageResolver.ts、BattleSkillTargetSelector.ts；tests/BattleSkillDamageResolver.test.ts、BattleSkillTargetSelector.test.ts |  |
| **TAC-04** | M7 | P0 增益續航包 TBUFF/THEAL/TDEBUFF（Buff/治療/DOT/緩速/刷新覆蓋） | logic | 3 | 🟢 已接線 | TAC-01 | unit test 驗刷新/覆蓋與回合 tick；醫療公式 25% 已損HP 正確 | assets/scripts/battle/skills/resolvers/BuffDebuffSkillResolver.ts、HealSkillResolver.ts；tests/BattleSkillExecutor.test.ts |  |
| **TAC-05** | M7 | P1 棋盤控制包 TMOVE/TPUSH/TTILE（衝刺/擊退/火海/水域/落石/阻擋） | logic | 4 | 🟢 已接線 | TAC-01 | unit test 驗 path/blocker/tile tick；移動到地格觸發傷害 | assets/scripts/battle/runtime/phases/BattleTileEffectPhase.ts、BattleTileBuffLifecycleManager.ts、BattleController（hazard-fire/river-current/hazard-rock，規格自述）；assets/resources/data/tile-buffs.json |  |
| **TAC-06** | M7 | P1 反應連鎖包 TLINK/TCOUNTER/TRESET（連環計/幼麒天算/威震華夏原型） | logic | 4 | 🟢 已接線 | TAC-03 | damage-link 50% 共享、近戰反擊+Weak、首擊雙倍+擊殺再行動 各有 trigger 測試 | assets/scripts/battle/skills/resolvers/LinkSkillResolver.ts、CounterSkillResolver.ts、ResetSkillResolver.ts；BattleCombatResolver.tryTriggerCounterReaction |  |
| **TAC-07** | M7 | TSTEALTH/TCOND 條件觸發（鄰格/天氣/兵種限制、隱身忽略索敵） | logic | 3 | 🟢 已接線 | TAC-01 | 隱身 2 回合敵 AI 忽略；騎兵戰法帶步兵不可發動的兵種限制有測試 | [v7 核對 2026-10-14] TacticCondition 條件表與評估（d646bb52、a85d84c6）由 2 處 src 呼叫；隱身忽略索敵於戰鬥中未核對 |  |
| **TAC-08** | M2 | 天賦戰法初始庫 8 條資料 + tacticSlots 分配 + 稀有度配額/評分 | data | 2 | 🟢 已接線 | - | tactic-library.json 8/8 含 battleSkillId/autoAimMode；generals 231/235 帶 tacticSlots | assets/resources/data/master/tactic-library.json（8條）；tests/BattleSkillProfileAutoTargeting.test.ts；generate-general-tactics.js（規格自述，未核） |  |
| **TAC-09** | M7 | 天賦戰法自動施放：BattleSkillProfiles 與 AI cadence（manualTargeting:false、autoAimMode） | logic | 3 | 🟢 已接線 | TAC-08, TAC-03 | 8條天賦戰法在戰場自動選錨點施放，敵方施放有最小回合間隔 | assets/scripts/battle/skills/BattleSkillProfiles.ts（16 profile）；tests/BattleSkillProfileAutoTargeting.test.ts |  |
| **TAC-10** | M7 | 虎符專屬戰法 G-1 14 條逐條落地（目前僅無視防禦、百步穿楊） | logic | 8 | 🟢 已接線 | TAC-02, TAC-05, TAC-06 | 14 條各有 profile + 單元測試 + 對位規格公式；規格 checklist 全勾 | [v10 更正 2026-10-20] master 上 BattleSkillProfiles 已登錄 10 條 profile（戰場線確認）；連環計、幼麒天算以 id（tally-link、tally-counter-weak）登錄，名稱無誤。第一批 4 條見 5dc19d7e（PROG-2-0763）。以 14 條為準，剩餘條數與逐條測試未核對 | 狀態不變（已接線）；PROG-2-1444（虎痴符）、1457（錦帆等五符）為 G-1 虎符被動，D-1a 缺口 15→14 條，對應本列 |
| **TAC-11** | M7 | 教官靈感戰法 G-2 六招（單騎破陣/八陣圖/空城計/醫療/鼓舞/緩速） | logic | 4 | 🟢 已接線 | TAC-04, TAC-05 | 6 招逐條公式/TP 消耗對位並有測試 | [v10 核對 2026-10-20] G-2 六招中，鼓舞（morale，65325787）、緩速（slow，5408b074）、醫療（HealSkillResolver）已有效果解析；八陣圖、單騎破陣有關鍵字命中；空城計有 1 處命中。逐招公式與 TP 消耗對位未核對 |  |
| **TAC-12** | M7 | 血統戰法 趙家槍法 三段遞增 1.0/1.2/1.4 + 血統限制 | logic | 2 | 🟢 已接線 | TAC-03 | 前方3格三次獨立結算，遞增係數正確，非趙家血脈不可發動 | [v6 核對 2026-10-14] 趙家槍法三段遞增結算接上戰場（51bffeef）；BLT 血統戰法測試未逐一核對 |  |
| **TAC-13** | M7 | 場景全局戰法注入 SceneGambitAdapter（水淹/森林埋伏/落石/夜襲）+ 場勢視覺 | logic | 5 | 🟢 已接線 | TAC-05, TAC-07 | BattleTactic 載入後棋盤預設格型/隱身/夜襲規則生效，HUD badge 與 pulse 顯示 | adapters/SceneGambitAdapter.ts、views/BattleSceneGambitSummary.ts、BoardRenderer.ts(water-ripple)、scene-backgrounds.json；BattleTactic enum 僅 5 種 |  |
| **TAC-14** | M7 | UI 資料出口：GeneralDetail Skills 分頁、BattleScene 戰法摘要/可施放狀態/灰化原因 | ui | 3 | 🟢 已接線 | TAC-08 | Skills 分頁讀 tacticSlots+tactic-library；戰場 HUD 顯示灰化原因與戰報字串 | ui/components/general-detail/GeneralDetailSkillsChild.ts；battle/views/BattleSceneLoader.ts（灰化原因無） |  |
| **TAC-15** | M7 | 戰法 AI 選技規則（斬殺線/危險值/choke point）與 7 步驗收矩陣 | logic | 3 | 🟢 已接線 | TAC-09 | AI 單體傷害優先斬殺、Buff/Heal 看危險值；各模組 unit + 各來源 integration + UI smoke | [v16 核對 2026-10-21] 戰法 AI 選技規則 TacticAiRules（219a2bc2，PROG-2-0907，#724）由 EnemyTacticCandidates、EnemyTacticNumbers、BattleController 呼叫（0912、0914、0918 接線，#736、#742、#761）；TacticAiRules.test.ts 存在。7 步驗收矩陣實機未核對 |  |
| **TAC-16** | M10 | 戰法 VFX/英靈面演出/assets/fx/tactics prefab 與戰場掠奪飄字 | content | 5 | 🟡 純邏輯 | TAC-10 | SSR/UR 戰法有半身英靈閃現；掠奪金色飄字顯示資源清單 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **SCN-01** | M7 | 場景戰法 6 種資料表（ID/INT門檻/情報門檻/Tile預設比例）JSON 驅動 | data | 2 | ⚪ 未開始 | - | scene-presets.json 含 6 場景完整欄位並可由 loader 讀入 | 無（SceneGambitAdapter 內為硬編碼 BattleTactic→skill 對照） |  |
| **SCN-02** | M7 | Tile-State 預設佈局生成（Stealth/Hazard/Force-Move/Normal 比例） | logic | 3 | 🟡 純邏輯 | SCN-01 | 給定 preset 產生 5×8 棋盤格狀態分佈符合比例，同 seed 可重現 | battle/runtime/phases/BattleTileEffectPhase.ts、tile-buffs.json（僅 tile buff）；無比例佈局器 |  |
| **SCN-03** | M7 | 發動判定：INT門檻/情報門檻/成功率公式 P=min(95%,50%+(INT-th)*2%) | logic | 2 | 🟡 純邏輯 | SCN-01 | 單元測試覆蓋門檻邊界與 95% 上限 | [v8 核對 2026-10-15] 場景戰法發動判定純函式（3bc41d0d）與測試；無 src 呼叫端 |  |
| **SCN-04** | M9 | 軍事任務接取→下一場戰鬥自動套用場景戰法（BattleEntryParams 資料橋） | logic | 3 | 🟡 純邏輯 | SCN-03 | 接任務後進入戰鬥時 battleTactic 被注入並顯示 | shared/BattleEntryParams.ts、LobbyScene→BattleScene 傳遞 battleTactic；軍事任務接取無 |  |
| **SCN-05** | M10 | 預繪靜態場景背景切換（day/night 等）+ 水淹 ripple 條件掛載/fallback | ui | 3 | 🟢 已接線 | SCN-01 | Flood 才掛 water-ripple，載入失敗回退 floodBaseFillMaterial 且可重試 | battle/views/SceneBackground.ts、BoardRenderer.ts、scene-backgrounds.json（僅 bg_normal_*） |  |
| **SCN-06** | M7 | 森林埋伏+夜襲專屬規則（前2回合隱身、陷阱定身、命中-25%暴擊+20%、營帳可佔領） | logic | 4 | 🟢 已接線 | SCN-02 | 隱身2回合、陷阱格定身1回合+傷害、營帳佔領=勝利 有測試 | [v8 核對 2026-10-15] 暴擊系統與夜襲改寫（1dceedb2）；CombatCrit 1 處呼叫端與測試 |  |
| **SCN-07** | M7 | 峽谷落石+水淹+火燒偷襲場景規則與擊破/掠奪掉落（Loot System） | logic | 5 | 🟡 純邏輯 | SCN-02 | 落石擊破掉石材100~300等；佔領火格=掠奪成功，金色飄字顯示 | hazard-rock/river-current/hazard-fire tile effect；掉落 Loot 無 |  |
| **SCN-08** | M7 | 攻城戰：城門/城牆地利/衝車雲梯投石機器械 | logic | 5 | ⚪ 未開始 | SCN-02 | 器械可破門、雲梯攀爬、投石機AOE，各有單元測試 | 無（BattleTactic 無 siege） |  |
| **SCN-09** | M7 | 格子戰法分類（突擊/控制/環境）與離間等未列戰法定義 | logic | 2 | ⚪ 未開始 | SCN-02 | 離間(敵軍互鬥)等至少一個控制類格子戰法落地 | 無 |  |
| **SCN-10** | M7 | 軍師智謀能量 HUD（每回合 INT*0.5、滿100觸發全局增幅、金色粒子） | ui | 2 | 🟡 純邏輯 | SCN-03 | 垂直能量條由下往上填滿，滿格噴發並觸發增幅 | [v9 核對 2026-10-15] WisdomMeter 軍師智謀能量純邏輯與測試；無 src 呼叫端 |  |
| **SCN-11** | M10 | 場景背景圖 AI 繪製 Pipeline（6 張預繪背景） | content | 4 | 📄 僅資料 | SCN-01 | 6 場景背景資產入庫並在 scene-backgrounds.json 註冊 | scene-backgrounds.json 僅 bg_normal_day/night；其餘 4 張無 |  |
| **DEP-01** | M5 | 出征軍勢池 Sortie_Troop_Pool：min(帶兵上限,城市兵源,關卡上限) 與 Command_Capacity 公式 | logic | 3 | 🟢 已接線 | - | 給定武將/城市/關卡參數算出 Pool_Max，且初期不低於 8000，單元測試通過 | [v3 核對 2026-10-13] SortieSetupController.ts:156 呼叫 computeSortiePoolMax(min 帶兵上限/城市兵源/關卡上限)；出征編制畫面顯示軍勢池（PROG-2-0083） |  |
| **DEP-02** | M9 | 城市兵源鏈：City_Troops_Cap/補兵速度/戰損回扣/恢復回合 | logic | 3 | 🟢 已接線 | DEP-01 | 戰後 Lost_Troops 回扣城市兵源，Turns_To_Recover=ceil(loss/regen) 正確 | [v3 核對 2026-10-13] MilitaryReserve.ts regenMilitaryOneSeason/applySortieResult 接 GameSession 每季補兵與戰損回扣（PROG-2-0072） |  |
| **DEP-03** | M5 | 部署合法性 CanDeploy 與 TROOPS_SHORT/FOOD_SHORT/FIELD_UNIT_LIMIT 三種分開提示 | logic | 3 | 🟢 已接線 | DEP-01 | 三種原因各自禁用卡牌並顯示對應文案，不自動改派 | [v3 核對 2026-10-13] SortieDeploy.checkDeploy 由 BattleController.ts:262 部署前呼叫，回傳 TROOPS_SHORT/FOOD_SHORT 等原因 |  |
| **DEP-04** | M5 | 糧草即時扣除與兵種糧耗表（含虎符 TALLY_GRAIN_COST）取代 DP | logic | 3 | 🟢 已接線 | DEP-03 | 部署扣糧並與 TALLY_GRAIN_COST 對位，糧草耗盡不能出兵 | [v3 核對 2026-10-13] SortieDeploy.getDeployCost + applyDeploy 扣糧（BattleController.ts:272），TALLY_GRAIN_COST 生效；取代 DP 已完成 |  |
| **DEP-05** | M5 | 部隊退場/戰鬥結束兵力返還與戰損結算 + 戰後結算顯示 | logic | 3 | 🟢 已接線 | DEP-01 | Returned_Troops/Lost_Troops 計算正確並於結算面板顯示六項數字 | [v3 核對 2026-10-13] BattleController.finishSortie → SortieDeploy.finishSortie；GameSession.ts:778 applySortieResult 寫回；BattleUIBridge.ts:553 戰後顯示 formatSortieSummary |  |
| **DEP-06** | M5 | 精銳部署上限 Elite_Deploy_Cap（基礎4、攻城+1、官職+1）與 canDeployElite | logic | 2 | 🟢 已接線 | DEP-03 | 精銳超限進入『場上部隊已滿』禁用，普通小兵不計 | [v3 核對 2026-10-13] SortieDeploy.getEliteDeployCap（ELITE_BASE_TYPES：騎/水/機械）於 createSortieState 與 checkDeploy 生效 |  |
| **DEP-07** | M5 | 普通小兵 Militia（40%攻防、5糧、無特能） | logic | 2 | 🟢 已接線 | DEP-04 | Militia 屬性為基礎 40%，部署扣 5 糧 | [v3 核對 2026-10-13] SortieDeploy.getMilitiaCombatStats（40% 攻防、5 糧）；BattleUnitSpawner.ts:56 options.militia 生成小兵 |  |
| **DEP-08** | M5 | 出征前編制槽 SortieLoadout：參謀官/後勤官選定與角色鎖驗證 | ui | 3 | 🟢 已接線 | DEP-01 | 同一武將不可兼任兩角色，validateSortieLoadout 測試與 UI 提示 | [v3 核對 2026-10-13] SortieDeploy.validateSortieLoadout（角色鎖、SAME_BLOODLINE）；GameSession.ts:489/504；SortieSetupController 選參謀/後勤（PROG-2-0083） |  |
| **DEP-09** | M7 | 參謀官計謀點上限/開局補點、後勤官軍糧上限/開局補給公式 | logic | 2 | 🟢 已接線 | DEP-08 | 依 INT/POL、LEA/POL 算出 bonus 並受 30/15/0.18 上限約束 | [v3 核對 2026-10-13] SortieDeploy.getStrategistBonus/getDeputyFoodBonus 接 GameSession.ts:497-498；BattleController spendTactic 計謀點（PROG-2-0084/0085） |  |
| **DEP-10** | M7 | 改派建議 Deploy_Suggestion（推薦低耗部隊，玩家確認） | ui | 2 | 🟢 已接線 | DEP-03 | 不可部署時顯示『可改派』且需二次確認 | [v15 核對 2026-10-21] 改派建議 suggestLowCostDeploy 由 BattleController 呼叫（4c93cdca，#693；cc 文案 #696、二次確認 #707）；SortieDeploySuggestion.test.ts 存在。UI 實機未核對 |  |
| **DEP-11** | M7 | 委任 AI Auto-Battle：INT→LOW/MEDIUM/HIGH/EXPERT 部署品質與保留策略 | logic | 5 | 🟢 已接線 | DEP-06, DEP-09 | 四級 AI 行為差異（保留糧草比例、保留特殊兵/器械槽）有測試 | [v16 核對 2026-10-21] 委任 AI 四級部署策略（be073c7e，#711）與 delegatePickDeploy 入口（23b9ae30，#719）已接上 BattleController（5e125de3，#731），委任開關接上玩家部署（270d0245，#740）；DelegateAi.test.ts 存在。委任實機與 INT 分級未核對 |  |
| **DEP-12** | M7 | 場景 preset 對部署權重影響與 Q64 虎符 Set 羈絆 | logic | 3 | ⚪ 未開始 | SCN-02, DEP-11 | 攻城戰保留器械槽；集齊五虎將符觸發同場加成 | 無 |  |
| **DEP-13** | M11 | Server/Client 部署紀錄 schema（Sortie_Loadout/Battle_Deploy_State/battle 表） | server | 2 | 🟡 純邏輯 | DEP-05 | 戰鬥結算寫入 battle 記錄含 food_spent/troops_lost 等欄位 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **DEP-14** | M8 | 編制預設/推薦 sortie loadout 儲存 | ui | 2 | ✅ 已驗收 | DEP-08 | 可儲存/套用編制預設並推薦 | [v11 核對 2026-10-20] 出征編制預設與推薦（02e0b494，PROG-2-0782）；SortieLoadoutPreset 由 SortieSetupController 呼叫，測試存在 |  |
| **APT-01** | M5 | 適性資料模型 GeneralAptitude（兵種4/地形5/天氣6，S~D）與 GeneralUnit 載入 | data | 2 | 🟢 已接線 | - | GeneralUnit 暴露 troop/terrain/weather aptitude，資料檔含全武將 | [v3 核對 2026-10-13] GeneralUnit.ts troopAptitude/terrainAptitude 欄位 → BattleAptitude.resolveAptitude 讀取 |  |
| **APT-02** | M5 | 適性等級→數值修正引擎（攻防/移動/命中），含 Q35 B 級-30% 裁決對位 | logic | 3 | ✅ 已驗收 | APT-01 | 各等級×地形/天氣/兵種查表輸出 atk/def/move/acc，單元測試覆蓋S~D | [v3 核對 2026-10-13] BattleAptitude.ts 三乘區（攻防=(1+地形)(1+天氣)(1+兵種)，移動=地形+兵種，命中=地形+天氣）；Q16=C 表 S~D 單調；tests/BattleAptitude.test.ts 通過 |  |
| **APT-03** | M5 | 最終戰鬥修正整合 final_attack/defense/move/accuracy 接入傷害公式 | logic | 3 | ✅ 已驗收 | APT-02 | BattleCombatResolver 傷害含 Terrain/Weather/Adaptation 三乘區並有回歸測試 | [v3 核對 2026-10-13] BattleCombatResolver 帶 attacker/defenderTerrain 與 weather 進傷害與命中；BattleAptitude 與 BattleCombatRegression 測試通過（PROG-2-0071/0080） |  |
| **APT-04** | M5 | 兵種×地形強弱勢（騎兵平原+2/山地-2、步兵山地防+30%、弓兵林地隱蔽等） | logic | 2 | 🟢 已接線 | APT-02 | 四兵種強弱地形效果符合表格並有測試 | [v3 核對 2026-10-13] TerrainTroopRules.getTerrainTroopEffect 接入 BattleCombatResolver（防禦/移動/隱蔽/射程）與 BattleAutoMovePhase（PROG-2-0088/0089/0200/0201） |  |
| **APT-05** | M7 | 五大地形格與 S/D 級特殊效果（水域合攻、沙漠耗精力、林地隱身） | logic | 4 | 🟢 已接線 | APT-02 | 5 地形 S/D 級效果各有行為與測試 | [v11 核對 2026-10-20] 沙漠地形每回合精力消耗（961a16eb，APT-05 部分）；DesertVitality 由 BattleController 呼叫。水域合攻、林地隱身等其餘地形未核對 |  |
| **APT-06** | M7 | 天氣系統：6 種天氣、Weather_Schedule 回合切換、天氣變化提示 | logic | 3 | ✅ 已驗收 | APT-01 | 依 Turn_Start/End 切換天氣並觸發對應提示文案 | [v6 核對 2026-10-14] 天氣排程純邏輯（48ef8fe4，PROG-2-0342）接戰場回合開始切換（73a2feaa，PROG-2-0401）；WeatherSchedule 測試通過 |  |
| **APT-07** | M7 | 天氣對戰法強約束：火計雨/霧/雷禁用變灰+Toast、大風×2、水攻雨天擴大 | ui | 3 | 🟢 已接線 | APT-06, TAC-14 | 雨天火計按鈕灰化且點擊彈 Toast『當前天氣不符合施放限制』 | [v7 核對 2026-10-14] WeatherTacticRestriction 接戰鬥與施放流程（e9c2d140，PROG-2-0406），5 處呼叫端；灰化與 Toast 畫面未核對 |  |
| **APT-08** | M7 | 天氣對命中/射程影響（雨-20%、霧-30%、風射程-2、夜-25%） | logic | 2 | 🟢 已接線 | APT-06, APT-03 | 遠程命中與射程隨天氣修正，測試覆蓋 | [v3 核對 2026-10-13] BattleAptitude.hitRateOf + accuracyDelta 含天氣；基礎命中 100%、下限 50%（PROG-2-0080）；雨/霧/風射程數值未逐項核對 |  |
| **APT-09** | M2 | 粉色因子→兵種/地形適性映射（含14人血統≥5人升一級） | logic | 3 | 🟢 已接線 | APT-01 | 因子等級轉適性等級單元測試，並解決兩套對照表矛盾 | [v7 核對 2026-10-14] 粉色地形因子覆寫戰場地形適性（dbd9d844，PROG-2-0412）；14 人血統≥5 人升一級未核對 |  |
| **APT-10** | M2 | 白色因子→天氣抗性/免疫 | logic | 2 | ⚪ 未開始 | APT-09 | 白色因子提供特定天氣免疫或加成 | [v16.4 封鎖 blocked 2026-10-27] 白因子（KIN-05）待使用者裁決，APT-10 擱置 ；無 |  |
| **APT-11** | M5 | 適性面板 UI（武將詳情適性分頁） | ui | 2 | 🟢 已接線 | APT-01 | 詳情頁顯示三維適性星級與偏好地形 | [v3 核對 2026-10-13] GeneralDetailAptitudeChild（武將詳情適性分頁）；兵頁適性（GDUI-12） |  |
| **APT-12** | M7 | 戰場環境偵察（出戰前顯示地形分佈與天氣預報） | ui | 3 | ✅ 已驗收 | APT-06 | 出戰前面板顯示 Terrain_Grid 與 Weather_Schedule | [v6 核對 2026-10-14] 出戰前環境偵察純邏輯（1da80662）接任務詳情面板（beb8a658，PROG-2-0403）與真實關卡資料（5890644e）；BattlefieldRecon 2 處呼叫端與 2 個測試 |  |
| **APT-13** | M9 | 競技場積分公式 Score（名將挑戰賽用） | logic | 2 | 🟡 純邏輯 | APT-02 | Score 公式單元測試與 TERRAIN_MULTIPLIER 表 | [v11 核對 2026-10-20] 競技場積分純邏輯（6594741d，PROG-2-0818）與測試；ArenaScore 無 src 呼叫端 |  |
| **APT-14** | M10 | 劇本台詞（水戰S/山地S/霧/夜，規格 §G） | content | 1.5 | 🟢 已接線 | APT-05 | 適性文案與地形格視覺差異上線 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **APT-14b** | M10 | 地形特效視覺與適性反饋（規格 §E 第 10 項） | content | 1.5 | 🟡 純邏輯 | APT-05 | 不同地形格的視覺差異與適性反饋 | [v16.4 拆分 2026-10-27] 由 APT-14 拆出；規格 §E-10 為 P2；工時 1.5 為暫估，待 PM 確認 | 未開始→純邏輯；適性反饋 AptitudeDialogue 已接 BattleController（協調線告知，待核對），地形特效視覺等美術材質 |
| **APT-15** | M8 | 適性 Server schema 與天氣道具（祈風令/祈雨符）、適性預言 | server | 3 | 🟢 已接線 | APT-06 | aptitude 表落地；道具可改變戰場天氣 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **AIS-01** | M7 | 難度等級表 AIDifficultyConfig（5 級縮放、IQ、SP 修正、單挑閾值）資料與載入 | data | 1 | 🟢 已接線 | - | ai-difficulty.json 含 EASY~HELL 全欄位並可載入 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **AIS-02** | M7 | AI 武將屬性縮放 AI_Stat / AI_EP / 精力 / 轉生次數（難度×章節×年齡） | logic | 2 | 🟢 已接線 | AIS-01 | 縮放公式單元測試，含章節與年齡修正 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **AIS-03** | M7 | AI Profile 8 種模板資料與路線策略 | data | 2 | 🟢 已接線 | AIS-01 | ai-profiles.json 含部署傾向/戰法傾向/Lane_Strategy | 無 | 未開始→已接線；#1463 AiProfiles/AiLaneStrategy 有 src 呼叫端 |
| **AIS-04** | M7 | AI 武將模板 9 個（曹操~司馬懿）+ ChapterAIConfig 武將池 | data | 3 | ⚪ 未開始 | AIS-03 | AIGeneralTemplate 與 ChapterAIConfig 資料可載入，並對位戰法/兵種 ID | 無 |  |
| **AIS-05** | M7 | AI 部署決策：相剋優先、Profile 偏好、路線選擇、部署節奏 getAIDeployCount | logic | 4 | 🟢 已接線 | AIS-03 | 依 IQ 決定剋制/隨機，部署數 min(3,1+turn/5+難度) 正確 | assets/scripts/battle/controllers/EnemyAI.ts（decideDeploy/pickCounterType/getFreeLanes，AI_COUNTER_STRATEGY_CHANCE=0.35，無 Profile/難度） | 純邏輯→已接線；#1468 AiDeployTroopPick 接 EnemyAI；#1463 AiLaneStrategy 接 EnemyAI |
| **AIS-06** | M7 | AI 戰法使用決策 AI_UseTactic（隨機/最高傷害/情境評估） | logic | 3 | 🟢 已接線 | AIS-01, TAC-09 | 三級 IQ 行為差異有測試 | 敵方自動武將技有最小回合間隔（戰法系統G-5 自述）；IQ 分級選技無 | 純邏輯→已接線；#1466 AiTacticDecision 接 BattleController |
| **AIS-07** | M7 | AI 奧義使用決策 AI_UseUltimate（斬殺線/群聚/落後觸發） | logic | 2 | 🟢 已接線 | AIS-06 | 依 IQ 與 vitality、擊殺估算決定是否施放 | 無 | 未開始→已接線；#1329/#1253 AiUltimateDecision 接 BattleController |
| **AIS-08** | M7 | AI 特殊兵種戰力 E-2b + 虎符選擇 AI_SelectTally + 屬性對照 STAT_MAPPING | logic | 4 | 🟡 純邏輯 | AIS-04 | 品質/星級/屬性/適性/共鳴乘區公式單元測試與選符邏輯測試 | 無 | 未開始→純邏輯；#1467 AiTallySelection 僅測試，無 src 呼叫端 |
| **AIS-09** | M7 | AI 戰力評估 evaluateAIPower 與難度匹配 ±20% 調整 | logic | 2 | 🟢 已接線 | AIS-08 | AI/玩家戰力差>20% 時自動調縮放 | 無 | 未開始→已接線；#1288 AiPowerMatch 接 BattleSceneLoader |
| **AIS-10** | M7 | 單挑 AI 接受判定 duel_score（0.45/0.35/0.20 + 抖動 + IQ 閾值） | logic | 1 | 🟢 已接線 | - | score>=0.58 接受；EASY 閾值 0.45；含 ±0.05 抖動 | assets/scripts/battle/runtime/BattleDuelResolver.ts（0.45/0.35/0.2 權重與 0.58 已有；無抖動、無 IQ 閾值） | 純邏輯→已接線；#1283 AiDuelDecision 接 BattleController／BattleGeneralDuelFlow |
| **AIS-11** | M7 | 難度自適應（連勝/連敗 ±0.1、clamp）與提示文案 | logic | 1 | 🟢 已接線 | AIS-01 | 連3勝+0.1、連3敗-0.1 並限制範圍，文案顯示 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **AIS-12** | M7 | AI SP 充能難度修正（×0.8~1.5） | logic | 1 | ⚪ 未開始 | AIS-01 | SP 每擊殺獲取依難度倍率 | 無（SP_PER_KILL 常數存在於 Constants，無難度倍率） |  |
| **AIS-13** | M9 | 回合結束 AI 全軍強度重算 AI_TurnEndRecalculate（年齡/虎符升星/戰力/國力指數/策略調整） | logic | 5 | ⚪ 未開始 | AIS-08, AIS-09 | 每季批次重算五階段，單元測試覆蓋 | 無（core/models/AIPopulationConfig.ts 僅人口管控，無強度重算） |  |
| **AIS-14** | M10 | AI 出場台詞/難度提示文案 與戰報整合 + AI 戰鬥 Server log schema | content | 2 | 🟢 已接線 | AIS-04 | 出場台詞/戰法奧義宣告顯示；battle_ai_log 表落地 | 無 | 純邏輯→已接線；#1285 AiEntranceLines 接 BattleScene／BattleSceneFlow（battle_ai_log 定義同 PR） |
| **FORM-01** | M3 | 培育屬性增長總公式與乘區（2.1，傾囊相授連乘） | logic | 3 | 🟡 純邏輯 | NUM-11 | 加法區/資質/運勢/陪伴/傾囊相授(連乘)/人數補正乘區有單測且傾囊為唯一連乘 | [master fb02ff9 重估] NurtureSystem.ts 培育增長公式（部分） |  |
| **FORM-02** | M3 | 疲勞度與失敗率曲線（2.2） | logic | 1 | 🟡 純邏輯 | FORM-01 | 體力≥70%失敗0%、30~70%爬升5~35%、<30%為40~99% | [master fb02ff9 重估] NurtureSystem.ts 疲勞/失敗率（部分） |  |
| **FORM-03** | M3 | 教官卡詞條 Schema 與得意率權重（第3章） | data | 3 | 🟢 已接線 | - | Mentor 卡含 Teaching_Rate/Starting_Bond/Mentor_Burst_Bonus 等欄位並過 schema 驗證 | [master fb02ff9 重估] MentorCard.ts 詞條 schema | 純邏輯→已接線；協調線指示：已由現有 SupportCardDef／passive 覆蓋，結案 |
| **FORM-04** | M8 | 教官卡四大原型與戰法組合矩陣（第6章） | content | 4 | ⚪ 未開始 | FORM-03 | 四原型各有範例卡與公式干預點 | 無實作；MentorTacticAdapter.ts 僅為戰法來源轉換 |  |
| **FORM-05** | M7 | INT 戰法發動率檢核器（4.1） | logic | 1 | 🟡 純邏輯 | NUM-04 | 發動率=1−9000/INT，INT300≈70%、1200≈92.5%，支援 Success_Bonus | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（純邏輯）；待 QA／實機驗收 |  |
| **FORM-06** | M7 | 破釜沉舟殘局模式與 STR 軟上限（4.2） | logic | 3 | ⚪ 未開始 | FORM-05 | 第5回合切 Last_Spurt_Mode，STR>1200 溢出係數×0.5 | 無實作 |  |
| **FORM-07** | M7 | 體力池/燃燒率/根性減免（4.3） | logic | 3 | ⚪ 未開始 | FORM-06 | 總體力庫與每秒（每回合）消耗、WILL 減免有單測 | 無實作；規格用 VIT/WILL 屬性，專案六維無此二者 | 未開始→未開始；v16.9 協調線回報：缺基準速度、常數 C、WILL 減免公式（待企劃），狀態不變 |
| **FORM-08** | M2 | 因子繼承機率：藍色3星機率與世代相性（第5章） | logic | 2 | 🟢 已接線 | NUM-06 | <600:0%、600~1100:6%、≥1100:10%；相性影響白/紅因子 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **FORM-09** | M7 | 格子狀態矩陣與動態 ZOC（7.2-1） | logic | 4 | 📄 僅資料 | - | Tile 可掛載火海/陷阱/聖域；STR 壓制產生高移動成本區域 | assets/resources/data/tile-buffs.json（隨機地塊增益規則，與手冊的持續狀態/ZOC 不同）；無 ZOC |  |
| **FORM-10** | M7 | 分段戰鬥控制器與 Connection 監視（7.2-2） | logic | 3 | 🟢 已接線 | FORM-06 | 第5回合或存活<50%切換殘局；殘局前1回合技能觸發給累積加成 | 無實作 | 未開始→已接線；#1328 LastSpurtJudge 接 BattleController（殘局切換；FORM-06 殘局模式未做） |
| **FORM-11** | M10 | 體力 UI 與疲勞視覺（7.2-3） | ui | 2 | ⚪ 未開始 | FORM-07 | 血條下方體力條、歸零後灰化與喘氣動畫 | 無實作 |  |
| **FORM-12** | M7 | 四類技能原型格子映射（陷陣之志/空城計/神駒突圍/斷其糧草） | content | 4 | 🟢 已接線 | FORM-09, FORM-10 | 四個示例技能依規格條件觸發並有戰場測試 | 無實作 | 未開始→已接線；協調線確認養成線：完成（記已接線，待 QA） |

### 3.2 2. 經濟、裝備與任務 (Economy, Gear & Quests)

> 涵蓋資源經濟循環、商城定價、裝備鍛造與詞條、軍事任務發布、個人背包、倉庫容量與虎符戰令。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **ECO-01** | M8 | 基礎資源模型（糧草/黃金/城市兵源/名聲）與初始上限 10000/5000/3000/2000 | logic | 2 | 🟢 已接線 | - | PlayerEconomy 產出/消耗/上限夾制單元測試通過 | [v16.6 更正 2026-10-28] ResourceCap.BASE_RESOURCE_CAPS 初始上限表（糧草 10000、城市兵源 3000、名聲 2000）已由 GameSession 夾制接線；黃金上限 5000 未接（錢包另案），故記已接線 |  |
| **ECO-02** | M8 | 城市兵源語意：Cur/Cap/每回合補兵、出征軍勢撥出與戰損回扣 | logic | 3 | 🟢 已接線 | ECO-01 | 撥兵後 City_Troops_Current 遞減，戰後 Returned_Troops 回扣並受 Cap 限制 | [v3 核對 2026-10-13] MilitaryReserve.ts 城市兵源 cur/cap 與出征撥出/回扣；存檔欄位 military（PROG-2-0072） |  |
| **ECO-03** | M8 | 稀缺貨幣精元/結義點數與錢包 | logic | 2 | 📄 僅資料 | ECO-01 | 精元/結義點數增減、不足拒絕、持久化測試通過 | assets/scripts/core/services/LocalGachaService.ts 僅有 gems/gold/tickets 本地錢包（localStorage），無 Jing_Yuan/Bond_Points；GachaWalletRules.ts 僅在整合樹 |  |
| **ECO-04** | M8 | 道具定價表與購買流程（補元散10…延壽丹100精元） | data | 2 | ⚪ 未開始 | ECO-03 | 定價表載入並以精元扣款購買、庫存增加 | 無定價資料表 | 未開始→未開始；v16.9 協調線回報：被 ECO-03 擋，狀態不變 |
| **ECO-05** | M8 | 地窖保護（food 1500/gold 600，戰敗後觸發）與保底層不可掠奪 | logic | 2 | 🟢 已接線 | ECO-01 | 戰敗後資源不低於地板，被保護量不可被掠奪 | [v16.6 更正 2026-10-28] CellarProtection 由 GameSession 與 DailySubsidyNotice 呼叫；有 CellarProtection.test.ts 與 CellarProtectionNotice.test.ts（協調者確認已接 BattleUIBridge，待核） |  |
| **ECO-06** | M8 | 每日補貼（糧<1200補400、金<500補150、兵<600補200） | logic | 1.5 | 🟢 已接線 | ECO-01, ECO-02 | 同日只領一次，低於門檻才補，依 Last_Claim_Day 判定 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **ECO-07** | M8 | 許願池核心：每日3輪×3項、同時5個、償還8~24h、產量比率表 | logic | 4 | 🟢 已接線 | ECO-04 | 各輪開放時間、上限、到期入帳數量依 WISH_YIELD_TABLE 單元測試通過 | [v16.7 更正 2026-10-28] WishPool 由 GameSession、PlayerSaveService、WishAltarController 呼叫；許願池核心已接線 |  |
| **ECO-08** | M8 | 加速卡（-2h/張、5精元、月卡每日1張） | logic | 1.5 | 🟢 已接線 | ECO-07 | 使用加速卡縮短 End_Time 不低於 0 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **ECO-09** | M8 | 月卡（30天每日加成與贈卡） | logic | 2 | 🟢 已接線 | ECO-03, ECO-08 | Active/Days_Left 遞減，每日發放精力與加速卡 | [v16.7 更正 2026-10-28] MonthlyCard 30 天效期與續約（PROG-2-1359，PR #1163）由 GameSession、PlayerSaveService、ItemDef 引用 |  |
| **ECO-10** | M8 | 百寶閣商城與許願池 UI/文案字串 | ui | 4 | 🟢 已接線 | ECO-04, ECO-07 | 商城/許願池畫面可購買、許願、加速並顯示 UI_WISH_* 字串 | assets/resources/ui-spec/layouts/shop-main-main.json、screens/shop-main-screen.json；LobbyScene.ts onClickShopMain 開啟畫面殼，無資料綁定 | 僅資料→已接線；協調線回報：WishAltarController 接 LobbyScene；依賴 ECO-04 仍擋 |
| **ECO-11** | M8 | 資源上限與資源不足提示 UI_RES_LOW | ui | 1 | 🟢 已接線 | ECO-01 | 超出上限被夾制，不足時顯示警示字串 | [v16.6 更正 2026-10-28] ResourceCap 夾制與不足提示由 GameSession、MilitaryReserve、DailySubsidy 呼叫（PR #786）；有 ResourceCap.test.ts |  |
| **ECO-12** | M9 | 賽事經濟子回圈（免費報名、額外報名、Boss 券） | logic | 2 | ⚪ 未開始 | ECO-01 | 每日重置免費次數，額外報名扣精元 | 無 Tournament_Economy | 未開始→未開始；v16.9 協調線回報：被 ECO-03 擋，狀態不變 |
| **ECO-13** | M8 | 通行證（季度任務與獎勵追蹤） | logic | 4 | ⚪ 未開始 | ECO-03 | 賽季任務進度與獎勵領取測試通過 | 無 Season_Pass；SeasonalRollup.ts 為 AI 人口彙整，與通行證無關 | 未開始→未開始；v16.9 協調線回報：MVP 延後，狀態不變，不計入 MVP |
| **ECO-14** | M9 | 監獄容量依主城等級上限（MCQ Q49 選項B） | logic | 2 | 🟢 已接線 | ECO-01 | 關押數超過主城等級上限被拒 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **ECO-15** | M11 | Player_Economy 存檔與伺服器經濟/庫存表 | server | 3 | ⚪ 未開始 | ECO-01, ECO-03 | 經濟狀態可存讀並與 server 表欄位對齊 | server/src 僅 index.ts，無經濟表；SaveSerializer.ts 無經濟欄位 |  |
| **ITM-01** | M8 | ItemDef 資料表（ID/品質/堆疊/效果/過期）與道具清單 | data | 2 | 🟢 已接線 | - | 載入 7 付費+6 免費道具定義並通過 schema 驗證 | [v16.6 抽查 2026-10-28] ItemDef.ts 由 PlayerInventory、WishPool、ExtremeTaskDrop 引用；道具表是否涵蓋全部 ID 待 QA 核對 |  |
| **ITM-02** | M8 | 道具分類（消耗/材料/特殊/貨幣/寶物） | logic | 1 | 🟢 已接線 | ITM-01 | Category 枚舉與篩選單元測試通過 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **ITM-03** | M8 | PlayerInventory 增刪與消耗 API（扣前檢查數量） | logic | 3 | ✅ 已驗收 | ITM-01 | 不足時拒絕、足夠時扣除，單元測試通過 | [v16.6 更正 2026-10-28] v16.3 QA 已確認 done（PlayerInventory 增刪與消耗，19 個 src 檔引用） |  |
| **ITM-04** | M8 | 道具效果引擎（回精力50%、受孕率×1.5、保證受孕、占卜、入學、刷新） | logic | 4 | ⚪ 未開始 | ITM-03 | 各 Effect_Type 回呼對應子系統並有測試 | 無；M2 的 BreedingService.ts 在整合樹，未接道具 |  |
| **ITM-05** | M8 | 取得管道與來源追蹤（SHOP/TASK/DROP/EVENT） | logic | 2 | 🟢 已接線 | ITM-03 | 每次入庫記錄 source，可查詢 | 無 | 未開始→已接線；#1282 ItemAcquisitionLog 接 GameSession／PlayerSaveService |
| **ITM-06** | M8 | 掛機產出（每日免費入學令 floor(設施等級/5)+1、黃金） | logic | 2 | 🟢 已接線 | ITM-03 | 公式輸出符合 1~2 張 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **ITM-07** | M8 | 極限任務掉落表（金70/高粱15/筆記10/補元散5） | data | 1.5 | 🟡 純邏輯 | ITM-05 | 掉落機率分佈抽樣測試符合表 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（純邏輯）；待 QA／實機驗收 | 2026-10-28 核對 master：ExtremeTaskDrop 僅測試，無 src 呼叫端；與盤點一致，維持純邏輯 |
| **ITM-08** | M8 | 過期道具自動回收 | logic | 1.5 | 🟢 已接線 | ITM-03 | Expire_At 到期後移除並通知 UI_ITEM_EXPIRE | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **ITM-09** | M8 | 禮包組合系統 | logic | 2 | ⚪ 未開始 | ITM-03 | 禮包一次發放多道具 | 無 |  |
| **ITM-10** | M8 | 道具背包 UI 與使用確認/不足提示 | ui | 3 | 🟢 已接線 | ITM-03 | 顯示持有清單、篩選、數量不足導向商城 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **ITM-11** | M8 | 道具商城購買（玉璧 CURR_GEM） | logic | 2 | 📄 僅資料 | ITM-03 | 以玉璧購買並扣款 | LocalGachaService.ts 有 gems 錢包但無道具商店 |  |
| **ITM-12** | M8 | 美酒/推薦美酒社交裂變與傭兵結義消耗 | logic | 2 | ⚪ 未開始 | ITM-03 | 推薦送5瓶且傭兵結義消耗美酒 | 無 | 未開始→未開始；v16.9 協調線回報：被 Q42 擋，狀態不變 |
| **EQP-01** | M8 | Inventory Service 統一資料層（Item_Type/Display_Bucket/Slot_Type） | data | 3 | 🟢 已接線 | - | 單一服務可表達道具/裝備/虎符/英靈卡四類投影 | 無 InventoryService；SpiritCard.ts 僅為歸檔快照 | 未開始→已接線；InventoryProjection／BagDomain／InventoryRecordBridge 有 src 呼叫端（GameSession、PlayerSaveService） |
| **EQP-02** | M8 | 物件分類與來源追蹤欄位（含死亡結算、退役回收、俘虜） | logic | 2 | ⚪ 未開始 | EQP-01 | 所有入庫記錄 source，退役與俘虜共用欄位 | 無 |  |
| **EQP-03** | M8 | 武將六槽裝備與數值累加 final_stat=base+Σbonus | logic | 3 | ⚪ 未開始 | EQP-01 | 裝備後面板與戰場數值含加成，單元測試通過 | GeneralUnit.ts 無 equipment 欄位 |  |
| **EQP-04** | M8 | 虎符唯一性、轉交與拔除降忠誠 | logic | 3 | 🟢 已接線 | EQP-01 | 同虎符只由一人持有，拔除降忠誠 | assets/scripts/shared/TallyCardContract.ts 與 TigerTally*Composite.ts 僅為顯示契約，無持有/忠誠邏輯 | 僅資料→已接線；協調線回報：TigerTallyHoldings 接 GameSession；有測試 |
| **EQP-05** | M7 | 虎符升星（1~3戰鬥經驗）與突破（4~5虎符精華） | logic | 3 | 🟢 已接線 | EQP-04 | 星級與材料消耗規則測試通過 | 無 | 未開始→已接線；v16.9 協調線回報：TigerTallyStar／TigerTallyBreakthrough 由 GameSession 呼叫（已核對 master） |
| **EQP-06** | M9 | 英靈卡命槽單插與替換提示 | logic | 2 | 🟢 已接線 | EQP-01 | 每將僅1張，替換需確認並解除原被動 | CharacterDs3BloodlineChild.ts 內 TODO(B-stage4) spiritCardSlots 未映射 | 未開始→已接線；SpiritSlotFlow 接 GeneralDetailBloodlineChild；替換確認與被動解除未逐項核對 |
| **EQP-07** | M4 | 退役裝備回倉庫與傳承給後代 | logic | 2 | 🟢 已接線 | EQP-03 | 退役觸發自動回倉庫，可轉移後代 | 無 | 純邏輯→已接線；#1301 GearEquipFlow 回倉＋GameSession.retireGeneral 傳承（heirChildId） |
| **EQP-08** | M4 | 取得管道：死亡結算產虎符/英靈卡、封賞招降移交虎符 | logic | 3 | 🟢 已接線 | EQP-04, EQP-06 | 死亡結算同時生成兩張卡 | [v3 核對 2026-10-13] LegacyService.ts 引入 produceDeathTally（TigerTally.ts）產虎符；GeneralArchiver 建英靈卡快照；TRP-07 測試通過 |  |
| **EQP-09** | M9 | 傳家寶與俘虜無期徒刑產出 | logic | 2 | 🟢 已接線 | EQP-02 | 無期徒刑產出傳家寶並可裝備/販賣 | 無 | 未開始→已接線；#1289 無期徒刑傳家寶產出（PrisonerOfWar／GameSession 修改，已有呼叫端） |
| **EQP-10** | M7 | 參謀官/後勤官 Sortie_Loadout 資料與 HUD 顯示 | logic | 3 | 🟢 已接線 | EQP-01 | 提供計謀點與糧草上限且不暗示額外武將 | 無 Sortie_Loadout | 未開始→已接線；協調線回報：SortieSetupController 接 LobbyScene |
| **EQP-11** | M8 | 商業化：欄位解鎖、自動整理、強化材料消耗 | logic | 2 | ⚪ 未開始 | EQP-03 | 付費解鎖欄位與整理功能 | [v16.4 封鎖 blocked 2026-10-27] 商業化（付費解鎖欄位與整理功能）待使用者裁決 ；無 |  |
| **EQP-12** | M10 | 人物頁 命/寶/兵 三頁裝配分工 | ui | 4 | 📄 僅資料 | EQP-03, EQP-04, EQP-06 | 三頁各自負責對應裝配且 overview 不承接 | assets/resources/ui-spec/fragments/layouts/character-ds3-equip-content.json；CharacterDs3EquipChild.ts 為 TODO 空殼；GeneralDetailAptitudeChild.ts 存在但無虎符槽 |  |
| **TSK-01** | M7 | 前置共識：移除 SMART 兵種入口、統一參謀官/後勤官稱謂 | logic | 1 | 🟢 已接線 | - | 程式與 UI 無 SMART 與舊稱 | 未查得相關清理（需檢查 grep SMART） | 未開始→已接線；協調線確認：#1286 完成，結案 |
| **TSK-02** | M10 | 人物頁 tab 收斂 將/屬/命/技/寶/兵 與 route key | ui | 2 | 📄 僅資料 | - | GeneralDetailComposite tab 與 route key 對齊 | assets/scripts/ui/components/GeneralDetailComposite.ts、general-detail/GeneralDetail*Child.ts（Basics/Stats/Bloodline/Skills/Extended/Aptitude），未與 Overview/Stats/Bloodline/Tactics/Equip/Aptitude 完全對齊 |  |
| **TSK-03** | M10 | 命頁 UI spec（14祖譜、五階奧義軌、StoryDock） | ui | 4 | 🟢 已接線 | TSK-02 | 命頁依 2.0 規格完成 layout 並通過 validate-ui-specs | [v16.8 更正 2026-10-28] 命頁 layout 由 GDUI-04/05/06 的 cc 接線推定完成（左右兩欄、StoryDock）；未逐項核對 layout JSON 與 validate-ui-specs |  |
| **TSK-04** | M10 | 寶頁 2x3 六槽 UI + HeirloomCard/ItemSummaryCard | ui | 3 | 🟢 已接線 | TSK-02 | 六槽鍵值 WEAPON/HEAD/BODY/BOOTS/ACCESSORY_A/B 顯示空槽 placeholder | character-ds3-equip-content.json；CharacterDs3EquipChild.ts TODO | 僅資料→已接線；協調線回報：#1313（af9094bf）合併；HeirloomCard 以模組名未查到 src 呼叫端，待核對 |
| **TSK-05** | M10 | 兵頁虎符槽/兵種·地形·天氣適性/戰鬥定位 | ui | 3 | 🟢 已接線 | TSK-02 | TallySlotCard 與五段 layout 完成 | GeneralDetailAptitudeChild.ts 存在但無 TallySlotCard；contracts 無 aptitude schema | 未開始→已接線；#1312 AptitudeView 接 CharacterDs3AptitudeChild |
| **TSK-06** | M10 | 將頁 名聲/官職/統領軍勢 區塊 | ui | 2 | 🟢 已接線 | ECO-02 | 顯示帶兵上限、城市兵源、預估出征軍勢 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **TSK-07** | M10 | general-detail-equip / aptitude content schema 與 Mapper | tool | 3 | 🟢 已接線 | TSK-04, TSK-05 | schema 通過 validate-ui-specs --strict，Mapper 組裝三/五段資料 | contracts 僅 general-detail-content/overview schema；無 EquipMapper/AptitudeMapper | 未開始→已接線；#1334 EquipPageSegments 接 GeneralDetailOverviewMapper |
| **TSK-08** | M10 | GearModules/AptitudeModules fragment 與 BindPathPolicy | ui | 2 | ⚪ 未開始 | TSK-07 | layout JSON 與 runtime bind path 一致 | 僅有 GeneralDetailOverviewBindPathPolicy.ts，無 Equip 版 |  |
| **TSK-09** | M9 | Data Read Model：Spirit_Card_Collection/Spirit_Family_State/Inventory_Service Display_Bucket | data | 3 | ⚪ 未開始 | EQP-01 | 欄位補齊並可算 SELF/FAMILY/ECHO | 無 |  |
| **TSK-10** | M10 | Profile_Presentation 與 Bloodline_Ultimate read model | data | 2 | 🟢 已接線 | TSK-09 | Default_Tab/StoryDock 狀態/五階奧義可讀 | 無 | 未開始→已接線；#1287（c1693f52）GeneralReadModel 補 Bloodline_Ultimate 子欄位；GDART-08 未改 |
| **TSK-11** | M5 | 戰場與治理新增軍勢欄位及人口貢獻 UI | ui | 3 | 🟡 純邏輯 | ECO-02 | 顯示 City_Troops_Current/Cap、Sortie_Troop_Pool 與 Returned_Troops | [v6 核對 2026-10-14] 城市兵源與出征軍勢面板 Presenter（50dc5f1a）純邏輯；畫面接線未核對 |  |
| **TSK-12** | M10 | Dialog shell 共用與 spirit-tally-detail 共用入口 | ui | 2 | 📄 僅資料 | TSK-03, TSK-05 | 英靈卡/虎符詳情都導向 spirit-tally-detail-main.json | assets/resources/ui-spec/layouts/spirit-tally-detail-main.json 存在，尚未接線 |  |
| **TSK-13** | M9 | 多家族卡平衡檢查 | test | 1.5 | ⚪ 未開始 | TSK-09 | 多卡不線性疊加的平衡測試通過 | 無 |  |
| **BAG-01** | M8 | 武將背包基礎結構與六欄定義與解鎖（3基礎+3進階） | logic | 2 | ✅ 已驗收 | - | Unlocked_Slots 控制各欄可用，錯類型被拒 | [v6 核對 2026-10-14] 武將背包六欄結構與解鎖（fbc60396，PROG-2-0324）；GeneralBackpack 1 處呼叫端與 2 個測試 |  |
| **BAG-02** | M8 | 主城倉庫：50格、擴容+20、上限200 | logic | 2 | 🟢 已接線 | - | capacity=50+n×20 且不超過200，滿倉拒絕存入 | [v6 核對 2026-10-14] 主城倉庫容量與滿倉拒絕存入（491e7b4c、db749023，PROG-2-0323）已在 master；WarehouseCapacity 接 GeneralEquipTransfer。注意：PM 先前說 PR #186 未合，請 PM 確認此提交是否為 BAG-02 的合併 |  |
| **BAG-03** | M8 | 裝備/卸下操作（倉庫↔武將）含鎖定檢查 | logic | 2 | 🟢 已接線 | BAG-01, BAG-02 | 移動後兩端資料一致 | 無 | 未開始→已接線；GearEquipFlow 接 GameSession 與 GearSlotPickController；有測試 |
| **BAG-04** | M8 | 裝備效果計算合入戰場數值與品質加成範圍 | logic | 2 | ⚪ 未開始 | BAG-01 | SSR+50~100等範圍由品質決定並合入面板 | 無 |  |
| **BAG-05** | M8 | 倉庫篩選排序（品質/類型/時間） | logic | 1 | 🟢 已接線 | BAG-02 | 排序結果穩定 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **BAG-06** | M4 | 退役裝備自動回倉 | logic | 1.5 | 🟢 已接線 | BAG-03 | 退役觸發後裝備回倉，滿倉有提示 | [v16.7 更正 2026-10-28] 武將退役或老死後裝備回倉（PR #1065，PROG-2-0681）；GameSession 內有 equippedBy 清除路徑 |  |
| **BAG-07** | M8 | 物品鎖定與分解回收材料 | logic | 2 | 🟢 已接線 | BAG-03 | 鎖定品不可售/解，分解給材料 | 無 | 未開始→已接線；#1321 GearLockDecompose 接 GameSession；InventoryProjection 修改 |
| **BAG-08** | M8 | 寶物圖鑑 | content | 2 | 🟢 已接線 | BAG-02 | 取得過的寶物被記錄並顯示 | 無 | 未開始→已接線；#1324 TreasureCodex 接 ItemBagController／LobbyScene |
| **BAG-09** | M6 | 倉庫/背包 UI 與字串（UI_WAREHOUSE 等） | ui | 3 | 🟡 純邏輯 | BAG-02, BAG-03 | 顯示容量、擴容按鈕、滿倉提示 | [v8 核對 2026-10-15] 倉庫面板控制器（69b267cb）；WarehousePanelController 尚未掛載到場景 |  |
| **BAG-10** | M8 | 虎符/英靈卡不入普通格（Display_Bucket 分域） | logic | 1.5 | 🟢 已接線 | BAG-02 | 英靈卡不占倉庫格數，虎符不可丟棄販賣 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **BAG-11** | M11 | 伺服器裝備記錄表（equip_id/slot_type） | server | 2 | ⚪ 未開始 | BAG-03 | 表欄位與 schema 對齊並可同步 | server/src 僅 index.ts |  |
| **SPI-01** | M4 | 死亡結算產英靈卡+虎符卡（僅史實名將/女性名將，退役不產） | logic | 3 | ✅ 已驗收 | - | 名將死亡產生兩卡，非名將與退役不產 | [master fb02ff9 重估] tests/SpiritRelic.test.ts（run-cli 通過） |  |
| **SPI-02** | M9 | 唯一性與覆蓋：FinalStat=max、LineageScore累加、階位不倒退 | logic | 2 | ⚪ 未開始 | SPI-01 | 同模板再死亡覆蓋而非新增，單元測試通過 | 無 |  |
| **SPI-03** | M9 | 英勇事蹟/屬性/技能快照（Spirit_Archive_Snapshot） | data | 3 | ✅ 已驗收 | SPI-01 | 死亡時存下完整快照並可查詢 | [v5 核對 2026-10-14] 英靈死亡快照含英勇事蹟、最終屬性與技能（d4fe9144，PROG-2-0313）；SpiritArchiveSnapshot 2 處呼叫端，tests/SpiritRelic.test.ts 通過 |  |
| **SPI-04** | M9 | 命槽單插、雙卡同裝（1英靈+1虎符） | logic | 2 | ⚪ 未開始 | SPI-01 | 重複插入被拒，兩卡可同裝 | 無 |  |
| **SPI-05** | M9 | 光效三階 SELF/FAMILY/ECHO 與家族封頂 | logic | 3 | ⚪ 未開始 | SPI-04 | 依裝配者計算共鳴階並封頂 | 無 |  |
| **SPI-06** | M9 | 主卡/副卡模型與 CardGrowth=min(cap,pool)、溢出轉 Family_Fame/Depth | logic | 3 | ⚪ 未開始 | SPI-02 | 設為主卡後供養只灌主卡，戰鬥中鎖定 | 無 |  |
| **SPI-07** | M9 | 家族積分 HeadScore+MeritScore 與四階世家等級 | logic | 4 | ⚪ 未開始 | SPI-06 | 權重100/80/120%與階位解鎖測試通過 | 無 |  |
| **SPI-08** | M9 | 家族名聲值供養消耗與降階 | logic | 2 | ⚪ 未開始 | SPI-07 | 名聲不足時高階效果降階 | 無 |  |
| **SPI-09** | M9 | 姓氏零和與家傳絕學弱化 | logic | 2 | ⚪ 未開始 | SPI-07 | 子嗣只能計入一姓，非本姓獲弱化效果 | 無（M2 血統在 BloodlineGraph.ts，無姓氏歸屬） |  |
| **SPI-10** | M9 | 防火牆：近親衰減、同宗不相殘、質重於量 | logic | 2 | ⚪ 未開始 | SPI-07 | 內戰功勳打折、近親效率下降 | 無 |  |
| **SPI-11** | M9 | 傳道與專屬奧義權限 | logic | 2 | ⚪ 未開始 | SPI-02 | 英靈卡可授祖靈加護並消耗資源與次數 | 無 |  |
| **SPI-12** | M9 | 世家總覽/英靈陳列室/詳情/雙卡結算 UI | ui | 5 | 📄 僅資料 | SPI-06, SPI-03 | 總覽與陳列室分組顯示並可設主卡 | assets/scripts/ui/core/SpiritFamilyOverviewRoute.ts（顯示模型殼）；LobbyScene.ts onClickSpiritFamilyOverview；spirit-tally-detail-main.json |  |
| **SPI-13** | M9 | 幼兒指派低效內政（MCQ Q51）、戰場單場覺醒上限1（Q52）、姓氏匹配保證戰法提示（Q32） | logic | 2 | ⚪ 未開始 | SPI-09 | 三條 MCQ 規則各有單元測試 | 無 |  |

### 3.3 3. 大廳、開場與生涯 (Lobby, Onboarding & Journey)

> 涵蓋幕府大廳建設、祭壇互動、開場引導劇本、轉蛋機率與祈願池、生涯武將日誌、留存每日簽到與正式文案。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **HALL-01** | M6 | 大廳資料模型與 Lobby_Hub schema（主題/任務板/官職快照/點位/沙盤/祭壇） | data | 2 | 🟢 已接線 | - | Lobby_Hub 型別與 JSON schema 可載入範例資料並通過 schema 驗證，含 Intel_Reveal_Percent、AI_Assign_Enabled 等欄位 | [v7 核對 2026-10-14] LobbyHubSchema 由 LobbyScene、HallBoardPanelController、HallMissionBoardPresenter 等呼叫（8ee94a49、3695df97）。前次 PM 裁定「無呼叫端維持純邏輯」，現已有呼叫端，請 PM 確認是否升級 |  |
| **HALL-02** | M6 | 大廳場景骨架與頂部狀態列（資源/官職/時段） | ui | 3 | 🟢 已接線 | HALL-01 | 進入大廳可見左右牆、中央沙盤區、點位區、祭壇區與頂部狀態列，畫面符合 layout spec | assets/scripts/ui/scenes/LobbyScene.ts(1486行)、ui-spec/layouts/lobby-main-screen.json；無 runtime 驗收測試(僅 tests/fixtures/dom-to-ui/lobby-action.html) |  |
| **HALL-03** | M6 | 雙牆任務板：任務池生成/可見性過濾/已接取置頂/五級難度 | logic | 3 | 🟢 已接線 | HALL-01 | getVisibleHallTasks 依官職/沙盤階段/情報過濾；進入大廳、早中晚切換、手動刷新三時機重算；已接取任務置頂 | [v7 核對 2026-10-14] HallMissionBoardPresenter 由 HallBoardPanelController 與 LobbyScene 呼叫，雙牆任務板畫面（8ee94a49，PROG-2-0456）。前次 PM 裁定維持純邏輯，現已有呼叫端，請 PM 確認是否升級 |  |
| **HALL-04** | M6 | 任務詳情彈窗 800x900 Modal（情報度/再探/執行/等待/委任/ESC/背景關閉） | ui | 4 | 🟢 已接線 | HALL-03 | 點擊任務開啟阻斷式彈窗，顯示情報度、四耗費、基礎與完美獎勵，四按鈕橫排，X/ESC/背景點擊可關閉 | assets/scripts/ui/components/LobbyMissionDetailDialogComposite.ts(894行，含 intelRevealPercent、btnAssign、KeyCode.ESCAPE)、ui-spec/layouts/lobby-mission-detail-dialog-main.json；無單元測試 |  |
| **HALL-05** | M6 | 情報度與 AI 委任邏輯（F-5：再探升100%、Required_Intel 與 Reveal 分離、委任回看紀錄） | logic | 2 | 🟢 已接線 | HALL-04 | 再探將 Intel_Reveal_Percent 刷新到100且完整內容揭露；委任後由 AI 選將執行並可回看結算紀錄；單元測試涵蓋 F-5 四函式 | [v16 核對 2026-10-21] 情報度與委任判斷：HallTaskIntel 由 HallAutoAssign、HallDetailActionStates 呼叫（a56a17f4，PROG-2-1005，#749），HallTaskIntel.test.ts 存在；回看紀錄資料結構未核對 |  |
| **HALL-06** | M6 | 自告奮勇事件（F-2 判定、毛遂自薦標記、下拉優先提示、一次性演出） | logic | 2 | 🟢 已接線 | HALL-04 | shouldShowVolunteerEvent 判定正確且每任務僅觸發一次；下拉清單優先列出自薦者；成功率加成規則依裁定落地 | LobbyScene.ts L556/L1056/L1321 _isMissionDetailVolunteerGeneral 僅標記 volunteer 旗標；無 F-2 判定與 +50% 加成、無測試 |  |
| **HALL-07** | M6 | 武將點位刷新池（6~8點位、3~5人、60秒洗牌、Idle、頭頂姓名官職、集體反應） | logic | 3 | 🟢 已接線 | HALL-02 | rollHallCharacters 加權抽樣正確(favorite 2.0/assigned 1.2)，每60秒刷新，點擊可對話/看資訊 | [v7 核對 2026-10-14] HallCharacterPresenter 由 GameSession 與 HallBoardPanelController 呼叫（3695df97，PROG-2-0455）；6~8 點位與 60 秒洗牌未逐項核對 |  |
| **HALL-08** | M9 | 世界沙盤 S1/S2/S3 階段、遠征檔案、解鎖歷史保留 | logic | 4 | 🟢 已接線 | HALL-01 | 依官職解鎖沙盤階段；Unlock_History 在天下重組後不倒退；S3 顯示 Expedition Dossier 輪廓 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **HALL-09** | M10 | 晝夜與節慶主題配置驅動（背景/裝飾/前景粒子三層、主題切換） | ui | 3 | 🟢 已接線 | HALL-02 | 切換 Theme_ID 即可更換日夜光色與節慶三層，不含節慶硬寫分支 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **HALL-10** | M8 | 許願祭壇大廳入口（早中晚三巡、插槽三態、倒數/收取/加速） | ui | 3 | ⚪ 未開始 | HALL-02 | Wish_Pool.Active_Wishes 映射為插槽空位/進行中/可領取；加速後剩餘時間不低於0並轉可收取 | [v16.4 封鎖 blocked 2026-10-27] HALL-10 依據：ECO-03「精元與靈玉是否同一付費貨幣」仍等使用者裁決，許願祭壇的付費加速依賴此貨幣定義，故封鎖 ；等使用者裁決（PM 指示，repo 內無對應說明） ；無（grep Wish_Altar/wish 於 assets/scripts 無結果） |  |
| **HALL-11** | M9 | 官職快照讀取與功能/欄位/沙盤解鎖掛載 | logic | 2 | 🟢 已接線 | HALL-01 | 大廳讀取 Officer_Snapshot 並依階位解鎖任務難度上限、欄位數與熱點 | [v13 核對 2026-10-20] 官職快照接線到大廳任務牆與沙盤入口（d81dc669，PROG-2-0824，#592）；OfficerDisplay 由 LobbyScene 與 HallMissionSettlement 呼叫。沙盤解鎖掛載未逐項核對 |  |
| **HALL-12** | M9 | 世家總覽熱點與世家入口捷徑 | ui | 3 | 🟢 已接線 | HALL-02, HALL-11 | 已解鎖世家系統時顯示世家總覽熱點，依家族分組顯示家族名/主卡/深度/名聲；未解鎖則隱藏 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **HALL-13** | M10 | 大廳字串/劇本文案 i18n 與城市兵源顯示覆寫 | content | 1 | 🟡 純邏輯 | HALL-02 | H章20個 UI_HALL_* Key 與G章9句文案進 i18n 表；軍事成本顯示『消耗城市兵源 {N}』 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **HALL-14** | M11 | 大廳伺服端同步與驗收測試（hall_*_json、單元/整合測試） | server | 3 | 🟡 純邏輯 | HALL-03, HALL-07, HALL-08 | 大廳狀態可存取同步，並有自動化測試覆蓋任務可見性、情報度與刷新池 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 | 2026-10-28 核對 master：HallSyncSnapshot 僅測試，無 src 呼叫端；與盤點一致，維持純邏輯 |
| **GCH-01** | M8 | 雙池資料與機率表（名將池 SSR3/SR10/R87、支援池 SSR5/SR25/R70、Up 比例） | data | 2 | 📄 僅資料 | - | gacha-config 含兩池機率、Up 角色、Featured_SSR 與 Female_Role_Type_Map，載入驗證通過 | assets/resources/data/gacha-config.json（僅 hero-pool/support-pool、guaranteeThreshold 10/5，無 SSR/SR 機率與 Up）；core/models/GachaConfig.ts |  |
| **GCH-02** | M8 | 抽取引擎：單抽/十連、稀有度抽樣、Up 權重、女性名將定位 | logic | 3 | ✅ 已驗收 | GCH-01 | 固定 seed 下抽樣分佈符合規格機率(統計測試)；結果寫入 Action log | [v6 核對 2026-10-14] 轉蛋規格機率與保底接線（c0e54159，PROG-2-0335）；GachaDraw 3 處呼叫端，3 個測試檔 |  |
| **GCH-03** | M8 | 保底系統：50抽小保底SR+、200抽大保底、兩池計數獨立 | logic | 2 | ✅ 已驗收 | GCH-02 | 第50抽必出SR+、累計200抽解鎖天命商店；兩池計數互不影響，測試覆蓋 | [v12 核對 2026-10-20] 保底計數：小保底第 50 抽必出 SR+、大保底 200 抽、各池計數獨立（GachaDraw.ts，PM 2026-10-20 指示核對）；GachaDraw.test.ts 覆蓋小保底，GachaDraw 由 GameSession、LocalGachaService、PlayerSaveService 呼叫，存檔 gachaPity 有 GachaPityStorage 測試 |  |
| **GCH-04** | M8 | 貨幣系統分流（靈玉/銅錢符/求籤令）與扣款規則 | logic | 2 | 🟢 已接線 | GCH-01 | 靈玉兩池可用、銅錢符僅常設池、求籤令定向保底上限100；餘額不足拒絕 | [v6 核對 2026-10-14] 貨幣分流（7af83379）、錢包補銅錢符與求籤令（d7757bcd）、錢包併入存檔（af718aac）；LocalGachaService 接線 |  |
| **GCH-05** | M8 | 轉生機制 1~5 轉（培育機會次數與屬性上限 1000/1100/1250/1400/1500+） | logic | 3 | ✅ 已驗收 | GCH-02 | 重複抽到同名武將轉數+1，上限表與培育次數正確；溢出走結義點數 | [v5 核對 2026-10-14] 重複抽到同名武將轉生 +1 轉（18a78d57，PROG-2-0314）；Rebirth 接線，tests/Rebirth.test.ts 通過 |  |
| **GCH-06** | M8 | 天命商店與結義點數兌換、溢出轉化積分 | ui | 3 | ✅ 已驗收 | GCH-03, GCH-05 | 大保底達200可兌換任意SSR；5轉滿溢出轉結義金蘭卡/積分並顯示 Toast | [v5 核對 2026-10-14] 滿轉溢出轉結義點數（2e85b065，PROG-2-0315）；OverflowBond 2 處呼叫端，測試通過 |  |
| **GCH-07** | M8 | 戰法隨機化（同名第2/3戰法隨機、重複轉經驗值） | logic | 2 | ⚪ 未開始 | GCH-02 | 同名武將第2、第3戰法在池內隨機抽出，重複時轉經驗值 | 無 |  |
| **GCH-08** | M6 | 轉蛋 UI 流程：池頁簽、機率公告、單抽快速演出/十連開牌、結果頁 | ui | 4 | 🟢 已接線 | GCH-02 | 名將池/支援池/限定頁簽可切換，1抽約2秒演出，10連逐張開牌，顯示距保底抽數 | assets/scripts/ui/core/GachaFlowCoordinator.ts、ui/components/gacha-ds3/Gacha*Child.ts、ui-spec/layouts/gacha-main.json、gacha-pull-result.json；無測試 |  |
| **GCH-09** | M10 | GachaMain 商業主視覺與人物立繪 soft-alpha/key visual | content | 3 | 🟢 已接線 | GCH-08 | Banner 人物無矩形邊界/白底鬼影/硬切alpha，不壓住池名條與CTA；未就緒池省略人物節點 | tests/fixtures/dom-to-ui/gacha-banner.html 與 baseline；PortraitSoftMask 材質需另查；無 runtime 驗收 |  |
| **GCH-10** | M6 | 雙池定位導覽與死亡傳承提示（血統種子/培育深度、英靈/虎符提示） | ui | 1 | 🟢 已接線 | GCH-08 | 卡池頁與新手引導明示定位；名將詳情頁提示死亡後留下英靈卡與虎符卡且不在抽卡結果掉落 | [v7 核對 2026-10-14] 雙池定位導覽接入轉蛋畫面（19c9b34e、7e592c85）；GachaPoolGuide 2 處呼叫端；死亡傳承提示 UI 未逐項核對 |  |
| **GCH-11** | M3 | 支援卡教官被動技能驗證與教官碎片/碎片庫 | logic | 3 | 📄 僅資料 | GCH-02 | SR/SSR 支援卡被動技能經驗證載入；重複卡分解為教官碎片進碎片庫並可合成低稀有支援卡 | assets/resources/data/support-cards.json（資料）；碎片庫無 |  |
| **GCH-12** | M8 | 限定池排程與期間限定角色輪替 | server | 3 | 🟡 純邏輯 | GCH-01 | 可依排程上下架限定池；銅錢符不可用於限定池 | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（純邏輯）；待 QA／實機驗收 |  |
| **GCH-13** | M9 | 重複卡連動：同名卡升星、傭兵二轉(Q73)、譜牒印記(子孫升星) | logic | 3 | ⚪ 未開始 | GCH-05 | 僅史實名將可同名升星；傭兵轉正後抽到同名觸發二轉；子孫升星透過 Lineage_Seal | 無 |  |
| **GCH-14** | M11 | 抽卡伺服端記錄與同步（Total_Pulls/Pity/Bonding/Last_SSR_Pull） | server | 3 | 🟡 純邏輯 | GCH-03, GCH-04 | 伺服端保存玩家各池累計抽數與保底，客戶端離線抽卡同步時可驗證 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 | 2026-10-28 核對 master：GachaSyncRecord 僅測試，無 src 呼叫端；與盤點一致，維持純邏輯 |
| **OPEN-01** | M6 | OpeningFlowController 與 OpeningFlowConfig（階段順序/進出條件/可回溯事件） | logic | 3 | 🟢 已接線 | - | 可依 phase 設定依序播放開場各幕，每階段有進出條件，中斷可還原並在未登入情況顯示預設內容 | [v6 核對 2026-10-14] 可設定開場流程控制器（fd8b82ea，PROG-2-0109）；宿命轉蛋接上開場（8223115f，OPEN-05 接 OPEN-01） |  |
| **OPEN-02** | M11 | 開場資料表（HeroBase/SupportCardBase/InheritLogic/初始六名將/紅顏/因子標籤/祖先矩陣） | data | 3 | 🟡 純邏輯 | - | 六位初始名將(張飛/魏延/夏侯惇/張郃/孫策/甘寧)含出生地/稱號/主因子與台詞載入驗證通過 | [v6 核對 2026-10-14] 初始六名將表（58e88e37）與 generalId 引用（cdc70353）；無 src 呼叫端 | 2026-10-28 核對 master：InitialHeroTable.ts 與 initial-heroes.json、其測試已於 a33a2a0e（#1206）移除；現以 InitialGeneralShowcase（InitialShowcaseController 呼叫）顯示初始六名將。資料表驗證已不存在，待 PM 裁決是否重建 |
| **OPEN-03** | M10 | 黑場古文、Win95 信件、漫畫分鏡與像素回憶演出 | ui | 5 | 🟡 純邏輯 | OPEN-01 | 第一幕四個分鏡依序播放，信件需點擊進入下一幕，含祖紋命篆浮現與像素被因子光痕侵入 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **OPEN-04** | M10 | 漩渦吸入/白閃轉場控制器與特效 | ui | 3 | 🟢 已接線 | OPEN-03 | 像素畫面→命盤裂口漩渦→轉蛋盤飛出，轉場節奏明顯，手機可流暢播放 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **OPEN-05** | M6 | 宿命轉蛋：無限重置十連抽、初始名將鎖定與確認 | logic | 3 | ✅ 已驗收 | OPEN-02 | 可無限免費重置十連抽，重置後回初始狀態，確認後鎖定一位初始名將 | [v6 核對 2026-10-14] 宿命轉蛋純狀態機（4e41f8b5）：無限重置十連與初始名將鎖定；DestinyGacha 2 處呼叫端 |  |
| **OPEN-06** | M10 | 六位初始名將展示卡與登場台詞 | ui | 3 | 🟡 純邏輯 | OPEN-05 | 每位名將以立繪/骨架動畫登場並播放專屬台詞，名將與紅顏不同畫面 | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（純邏輯）；待 QA／實機驗收 |  |
| **OPEN-07** | M5 | 首戰教學戰（5路x8格）與教學提示浮窗 | logic | 4 | 🟢 已接線 | OPEN-05 | 新手可完成部署/推進/對推教學戰並看到勝敗結算 | [v5 核對 2026-10-14] 首戰教學提示 Presenter 接戰場浮窗（1cca03cb，PROG-2-0241）與提示順序（6092baa7）；FirstBattleTutorial 有呼叫端，BattleTutorialHint 無專屬測試 |  |
| **OPEN-08** | M2 | 因子解鎖特效與因子面板/六角圖（AttributePanel） | ui | 3 | 🟢 已接線 | OPEN-07 | 戰鬥觸發因子時顯示字卡與祖紋命篆亮起；因子面板顯示主因子、次級因子與解鎖狀態 | [v11 核對 2026-10-20] 六角圖 cc 接線與解鎖特效（7d0be8bd，PROG-2-0721）；FactorHexGraphic 由 LobbyScene 掛載，FactorHexPanel 測試存在；實機畫面未核對 |  |
| **OPEN-09** | M2 | 祖先矩陣與血統樹 UI（14人祖譜、子嗣預測、解鎖順序） | ui | 4 | 🟢 已接線 | OPEN-02 | 依主因子→次因子→祖先矩陣→子嗣預測順序解鎖，顯示父母系譜與因子流向 | assets/scripts/ui/panels/BloodlineTreePanel.ts(101行，僅3代)、core/services/BloodlineGraph.ts、core/systems/BloodlineGenerator.ts；14人矩陣與子嗣預測面板無；無測試 |  |
| **OPEN-10** | M6 | 紅顏池與支援角色展示（貂蟬/甄姬/小喬） | ui | 3 | 🟢 已接線 | OPEN-05 | 紅顏池與名將池分離，粉紫金風格，三位核心紅顏卡面與功能定位文字完整 | [v8 核對 2026-10-15] 紅顏展示接到轉蛋 Support 分頁（36c19dbb）；RedFaceShowcaseController 2 處呼叫端；展示畫面實機未核對 |  |
| **OPEN-11** | M6 | CountdownManager 趕路倒數（離線累積、常駐圖示、加速/完成） | logic | 3 | 🟢 已接線 | OPEN-10 | 倒數離線時間累積正確，完成後切換已到達狀態，主畫面常駐圖示 | [v7 核對 2026-10-14] CountdownIconView 接 LobbyScene 常駐圖示（7d4e59ce，PROG-2-0469）；CountdownManager 測試；趕路狀態切換未實機核對 |  |
| **OPEN-12** | M8 | 商業化彈窗與付費入口（0.99 破冰、29.99 全明星包、二次情感付費） | ui | 3 | ⚪ 未開始 | OPEN-10, OPEN-11 | 拒絕29.99後出現0.99彈窗，入口讀取同一配置表，不遮蔽核心教學 | [v16.4 封鎖 blocked 2026-10-27] 商業化（0.99 彈窗、29.99 全明星包、二次付費）待使用者裁決 ；無 |  |
| **OPEN-13** | M9 | 英靈夢回開場教學戰（傳說英靈→初始虎符/英靈記憶） | logic | 4 | 🟢 已接線 | OPEN-07 | 教學戰後英靈轉為初始虎符/記憶，不成為永久主角 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **OPEN-14** | M0 | 開場流程驗收測試與 UI 驗收（手機可讀、進退場、文案一致） | test | 2 | 🟢 已接線 | OPEN-01, OPEN-05, OPEN-11 | 17.4 五項程式驗證點有自動化測試；13章交付檢查清單全勾 | [v9 核對 2026-10-15] NewPlayerOpening 2 處呼叫端、OpeningIntroController、DestinyOpeningController（#430、#447、#456）；手機可讀與進退場實機驗收未做 |  |
| **JRN-01** | M9 | 武將日誌主檔 schema 與寫入 API（Journal_Entries/Action 範圍/Snapshot_Ref） | data | 2 | ⚪ 未開始 | - | 重大戰果/派遣/互動事件可寫入時間軸並依武將/類別查詢，並可回扣 Action_Records 序號 | 無（grep General_Journal/JournalEvent 無結果） |  |
| **JRN-02** | M9 | 晨報摘要生成（F-1：時間窗/加權抽樣/折疊重複低價值） | logic | 3 | 🟢 已接線 | JRN-01 | buildMorningReport 依官職輸出2~3則，隱藏事件不入選，同類折疊；單元測試通過 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **JRN-03** | M9 | 派遣整備：派遣案、品質評分(F-2)、冷卻、完成回報 | logic | 4 | 🟢 已接線 | JRN-01 | getDispatchScore 輸出品質區間；高風險任務拒絕代勞；完成寫入日誌與獎勵 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **JRN-04** | M9 | 離線互動事件（F-3 觸發、靜態模板 slot-filling、每登入窗1則主互動） | logic | 3 | 🟢 已接線 | JRN-01 | 離線>=4h且有衝突標籤時觸發，同一對角色同窗僅1則 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **JRN-05** | M11 | 離線戰鬥快照（OfflineBattleSnapshot digest 與 syncHashLink 回扣） | server | 3 | 📄 僅資料 | JRN-01 | 自動解決/代勞產生快照，syncHashLink 可驗證回 Action_Records；不存逐格replay | /tmp/integ/assets/scripts/core/systems/SyncHash.ts、/tmp/integ/server/src/sync.ts、tests/SyncContract.test.ts（僅 sync hash 基礎，無 OfflineBattleSnapshot） |  |
| **JRN-06** | M6 | 晨報/日誌/派遣大廳入口 UI 與人物頁故事回看掛點 | ui | 4 | 🟡 純邏輯 | JRN-02, JRN-03 | 大廳顯示晨報彈窗與派遣板，人物頁抽屜可讀日誌摘要，空狀態顯示規定字串 | [v8 核對 2026-10-15] 大廳晨報與派遣板畫面流程（c5894d0d）；JournalHubController 尚未掛載到場景 |  |
| **JRN-07** | M10 | 日誌/晨報字串與劇本文案落地 | content | 1 | 🟢 已接線 | JRN-06 | H章9個 UI Key 與G章5句文案進 i18n | 無 | 未開始→已接線；#1297 JournalTexts 接 JournalHubController／GeneralJournalController（#1290 字串測試） |
| **JRN-08** | M9 | 三國日報 Log 解析（24h Log→事件）整併至日誌 | logic | 3 | ⚪ 未開始 | JRN-01 | 可從前24h Log 生成含獎勵(15%糧草)的日報條目並與晨報去重 | [v16.4 封鎖 blocked 2026-10-27] 需裁決：與留存系統 RET-04 重複 ；無（與留存系統 RET-04 重複，需裁決） |  |
| **JRN-09** | M11 | 智慧 NPC 第二階段：Utility AI + LLM + SQLite-vec RAG | server | 5 | ⚪ 未開始 | JRN-04 | Utility AI 決策、小型 LLM 潤飾、向量記憶檢索可在伺服端運作並降級為靜態模板 | 無（規格標示二階段升級，暫緩） |  |
| **RET-01** | M9 | 5階段插畫進度系統（見面/交手/認同/信任/結義 解鎖判定與收藏） | logic | 3 | 🟢 已接線 | - | 依 1場戰鬥/3勝/Bond>=40/轉永久 解鎖階段並可查閱 Stage x/5 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **RET-02** | M9 | 傭兵名牌（帶原主名字）與社交展示 | ui | 2 | ⚪ 未開始 | - | 傭兵卡面顯示『來自：{OriginalOwner}』 | 無 |  |
| **RET-03** | M9 | 告別信生成（Expired 且 Bond>=20；20~40普通、40+感人） | logic | 2 | 🟢 已接線 | RET-01 | 傭兵到期時依 Bond 生成對應告別信並進收件匣，未讀標記 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **RET-04** | M9 | 三國日報事件引擎（Log 採樣、NEWS_TRIGGER_TABLE、1~3條、插槽式敘事） | logic | 4 | 🟢 已接線 | - | 登入時依前24h Log 生成1~3條日報，事件類型符合觸發表，模板 [角色]+[情緒]+[行為]+[結果] 填充 | [v16.7 全面核對 2026-10-28] DailyNewsEngine（NEWS_TRIGGER_TABLE）由 GameSession、PlayerSaveService、TurnFlowManager 呼叫 |  |
| **RET-05** | M9 | 日報事件效果：復仇/代勞/自主特訓/團購獎勵結算 | logic | 3 | 🟢 已接線 | RET-04 | 復仇取回5~20%損失資源、代勞完成簡單任務、特訓屬性小幅提升，並可寫回存檔 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **RET-06** | M10 | 三國日報 UI 與劇本字串（頭條、已讀、各事件版型） | ui | 3 | 🟢 已接線 | RET-04 | 登入後彈出日報，顯示標題/日期與各事件字串，標記已讀 | 無 | 未開始→已接線；#1300 DailyReportTexts 接 DailyReportController／LobbyScene |
| **RET-07** | M9 | 世代成就（跨三代因子傳承偵測與獎勵） | logic | 2 | 🟢 已接線 | - | 後代出現祖先因子且世代差>=3時觸發成就與獎勵，Legacy_Count 累加 | [v8 核對 2026-10-15] 世代成就判定 LegacyAchievement（RET-07 純邏輯，2 處呼叫端與 2 個測試）；獎勵 UI 未核對 |  |
| **RET-08** | M4 | 退役回流（退役武將轉教官） | logic | 3 | ✅ 已驗收 | - | 退役武將可轉為教官卡並進培育流程 | [master fb02ff9 重估] tests/Legacy.test.ts（run-cli 通過） |  |
| **RET-09** | M9 | 日曆簽到連動（6日結義期每日登入）與連續登入統計 | logic | 2 | 🟢 已接線 | RET-01 | 6日結義倒數每日登入推進，Consecutive_Days/Last_Login 記錄 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **RET-10** | M9 | 薪資/懲罰系統（離隊與忠誠下降） | logic | 2 | ⚪ 未開始 | - | 忠誠度低於門檻時觸發離隊/懲罰，規格補齊公式後實作 | 無（規格僅一句，P2） |  |
| **RET-11** | M11 | 離線社交（與他玩家武將切磋，需伺服端快照） | server | 4 | ⚪ 未開始 | RET-04 | 非同步取得他玩家武將快照並生成切磋日報與經驗獎勵 | 無（需伺服器，MVP 暫緩） |  |
| **RET-12** | M9 | 7天玩家體驗歷程與關鍵留存觸發點（無課/課長雙軌） | content | 3 | 🟢 已接線 | RET-04, RET-09 | Day1~7 事件節點可由配置驅動，Day1晚首次日報、Day2子嗣誕生通知等觸發點可測 | 無 | 未開始→已接線；#1294 SevenDayJourney 接 GameSession／PlayerSaveService |
| **RET-13** | M11 | 留存伺服端統計欄位與測試（Total_Illustrations/Legacy_Count/Daily_News_Count） | server | 2 | ⚪ 未開始 | RET-01, RET-07 | 伺服端保存並回傳留存統計，並有 API 測試 | 無 |  |
| **COPY-01** | M10 | 文案裁決與定稿：開場信件單一版本、按鈕文字、備選庫核准清單 | content | 1 | ⚪ 未開始 | - | 兩版信件擇一並與新手開場18.1同步，六名將台詞與備選庫標註採用/備用 | [v16.4 封鎖 blocked 2026-10-27] 需人工裁決：開場信件兩版並存，待使用者擇一（規格 正式版劇本文案） ；無（需人工裁決，規格兩版並存） |  |
| **COPY-02** | M10 | 開場信件與教學引導文案入 i18n 表 | content | 1 | 🟢 已接線 | COPY-01 | 信件、教學引導文案以 Key 形式載入並於 Win95 信件畫面顯示 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **COPY-03** | M10 | 六位初始名將登場台詞資料化（含 portraitKey/battleVoiceKey） | content | 1 | ⚪ 未開始 | COPY-01 | HeroBase.introLine 填入六句正式台詞並可在名將展示卡載入 | [v16.4 封鎖 blocked 2026-10-27] 企劃台詞資料待使用者裁決 ；無 |  |
| **COPY-04** | M10 | 紅顏趕路與商業化提示(0.99/29.99/倒數)文案資料化 | content | 1 | 🟢 已接線 | COPY-01 | 趕路、0.99、29.99、倒數四段文案由配置表讀取，與彈窗一致 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **COPY-05** | M10 | 趣味台詞彩蛋庫與使用規則（個人語音/彩蛋） | content | 1 | 🟢 已接線 | COPY-01 | 趣味台詞標註使用場景與觸發條件，僅用於開場信與初登場 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **COPY-06** | M10 | 文案審核與驗收（語氣一致性/手機可讀長度） | test | 1 | ⚪ 未開始 | COPY-02, COPY-03, COPY-04 | 所有正式文案通過文風原則審核，手機畫面無截斷 | 無 |  |
| **LT-01** | M10 | Tips 四池資料結構與權重設定檔 | data | 1 | 📄 僅資料 | - | JSON 含四池與持有/未持有兩套權重 | assets/resources/ui-spec/content/bloodline-mirror-loading-tips-v1.json（keys: id/version/categories/weights） |  |
| **LT-02** | M10 | Tips 選取邏輯（1~2 條、依持有狀態加權、不重複） | logic | 2 | 🟢 已接線 | LT-01 | 依權重抽 1~2 條，持有/未持有分布符合規格且有單測 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **LT-03** | M10 | Tips 接入 TipPanel 與 Loading 流程 | ui | 1 | 🟢 已接線 | LT-02 | Loading 畫面顯示隨機 tips | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **LT-04** | M10 | 四池文案量產與審稿（含角色誘惑） | content | 5 | 📄 僅資料 | LT-01 | 每池達約定條數並過審 | tips JSON 52 行，條數偏少 |  |
| **LT-05** | M0 | Tips 內容 schema 與驗證納入 validate-ui-specs | test | 1 | ⚪ 未開始 | LT-01 | schema 校驗權重鍵與四池一致 | contracts 中無 tips schema |  |

### 3.4 4. 國家、官職與天下大勢 (Nation, Officer & Politics)

> 涵蓋官職階層俸祿、名將討伐、他國治理 AI、俘虜招降與處決、名將巡查挑戰賽、天下大勢核心迴圈與四季推進。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **OFC-01** | M9 | 官職階位表與解鎖表資料化（5 階、EXP 門檻、Unlocked_Features） | data | 1 | ✅ 已驗收 | - | officer-tiers.json 含 5 階與門檻 100/260/520/920，schema 驗證通過 | [v13 核對 2026-10-20] 官職階位資料檔 officer-tiers.json（6a939033，#602）與遊戲端載入驗證後套用（b84910f2，#609）；OfficerTierTable 由 LobbyScene 呼叫，測試存在 |  |
| **OFC-02** | M9 | 官職經驗計算 calcOfficerExpGain（難度×領域×成敗） | logic | 1 | ✅ 已驗收 | OFC-01 | 單元測試覆蓋 5 難度、MILITARY 1.1、失敗 0.4，floor 結果符合 F-1 | [v14 核對 2026-10-21] 官職經驗計算 calcOfficerExpGain（9bf23ef8，PROG-2-0825，#594）；GameSession 呼叫，OfficerState.test.ts 與 OfficerHallYearsE2E.test.ts 存在 |  |
| **OFC-03** | M9 | OfficerState 服務：加經驗、晉升判定、解鎖歷史寫入 | logic | 2 | ✅ 已驗收 | OFC-01, OFC-02 | 跨門檻加經驗後 Current_Tier/Unlock_History 正確，連升多階測試通過 | [v13 核對 2026-10-20] 官職狀態存檔與 GameSession 接線（ae26e394，PROG-2-0826，#601）；OfficerState 由 GameSession、PlayerSaveService 呼叫，測試存在 |  |
| **OFC-04** | M9 | 權限快照 API（供大廳/治理/沙盤/他國AI唯讀） | logic | 1.5 | ✅ 已驗收 | OFC-03 | 各系統僅經快照取權限，無直接改 OfficerState 的呼叫（lint/測試） | [v13 核對 2026-10-20] 官職權限快照 API（01b1f68d，PROG-2-0828，#606）；OfficerPermissions 由 GameSession 呼叫，測試存在 |  |
| **OFC-05** | M9 | 雙牆任務解鎖：依官職決定可見難度與欄位數 | ui | 2.5 | 🟢 已接線 | OFC-04 | 大廳任務牆在 TIER_1/2/3 顯示的難度與欄位數與表一致 | [v13 核對 2026-10-20] 任務牆難度可見性依 F-2 修正（451aced2，PROG-2-0835，#632）；HallMissionBoard 與 HallBoardPanelController 接線。雙牆依官職解鎖的完整規則未核對 |  |
| **OFC-06** | M9 | 世界沙盤階段解鎖（S1/S2/S3）與標記數量 | ui | 2 | 🟢 已接線 | OFC-04 | 晉升 TIER_3/4/5 後沙盤對應階段開啟 | [v16 核對 2026-10-21] 世界沙盤標記數量上限接上 GameSession 與存檔（975274b6，PROG-2-0958，#729）；SandtableMarkers 由 GameSession 呼叫，SandtableMarkers.test.ts 存在；沙盤 S1/S2/S3 解鎖與標記 UI 未核對 |  |
| **OFC-07** | M9 | 聯盟/外交權限（聯盟文書、反霸權高階會盟門檻） | logic | 1.5 | 🟢 已接線 | OFC-04 | TIER_4 以下無法開啟聯盟文書、TIER_5 才能參與高階會盟 | [v13 核對 2026-10-20] 聯盟文書與反霸權會盟權限旗標（7dab134b，PROG-2-0837，#636）；OfficerPermissions 有旗標，但聯盟與外交功能本體未做 |  |
| **OFC-08** | M9 | 晉升提示 UI、官印動畫、一次性獎勵與字串/劇本 | ui | 2.5 | 🟢 已接線 | OFC-03 | 晉升時顯示 UI_OFFICER_PROMOTE/UNLOCK 並發獎一次，不重複領 | [v13 核對 2026-10-20] 大廳掛載官職區塊（17e12b21，#614）與顯示資料（009e1462，#612）；晉升提示（c12fcc90）；UI 實機未核對 |  |
| **OFC-09** | M9 | 天下大亂保留規則 applyEraShiftToOfficerState | logic | 0.5 | ✅ 已驗收 | OFC-03 | EraShift 後 Tier/Exp/Unlock_History 不變，測試通過 | [v16 核對 2026-10-21] 時代更迭保留官職：applyEraShiftToOfficerState 由 GameSession 呼叫（0961，PROG-2-0961，#754）；OfficerState.test.ts 存在 |  |
| **OFC-10** | M11 | 本機存檔 schema 與 Server 表（officer_tier/exp/unlock_history_json）同步 | server | 2 | 🟡 純邏輯 | OFC-03 | 存檔往返一致，server 表可 upsert 並與 client 衝突時有規則 | [v14 核對 2026-10-21] 官職狀態 Server 列定義與驗證（260be15f，PROG-2-0808，#643），server/schema/005_officer_state.sql；僅定義，未部署，無執行期呼叫端 |  |
| **OFC-11** | M5 | 將階/名聲/帶兵上限（General_Rank/Fame/Command_Capacity）與官職 UI 文案分離 | logic | 3 | 🟢 已接線 | OFC-04 | 出征軍勢上限讀 Command_Capacity，官職條與將階條 UI 不混用同一 EXP | [v4 核對 2026-10-13] 將階與名聲欄位落地並接上帶兵上限（PROG-2-0231） |  |
| **OFC-12** | M8 | 商業加速（月卡官職經驗加成、高階試用 buff、刷新券、外交加速包） | logic | 2 | ⚪ 未開始 | OFC-03 | 試用 buff 到期後不改正式階位；加成倍率可配置 | [v16.4 封鎖 blocked 2026-10-27] 商業化（月卡官職經驗加成、高階試用 buff 等）待使用者裁決 ；無 |  |
| **RAI-01** | M9 | AI 國家定義資料（8 勢力 Profile、初始領地/資源、台詞）AINationDef | data | 2 | ⚪ 未開始 | - | ai-nations.json 含 8 勢力且通過 schema 驗證，欄位與 I 節一致 | 無 |  |
| **RAI-02** | M9 | Nation Profile 模板與 Efficiency/Willingness 表資料化 | data | 1 | ⚪ 未開始 | RAI-01 | 8 種 Profile 的內政偏好、效率修正、出征意願可由資料載入 | 無 |  |
| **RAI-03** | M9 | AI 季度內政結算 AI_GovernanceTick（分配、產出、效率修正、資源上限） | logic | 3 | 🟢 已接線 | RAI-02, GOV-02 | 固定種子下 8 國 N 季結算結果穩定，產出公式與玩家共用 | 無 | 純邏輯→已接線；RivalGovernance 經 RivalNations 呼叫，RivalNations 有 src 呼叫端（#1329） |
| **RAI-04** | M9 | 邦交值系統（-100~100 分段、事件增減、季度衰退、初始宿敵/盟友） | logic | 3 | ⚪ 未開始 | RAI-01 | 邦交變動事件與衰退測試覆蓋全部表列事件，邊界不溢出 | 無 |  |
| **RAI-05** | M9 | 擴張決策與目標效用函數（F-2）+出征資源門檻 | logic | 3 | 🟡 純邏輯 | RAI-03, RAI-04 | 給定固定亂數時效用分數與 ATTACK/HOLD 決定符合手算 | 無 | 未開始→純邏輯；#1311 RivalExpansion 無 src 呼叫端，僅測試 |
| **RAI-06** | M9 | AI 外交決策（主動結盟、貿易、背叛、合縱連橫） | logic | 3 | 🟡 純邏輯 | RAI-04 | WARLORD 背叛與 DIPLOMAT 結盟機率測試通過，蜀不主動背叛 | 無 | 未開始→純邏輯；#1318 RivalAiDiplomacy 無 src 呼叫端，僅測試 |
| **RAI-07** | M9 | AI 貿易系統（4 種比率、結盟優惠 20%、每季 2 次冷卻、玩家手動確認） | logic | 2 | 🟢 已接線 | RAI-04 | 比率/條件/冷卻測試通過，玩家貿易需確認 UI | 無 | 未開始→已接線；RivalTrade 接 GameSession（既有呼叫端） |
| **RAI-08** | M9 | AI 武將經營（招募品質、結緣、退役轉教官、死亡產英靈/虎符、傭兵市場 30%） | logic | 4 | 🟡 純邏輯 | RAI-03 | 每 2 季新武將品質分布符合 fame 門檻；死亡事件產出英靈與虎符 | 無 | 未開始→純邏輯；#1319 RivalGeneralUpkeep 無 src 呼叫端，僅測試 |
| **RAI-09** | M9 | AI 俘虜處理（招降/4 季釋放） | logic | 1 | 🟡 純邏輯 | RAI-08, POW-03 | loyalty<30 招降機率與 4 季釋放規則測試通過 | 無 | 未開始→純邏輯；#1319 俘虜部分併入 RivalGeneralUpkeep，無 src 呼叫端 |
| **RAI-10** | M9 | 霸權反制與橡皮筋同盟（30%/40% 閾值、玩家強制入盟、邦交衰減加速） | logic | 3 | 🟡 純邏輯 | RAI-04 | 領土佔比超 30% 時他國及非霸主玩家 isPartOfCoalition=true，decayRate=4 | 無 | 未開始→純邏輯；#1302 RivalHegemony 無 src 呼叫端，僅測試 |
| **RAI-11** | M9 | 勢力興衰評估（power 五級）與 HEGEMONY/COLLAPSING 效果 | logic | 2 | 🟡 純邏輯 | RAI-03 | 每 4 季評估一次並套用敵對 +10/季、叛逃 +20%、入侵 +50% | 無 | 未開始→純邏輯；#1302 RivalHegemony 無 src 呼叫端，僅測試 |
| **RAI-12** | M9 | 天下大亂/時代更迭觸發與地圖重組（保留養成資產與官職） | logic | 3 | 🟡 純邏輯 | RAI-11, OFC-09 | domainRatio≥0.9 或玩家崩潰 3 季觸發，重組後 AI 重置而玩家資產不變 | 無 | 未開始→純邏輯；#1317 RivalRiseFall 無 src 呼叫端，僅測試 |
| **RAI-13** | M9 | 玩家與 AI 互動介面（貿易/結盟/宣戰/送禮/偵查/勸降/索俘） | ui | 5 | ⚪ 未開始 | RAI-04, RAI-07, OFC-04 | UI 各互動依條件啟用，結果更新邦交值 | 無 |  |
| **RAI-14** | M11 | AI 國家 Server 持久化（nation_state、relation、external_power 表） | server | 3 | ⚪ 未開始 | RAI-03, RAI-04 | 存檔讀寫往返不遺失，欄位符合 I 節 Server 表 | 無 |  |
| **RAI-15** | M9 | 軍師智力軍事任務偵知分段（BASIC/ADVANCED/MASTER、Intel band） | logic | 1 | ⚪ 未開始 | - | INT 邊界 50/70/90 分段測試通過 | 無 |  |
| **RAI-16** | M9 | External_Power 異域壓力源與 Expedition_Dossier（S3 全球遠征） | content | 2 | ⚪ 未開始 | OFC-06 | 3 類異域壓力源可顯示於沙盤檔案並依 dossier_state 切換 | 無 |  |
| **GOV-01** | M9 | 五類內政任務資料表與公式常數（Base、主屬性、Weight） | data | 1 | ⚪ 未開始 | - | gov-tasks.json 五類任務含公式參數並由 schema 驗證 | 無 |  |
| **GOV-02** | M9 | 內政產出計算 calcGovOutput（含人口紅利/政策修正/總計拆分） | logic | 2 | ⚪ 未開始 | GOV-01 | 五任務產出與 F 節一致，並輸出 基礎/人口紅利/政策/總計 四欄 | 僅有 assets/scripts/core/systems/FormulaSystem.ts calculateDiplomacyOutput（sqrt 公式，與規格線性公式不同），無任務/結算接線；視為 none |  |
| **GOV-03** | M9 | 人口→城市兵源上限與補兵速度模型（City_Troop_Cap/Recruit_Regen、8000 保底） | logic | 3 | ⚪ 未開始 | GOV-02 | 初期城市兵源上限≥8000；政策調整只改貢獻傾向，無逐場徵兵 | 無 |  |
| **GOV-04** | M9 | 武將指派服務（任務格、拖放、衝突檢查、Max_Task_Slots） | logic | 2 | ⚪ 未開始 | GOV-01 | 同一武將不可重複指派，超過格數被拒 | 無 |  |
| **GOV-05** | M9 | 每季結算與季度報告（Season_Report） | logic | 2.5 | ⚪ 未開始 | GOV-02, GOV-04 | 季結算後資源入庫，報告含 Food/Gold/Fame/Troops/Intel | 無 |  |
| **GOV-06** | M9 | 自動治理 AI（argmax Task_Affinity、手動/自動切換） | logic | 2 | ⚪ 未開始 | GOV-04 | 閒置武將自動分到親和度最高任務，開關切換保存 | 無 |  |
| **GOV-07** | M9 | 太守府 UI（人口核心儀表盤、產出卡、城市兵源卡） | ui | 5 | 🟢 已接線 | GOV-05, GOV-03 | 治理頁顯示人口/民心中心與四條流向，兵源卡顯示目前/上限/每回合補兵/距離回滿 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **GOV-08** | M9 | 領地升級（太守府等級→任務格數） | logic | 1.5 | 🟢 已接線 | GOV-04 | 升級後 Max_Task_Slots 依表增加，扣除資源 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **GOV-09** | M9 | 世襲主城保護與背水一戰被動 | logic | 2 | ⚪ 未開始 | - | 外圍全失時主城不可被攻陷且 Defense x2、兵力生產 +50% | 無 |  |
| **GOV-10** | M9 | 非培育子嗣內政職位（縣令/屯田官/工匠/說客） | logic | 2.5 | 🟡 純邏輯 | GOV-02 | 四職位每季效果與 Official_Output 公式測試通過；兒童低效規則 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **GOV-11** | M10 | 治理事件（蝗災等）與季報文案/字串 | content | 2 | ⚪ 未開始 | GOV-05 | 事件池可觸發且文案以 UI_GOV_* key 輸出 | 無 |  |
| **GOV-12** | M9 | AI 橡皮筋（領土>30% 反 X 同盟、30~50% 隱性壓力、>50% 全圍攻） | logic | 2 | ⚪ 未開始 | RAI-10 | 三個領土區間行為與測試符合規格，與他國 AI 規格閾值對齊 | 無 |  |
| **GOV-13** | M11 | 治理存檔與 Server 表（Territory_Level/Auto_Mode/Season_Output_JSON） | server | 1.5 | ⚪ 未開始 | GOV-05 | 往返一致 | 無 |  |
| **GOV-14** | M8 | 商業化：治理效率道具、太守府擴展、VIP 自動治理 | logic | 2 | ⚪ 未開始 | GOV-06 | 道具倍率可配置並計入產出 | [v16.4 封鎖 blocked 2026-10-27] 商業化（治理效率道具、太守府擴展、VIP 自動治理）待使用者裁決 ；無 |  |
| **POW-01** | M5 | 俘虜狀態標記與 POW_Record 模型（戰場擊敗→POW） | logic | 2 | ✅ 已驗收 | - | 戰後敗將依規則產生 POW_Record，傭兵來源被過濾 | [v3 核對 2026-10-13] PrisonerOfWar.ts createPowRecord；tests/PrisonerOfWar.test.ts「POW_Record：稀有度、招募消耗、監獄產出」；GameSession 接線 |  |
| **POW-02** | M5 | 傭兵豁免過濾（試用傭兵不可被俘） | logic | 0.5 | ✅ 已驗收 | POW-01 | MERC_TRIAL 武將戰敗不產生 POW，測試通過 | [v3 核對 2026-10-13] PrisonerOfWar.isPowExempt（MERC_TRIAL_FLAG）；tests/PrisonerOfWar.test.ts「試用傭兵絕對豁免」 |  |
| **POW-03** | M5 | 勸降成功率與判定（CHR/LUK/Loyalty/道具） | logic | 1.5 | ✅ 已驗收 | POW-01 | Persuade_Rate 公式測試覆蓋上下界，擲骰可注入 | [v3 核對 2026-10-13] PrisonerOfWar.persuadeRate（20%+CHA×0.5+LUK×0.2−忠誠×0.3，1~95%）；tests/PrisonerOfWar.test.ts |  |
| **POW-04** | M5 | 招募消耗（黃金+城市兵源，依稀有度）與不足提示 | logic | 1.5 | ✅ 已驗收 | POW-01, GOV-03 | R/SR/SSR 消耗與資源不足時顯示『城市兵源不足』 | [v3 核對 2026-10-13] PrisonerOfWar 招募檢查黃金與城市兵源、不足分開提示不扣；tests/PrisonerOfWar.test.ts |  |
| **POW-05** | M5 | 四選一處置 UI（含成功率/消耗/回報預覽與字串） | ui | 4 | 🟢 已接線 | POW-03, POW-04 | 戰後彈窗顯示四選項，點選後寫回結果並更新資源 | [v3 核對 2026-10-13] PrisonerPopupController.ts 四選一彈窗（prisoner-popup-screen），回大廳自動跳出（PROG-2-0082） |  |
| **POW-06** | M9 | 監獄系統：關押、每季情報/資源產出、格數與擴容 | logic | 3 | 🟢 已接線 | POW-01, GOV-05 | 關押後每季產出 Intel/Resource，超格被拒，擴容生效 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **POW-07** | M9 | 放走回報：名聲與 5% 未來來投 | logic | 1.5 | 🟢 已接線 | POW-01 | 放走增加 Fame，隨後季度以 5% 觸發來投事件 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **POW-08** | M7 | 虎符沒收與死亡回歸君主規則（投降才易主、放走帶走） | logic | 2 | ⚪ 未開始 | POW-01 | 勸降/招募成功才轉移虎符，死亡自動回原君主 | 無 |  |
| **POW-09** | M9 | 延伸分支：結義金蘭卡加成、傳家寶掉落、傳道/頓悟、高齡轉教官 | logic | 3 | ⚪ 未開始 | POW-05, POW-06 | 各分支觸發條件與結果測試通過 | 無 |  |
| **POW-10** | M11 | 俘虜 Server 監獄表與劇本文案 | server | 1.5 | ⚪ 未開始 | POW-06 | Prison 表往返一致、字串 key 完整 | 無 |  |
| **TRN-01** | M9 | 賽季週期管理（14 天、培育/競賽相位、自動輪轉） | server | 2.5 | 🟡 純邏輯 | - | 伺服器依時間自動切換 PREPARATION/COMPETITION/ENDED，單元測試覆蓋邊界 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **TRN-02** | M9 | 賽季/場地/BOSS 配置資料與公告（地形、天氣、ruleset、weakness_tags） | data | 2 | ⚪ 未開始 | TRN-01 | 賽季表可載入，公告包含地形天氣 BOSS 弱點 | 無 |  |
| **TRN-03** | M9 | 報名鏡像快照 TournamentTeamSnapshot（凍結、鎖定、每日重登錄、1 次緊急替換） | server | 3 | ⚪ 未開始 | TRN-01 | 首次參戰後鎖定，競賽期僅 1 次替換，伺服器只讀快照 | 無 |  |
| **TRN-04** | M9 | 非同步對戰配對（總戰力 ±15%） | server | 2 | ⚪ 未開始 | TRN-03 | 配對只落在範圍內，無對手時有 fallback | 無 |  |
| **TRN-05** | M7 | 伺服器端戰鬥模擬引擎（基於快照跑 5x8 棋盤） | server | 5 | ⚪ 未開始 | TRN-03 | 同快照同種子結果可重現，與客戶端戰場結果一致性測試通過 | 無 |  |
| **TRN-06** | M9 | 賽制：五戰三勝、決賽單場、隨機地形 ±5% 波動 | logic | 2.5 | ⚪ 未開始 | TRN-04, TRN-05 | 晉級/淘汰判定與 best_of 設定測試通過 | 無 |  |
| **TRN-07** | M9 | ELO 積分與六段位、賽季 soft reset rollover | logic | 2 | ⚪ 未開始 | TRN-06 | calculateEloChange、段位邊界與 rollover 規則測試通過 | 無 |  |
| **TRN-08** | M8 | 報名與參戰次數（免費 1 次/日、額外 30 精元、上限 5 次） | logic | 1.5 | ⚪ 未開始 | TRN-03 | 扣精元與次數計數、超限被拒 | 無 |  |
| **TRN-09** | M9 | 賽季歷史留檔 Season_History 與 Monthly_Scenario_History | server | 1.5 | ⚪ 未開始 | TRN-07 | 賽季結束寫入歷史，含最終快照 ID 與最高連勝 | 無 |  |
| **TRN-10** | M8 | 賽季獎勵發放（排名/段位） | server | 2 | ⚪ 未開始 | TRN-07 | 依段位結算發放，不重複領 | 無 |  |
| **TRN-11** | M9 | 挑戰賽 UI（賽季頁、隊伍登錄、對戰紀錄、段位、倒數） | ui | 5 | ⚪ 未開始 | TRN-02, TRN-03 | UI 顯示所有 UI_TOURNAMENT_* 字串與狀態 | 無 |  |
| **TRN-12** | M9 | 季節虎符標籤與 BOSS 弱點傷害 x1.5 | logic | 2 | ⚪ 未開始 | TRN-02 | 命中弱點標籤傷害乘 1.5，測試通過 | 無 |  |
| **TRN-13** | M9 | 季節 BOSS 戰（全服合力）與挑戰券 | server | 4 | ⚪ 未開始 | TRN-12 | BOSS 血量全服累計並依貢獻發獎 | 無 |  |
| **TRN-14** | M9 | 九州盃（極端場景賽，積分制） | logic | 3 | ⚪ 未開始 | TRN-06 | 四種九州盃規則生效並計分 | 無 |  |
| **TRN-15** | M9 | 月度場景賽與 Monthly_Score 公式、稱號 | logic | 3 | ⚪ 未開始 | TRN-05 | 每月場景限制生效，積分不計入主賽 | 無 |  |
| **TRN-16** | M8 | 商業連動：月度場景虎符、場景道具、挑戰券販售 | logic | 2 | ⚪ 未開始 | TRN-12 | 虎符限時 30 天，道具加成可配置 | [v16.4 封鎖 blocked 2026-10-27] 商業化（月度場景虎符、場景道具、挑戰券販售）待使用者裁決 ；無 |  |
| **MVP-01** | M0 | MVP 武將最小資料結構（UID/Template/Bloodline_ID/Vitality/Class/Status/Ancestors_JSON） | data | 3 | 🟢 已接線 | - | General schema 欄位齊全、有型別與 JSON 載入測試 | [v7 核對 2026-10-14] GeneralSchema 由 DataPageLoader 與 LobbyScene 呼叫（e1695b27 載入檢查）；GeneralSchema 測試 |  |
| **MVP-02** | M4 | 三代循環整合驗收（祖→父→子端到端測試） | test | 4 | ✅ 已驗收 | MVP-03, MVP-05, MVP-06, MVP-07 | 自動測試跑完 結緣→開獎→培育→退役→子代再結緣 並通過 | [master fb02ff9 重估] tests/Legacy.test.ts:185 祖→父→子三代循環 headless 測試（run-cli 通過） |  |
| **MVP-03** | M2 | 結緣＋EP_MVP 串進主流程 | logic | 3 | 🟢 已接線 | MVP-01 | breed() 產出子嗣且 EP=50+共鳴+異脈+契合，UI 可觸發 | [master fb02ff9 重估] BreedingService.ts + BondingSetupController.ts（PROG-2-0045 結緣正式介面） |  |
| **MVP-04** | M2 | 六色因子字典與 GeneObject 完整落地 | data | 3 | 🟢 已接線 | MVP-01 | 字典含六色且每色至少 3 筆，GeneObject 五欄位可序列化 | [master fb02ff9 重估] core/systems/FactorInheritance.ts 六色字典（PROG-2-0035） |  |
| **MVP-05** | M3 | 培育 36 回合（鏡像快照＋教官＋基礎 TP） | logic | 5 | ✅ 已驗收 | MVP-01, MVP-04 | 完成 36 回合並把數值寫回本體，單元測試通過 | [master fb02ff9 重估] tests/Nurture.test.ts 36 回合流程（run-cli 通過） |  |
| **MVP-06** | M3 | 5 歲開獎與武官/文官分流 | logic | 3 | 🟢 已接線 | MVP-03 | 年滿 5 歲子嗣揭曉五維與因子並可選職能 | [master fb02ff9 重估] Unveiling.ts 5 歲開獎（PROG-2-0028/0034） |  |
| **MVP-07** | M1 | 季度推進＋年齡增長＋65 歲退役判定 | logic | 3 | ✅ 已驗收 | - | 推進 4 季年齡 +1，達 65 歲發退役事件 | GameClock.ts、GeneralAging.ts；/tmp/integ/tests/GameSession.test.ts GameClock/Aging 案例 |  |
| **MVP-08** | M6 | 單池轉蛋＋保底 | logic | 3 | 🟢 已接線 | - | 保底次數內必出 SSR，結果寫入名冊 | assets/scripts/core/services/LocalGachaService.ts、assets/resources/data/gacha-config.json；/tmp/integ/tests/GameSession.test.ts 大廳抽卡案例 |  |
| **MVP-09** | M6 | 傭兵 6 日結義（試用→結義） | logic | 3 | ✅ 已驗收 | MVP-01 | Trial 6 日倒數後可結義成 Bonded | [v4 核對 2026-10-13] MercenaryBond.ts 試用 6 日→結義（PROG-2-0280）；tests/MercenaryBond.test.ts、CrossSystemIntegration.test.ts 通過；傭兵 UI 未接 |  |
| **MVP-10** | M6 | 基礎內政 5 大任務產出 | logic | 3 | ✅ 已驗收 | - | 每季選一任務產出資源 | [v5 核對 2026-10-14] 內政 5 大任務接進 GameSession 與存檔（53a46b1f）與大廳內政畫面（95d26ded，PROG-2-0319）；DomesticTasks 5 處呼叫端、測試通過 |  |
| **MVP-11** | M6 | 新手 3 段式引導與 P0 UI_ 字串 | content | 3 | ✅ 已驗收 | - | 首次進入依序出現 3 段引導 | [v4 核對 2026-10-13] OnboardingTutorial.ts 3 段引導接大廳與存檔（PROG-2-0229/0282）；OnboardingFlowController 接 LobbyScene；tests/OnboardingFlow.test.ts、OnboardingTutorial.test.ts 通過 |  |
| **MVP-12** | M11 | Server 最小六表（generals/gene_dictionary/nurture_sessions/mercenaries/player_resources/gacha_history） | server | 4 | 🟢 已接線 | MVP-01 | 六表建立且 CRUD 測試通過 | [v14 核對 2026-10-21] 存檔快照映射六表列與驗證（1a958424，PROG-2-0880，#652）；PlayerSaveService 呼叫 mapSnapshotToSixTables，PlayerSaveTableRows.test.ts 存在。伺服器未部署，依 PM 裁定定為已接線 |  |
| **MVP-13** | M9 | 全球征途擴展預留（第二/三階段掛點） | logic | 1 | ✅ 已驗收 | - | 模式與關卡列舉預留，不影響 MVP | [v14 核對 2026-10-21] 全球征途階段入口接線（612a7b2d，PROG-2-0851，#649）；CampaignStages 與 GameSession、LobbyScene 接線，CampaignStages.test.ts 存在；MVP 只啟用第一階段 |  |
| **TIME-01** | M1 | 季度推進器 GameClock（年/季/總季數/模式） | logic | 2 | ✅ 已驗收 | - | 推進 4 季跨年且只在冬→春標 yearEnded | /tmp/integ/assets/scripts/core/systems/GameClock.ts；/tmp/integ/tests/GameSession.test.ts GameClock 5 案例 |  |
| **TIME-02** | M1 | 三模式輪轉（治理→作戰→培育） | logic | 1 | ✅ 已驗收 | TIME-01 | 每次推進模式依序輪轉，restore 驗證不合法值 | /tmp/integ/GameClock.ts；/tmp/integ/tests/GameSession.test.ts 『模式依 治理→作戰→培育 輪轉』 |  |
| **TIME-03** | M1 | 武將老化（每季 +0.25 歲）與壽命/退役/死亡判定 | logic | 3 | ✅ 已驗收 | TIME-01 | 4 季+1 歲；跨 65 歲發一次退役候選；超齡擲骰死亡 | /tmp/integ/assets/scripts/core/systems/GeneralAging.ts；/tmp/integ/tests/GameSession.test.ts Aging 7 案例（含紅因子+3歲） |  |
| **TIME-04** | M1 | 時間顯示 UI『第 N 年 M 季』 | ui | 1 | 🟢 已接線 | TIME-01 | 大廳頂部顯示季度與模式中文 | /tmp/integ/assets/scripts/ui/scenes/LobbyScene.ts 引用 GAME_SESSION_EVENTS；/tmp/integ/tests/GameSession.test.ts 『大廳：季度標籤』 |  |
| **TIME-05** | M1 | Game_Time 本機存檔與 Server 時間欄位（Total_Seasons/Current_Mode） | server | 3 | 🟢 已接線 | TIME-01 | 推進後重建 session 讀檔狀態一致；Server 表有 Total_Seasons | /tmp/integ/PlayerSaveService.ts、GameSession.ts；/tmp/integ/tests/GameSession.test.ts 『推進 4 季後重建 session 讀檔』；Server 表尚無 |  |
| **TIME-06** | M3 | 培育 36 回合=外界 1 季的時間銜接 | logic | 2 | ✅ 已驗收 | TIME-02 | 進入培育模式結算 36 回合只推進 1 季 | [v7 核對 2026-10-14] PM 裁定維持既有設計（培育 36 回合＝外界 1 季），依裁定標已驗收 |  |
| **TIME-07** | M9 | 年終結算與年報畫面 | ui | 3 | ✅ 已驗收 | TIME-01 | 每 4 季觸發年報，UI_YEAR_REPORT 顯示 | [v12 核對 2026-10-20] 年報畫面 UI_YEAR_REPORT 接 YearEnded（2de6356d，PROG-2-0820，#563）；YearReport 由 LobbyScene 與 GameSession 呼叫，測試 4 個 |  |
| **TIME-08** | M9 | 季度事件與四季特色（春稅收/夏建設×2/秋糧草/冬結緣+10%） | logic | 4 | 🟢 已接線 | TIME-01 | 各季修正值可由設定檔載入並影響對應系統 | [v13 核對 2026-10-20] 夏季訓練體力消耗倍率（1b840595，TIME-08 子項，#640）；季度事件本體未核對 |  |
| **TIME-09** | M10 | 四季與換季字串（UI_SEASON_*） | content | 1 | ✅ 已驗收 | - | 四季文案可由 i18n 取得 | [v12 核對 2026-10-20] 四季與換季字串進語系表（64bc4d2e，#560）與大廳季節字串接上畫面（bc54bc08，#574）；SeasonTexts 由 LobbyScene 呼叫，測試存在 |  |
| **TIME-10** | M9 | 時代更迭 Era_Reset（60 月地圖重組） | logic | 5 | 🟢 已接線 | TIME-01 | 第 60 月保留養成、重置領土/外交/AI | [v11 核對 2026-10-20] Era_Reset 觸發與事件（d84d6c4f，PROG-2-0813）；EraReset 由 GameSession 呼叫，測試存在；60 月地圖重組未核對 |  |
| **TIME-11** | M8 | 付費延壽丹/時間加速/季末禮包 | logic | 3 | ⚪ 未開始 | TIME-03 | 道具可延壽 1~2 季或跳過治理季 | 無 |  |
| **REV-01** | M0 | Constants.ts DP 命名殘留（2.4） | logic | 0.5 | 🟢 已接線 | - | INITIAL_DP/DP_PER_TURN 全專案改為 GRAIN 命名 | [v10 核對 2026-10-20] Constants.ts DP 命名殘留清理併入基礎清單重構（a49f4027）；未逐項核對命名 |  |
| **REV-02** | M0 | terrain.json 自 Constants.ts 抽取（2.5，P0） | data | 2 | ✅ 已驗收 | - | 地形修正由 terrain.json 載入，Constants 不再 hardcode | [v10 核對 2026-10-20] terrain.json 自 Constants.ts 抽出（a49f4027，PROG-2-0495）；TerrainConfig 由 Constants.ts 呼叫，測試存在 |  |
| **REV-03** | M0 | 教官系統 VIT_Max→Vitality_Max 統一（2.6，P0） | content | 0.5 | 📄 僅資料 | - | 全部規格與程式僅用 Vitality_Max | grep 教官系統*.md 與 assets/scripts 的 VIT_Max 無結果，疑已改；審查文件待更新 |  |
| **REV-04** | M2 | 宿敵 EP 懲罰、組合奧義、混種戰法交叉引用（2.7~2.9） | content | 2 | ⚪ 未開始 | - | 三項規格決議並回寫相關規格書 | 規格待決，未見回寫 |  |
| **REV-05** | M0 | UIPreviewBuilder / UIValidationRunner 與 legacy hud.icon.dp key（2.1/2.10） | tool | 3 | 🟢 已接線 | - | 兩個 UI 自動化工具存在並可跑，legacy key 改名 | [v9 核對 2026-10-15] UIPreviewBuilder 被 StyleCheckPanel、GeneralQuickViewPanel、ActionCommandComposite 等呼叫；UIValidationRunner headless 測試（54ee2512，PROG-2-0482）尚無 src 呼叫端 |  |

### 3.5 5. 血統、家族與培育傳承 (Bloodline, Family & Nurture)

> 涵蓋配種結緣、世家門閥、培育流程、繼承因子爆發、教官支援卡、氣運資質、可結緣女性、壽命退役、家族羈絆、同名武將魂玉、名士批語與傭兵派遣。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **BRD-01** | M2 | 結緣資格檢查（20 歲、精力、同性、待產、生育上限、教官卡、死亡） | logic | 2 | ✅ 已驗收 | - | 資格不符回傳具體 reason 且不扣精力 | /tmp/integ/assets/scripts/core/systems/BreedingSystem.ts checkBreedingEligibility；/tmp/integ/tests/Breeding.test.ts 『資格：…都擋下』『結緣被擋下時不扣精力』 |  |
| **BRD-02** | M2 | 精力消耗（男-50/女-100）與待產凍結 | logic | 2 | ✅ 已驗收 | BRD-01 | 結緣後雙方扣精力，母方進入待產並倒數 | /tmp/integ/assets/scripts/core/systems/BreedingSystem.ts breed/advanceBreedingSeason；/tmp/integ/tests/Breeding.test.ts 『受孕成功…待產 4 季』『advanceBreedingSeason』 |  |
| **BRD-03** | M2 | 受孕率公式（CHA/LUK/精力因子、95% 上限、年齡/產次因子） | logic | 2 | 🟢 已接線 | BRD-01 | 公式輸出符合規格並封頂 0.95 | [v7 核對 2026-10-14] 受孕率公式 conceptionRate（BreedingSystem）由 BondingSetupController 結緣設定頁呼叫；0d17062b 受孕率接線；95% 上限與年齡／產次因子未逐項驗算 |  |
| **BRD-04** | M2 | 子嗣生成（Base_Stat=平均×EP/100、因子池、0 歲 Mystery） | logic | 3 | ✅ 已驗收 | BRD-03 | 生成 0 歲子嗣含 EP_Actual、祖譜與因子 | /tmp/integ/assets/scripts/core/systems/BreedingSystem.ts createChild/breed；/tmp/integ/tests/Breeding.test.ts 『受孕成功：0 歲子嗣、五維…』『BreedingService：關羽×貂蟬』 |  |
| **BRD-05** | M2 | 近親阻擋（BlockGenerations=3）與同 Bloodline_ID 劣化 ×0.7 | logic | 2 | ✅ 已驗收 | BRD-01 | 3 代內共同祖先被擋；同 Bloodline_ID 子嗣 Vitality_Max×0.7 | /tmp/integ/assets/scripts/core/systems/BreedingSystem.ts INBREEDING_BLOCK_GENERATIONS；/tmp/integ/tests/Breeding.test.ts 『3 代內有共同祖先…禁止』『同 Bloodline_ID 配對』（Mutant_Rate+50% 未實作） |  |
| **BRD-06** | M2 | 結緣介面（放入父母、14 人血統樹、EP 預估與評級文字） | ui | 4 | 🟢 已接線 | BRD-04 | UI 選父母即時顯示 EP 與評級，可確認結緣 | [v6 核對 2026-10-14] 結緣畫面掛載父母血統樹（11ef80b6，PROG-2-0279）；EP 預估與評級文字未逐項核對 |  |
| **BRD-07** | M3 | 5 歲開獎（揭曉五維、因子灰鎖、職能分流選擇） | logic | 4 | 🟢 已接線 | BRD-04 | 子嗣滿 5 歲觸發開獎流程並寫入 Is_Daqi | [master fb02ff9 重估] core/systems/Unveiling.ts + UnveilingService.ts（PROG-2-0028/0034） |  |
| **BRD-08** | M3 | 大器晚成 Is_Daqi 判定與 25 歲後 ×1.5 成長 | logic | 2 | 🟢 已接線 | BRD-07 | 依三條件判定並於 25 歲啟用成長倍率 | [master fb02ff9 重估] Unveiling.ts LATE_BLOOMER_* 與 FATE_DEFY_GROWTH_MODIFIER |  |
| **BRD-09** | M9 | 神祕期天象異變與名士批語嵌入（流星/紫氣/鹿銜草、多名士矛盾批語） | ui | 5 | 🟢 已接線 | BRD-06 | 結緣介面顯示 2~3 名士方向性批語，含 10~20% 誤差 | [v12 核對 2026-10-20] 名士批語與天象異變純邏輯（ea4e31b2）、結緣介面顯示名士批語（ad2ea933）、結緣成功通知顯示天象（c134e07f）；SageRemarks 由 LobbyScene、BondingSetupController 呼叫。流星、紫氣、鹿銜草之外的矛盾批語與完整天象表未核對 |  |
| **BRD-10** | M4 | 和平血統線 Breeding_Mode 與退役保種邊界 | logic | 2 | 🟢 已接線 | BRD-01 | 退役未卡片化武將可用 Peace_Lineage 結緣，卡片化後被拒 | [v4 核對 2026-10-13] Breeding_Mode 標記（PROG-2-0225）接 BondingSetupController / BreedingService；退役保種邊界未核對 |  |
| **BRD-11** | M2 | 一生生育上限（3~5 次）與傳宗秘藥 +1 | logic | 1 | ✅ 已驗收 | BRD-01 | 各精力區間上限 3/4/5，秘藥最多 +1 | /tmp/integ/assets/scripts/core/systems/BreedingSystem.ts lifetimeBreedingCap；/tmp/integ/tests/Breeding.test.ts 『一生生育上限』 |  |
| **BRD-12** | M11 | Breeding_Session/Child/Server 結緣表 Schema 與存檔 | server | 3 | ✅ 已驗收 | BRD-04 | 子嗣與結緣紀錄可序列化存取；Server 表 Child_UID/Breeding_Mode/EP_Actual/Birth_Season/Unveil_Season | [v13 核對 2026-10-20] 結緣成功時寫入本機子嗣紀錄（67c1a9fe，PROG-2-0872，#618）；BreedingBirthRecord 由 GameSession、BondingSetupController 呼叫，測試存在 |  |
| **BRD-13** | M8 | 結緣商業道具（補元散、安胎藥/送子符、求籤令、成長環境） | logic | 3 | ⚪ 未開始 | BRD-03 | 道具可修改精力/受孕率並消耗 | 無 |  |
| **BRD-14** | M10 | 結緣字串（UI_BREED_CONFIRM 等 6 組）與劇本文案 | content | 1 | 🟢 已接線 | - | 字串進入 i18n 並於 UI 顯示 | [v7 核對 2026-10-14] 結緣字串 6 組進 zh-TW i18n（ef6a9e4f，PROG-2-0525）；結緣畫面改接 t()（ff79149d，PROG-2-0526）；劇本文案未核對 |  |
| **BLT-01** | M2 | Ancestors_JSON 14 人矩陣資料結構（共享字典引用） | data | 3 | 🟢 已接線 | - | 矩陣含 Gen1(2)/Gen2(4)/Gen3(8) 位置並指向字典 ID | [master fb02ff9 重估] BloodlineGraph.ts（PROG-2-0026）+ 血統樹 UI |  |
| **BLT-02** | M2 | 虛擬祖先生成器（Tag Mapping＋世代權重＋V_PID 命名） | logic | 4 | ✅ 已驗收 | BLT-01 | 初代名將可依權重表補齊 14 人且 ID 符合 V_PID_{ID}_{Pos} | [v3 核對 2026-10-13] VirtualAncestorGenerator.ts generateVirtualAncestry 已接 BreedingService/BloodlineGraph（PROG-2-0067）；tests/VirtualAncestor.test.ts 通過 |  |
| **BLT-03** | M2 | EP 公式（共鳴/異脈/契合；天命波動另列） | logic | 3 | ✅ 已驗收 | BLT-01 | computeEpMvp 在 14 人矩陣上輸出各項加分明細 | /tmp/integ/assets/scripts/core/systems/BreedingSystem.ts computeEpMvp；/tmp/integ/tests/Breeding.test.ts 『EP_MVP：…』『位置重複（近親）…』 |  |
| **BLT-04** | M2 | 因子繼承（G1/G2/G3 進池率與星等分布） | logic | 3 | ✅ 已驗收 | BLT-01 | 同因子多來源取最高星、最多 5 個，MVP 預設只開藍粉綠 | /tmp/integ/assets/scripts/core/systems/FactorInheritance.ts；/tmp/integ/tests/Breeding.test.ts 因子星等/進池/MVP 三色/最高星 4 案例 |  |
| **BLT-05** | M2 | 近親判定與血脈劣化（Vitality_Max×0.7、負面特質+50%、純化） | logic | 2 | 🟢 已接線 | BLT-01 | 同 Bloodline_ID 劣化可驗；純化小機率提升星等 | [v6 核對 2026-10-14] 近親劣化提高培育負面特質率（1ea938ff）；近親判定與劣化既有測試 |  |
| **BLT-06** | M2 | 血統樹 14 人 UI 面板（簡化/專家切換，預設 2 代） | ui | 4 | 🟢 已接線 | BLT-01 | 預設顯示父母，點擊展開 14 人全圖 | [master fb02ff9 重估] BondingSetupController / 血統樹面板（PROG-2-0045） |  |
| **BLT-07** | M2 | 血統活性 Wild Gene（初代虛擬祖先變異率較高）與因子變異 Star Jump（Q38） | logic | 2 | 🟢 已接線 | BLT-02, BLT-04 | 變異只提升星級（如 3→5），初代變異率高於一般 | [v4 核對 2026-10-13] WildGene.ts rollWildGene 接 BreedingSystem 因子繼承（PROG-2-0267，暫定機率）；tests/WildGene.test.ts 通過 |  |
| **BLT-08** | M3 | 覺醒名號系統（常山真龍/鬼才後裔/麒麟/虎膽龍威） | logic | 3 | ✅ 已驗收 | BLT-03 | 滿足三條件任一授予永久封號並附加效果 | [v4 核對 2026-10-13] AwakeningTitle.ts 覺醒名號判定接畢業結算（PROG-2-0260/0263）；tests/AwakeningTitle.test.ts 通過；名號效果尚未套用 |  |
| **BLT-09** | M3 | 混種戰法 Hybrid Skill（培育 15~25 回合 5% 觸發） | logic | 3 | ✅ 已驗收 | BLT-04 | 父母各有不同領域綠因子時可觸發跨域戰法 | [v4 核對 2026-10-13] HybridSkill.ts 混種戰法觸發（15~25 回合 5%）接培育回合（PROG-2-0261/0264/0266）；tests/HybridSkill.test.ts、Nurture.test.ts 通過；混種戰法名稱與效果未接 |  |
| **BLT-10** | M4 | 因子媒介 Gene Catalyst（退役靈魂傳承，+25% 繼承，限 1 次） | logic | 3 | ✅ 已驗收 | BLT-04 | 退役選擇媒介後對 0~5 歲子嗣注入並消耗 | [v13 核對 2026-10-20] 因子媒介注入：GameSession 約第 1793 行呼叫 injectCatalystFactor（養成線回報；85460da8 純函式）；GeneCatalyst、GeneCatalystInjection、GeneCatalystE2E 測試存在 |  |
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
| **FUL-08** | M8 | 先知陷阱（預覽準確率≠100%）與解鎖加速道具/覺醒催化劑 | logic | 3 | ⚪ 未開始 | FUL-07 | 預覽有可配置誤差，道具可調整機率 | 無 |  |
| **FBR-01** | M2 | 六色因子定義與因子字典 schema（Gene_Dictionary/Tag Pool） | data | 3 | 🟢 已接線 | - | 字典六色齊全，欄位含 Gene_ID/Type/Max_Level/Effect | [master fb02ff9 重估] FactorInheritance.ts buildFactorDictionary（六色，PROG-2-0035） |  |
| **FBR-02** | M2 | GeneObject 結構與序列化 | data | 1 | 🟢 已接線 | FBR-01 | {Type,ID,Level,Is_Locked,Discovery_Level} 可存取 | [v7 核對 2026-10-14] GeneObject 序列化經武將資料載入與因子存讀接線（e1695b27，PROG-2-0409／0410）；GeneralDataWiring 測試 |  |
| **FBR-03** | M2 | 因子繼承邏輯（父母 100%/祖輩 50%/曾祖 25%、教官不參與） | logic | 3 | ✅ 已驗收 | FBR-01 | inheritFactors 依機率與星等分布產出因子 | /tmp/integ/assets/scripts/core/systems/FactorInheritance.ts inheritFactors；/tmp/integ/tests/Breeding.test.ts 『因子進池』『星等分布』『同因子取最高星』 |  |
| **FBR-04** | M5 | 因子覺醒機制（戰場動作／培育事件解鎖，鎖頭碎裂） | logic | 3 | 🟢 已接線 | FBR-02 | 覺醒事件把 Is_Locked 置 false 並廣播 | [master fb02ff9 重估] FactorAwakening.ts + BattleSpecialActions.ts（PROG-2-0044/0048） |  |
| **FBR-05** | M7 | 因子-戰法連動：綠色 TP×0.5、粉色地形效果（水戰合攻/大霧免疫/林地 +1） | logic | 4 | ✅ 已驗收 | FBR-03 | 持有對應綠因子學戰法 TP 減半；粉因子觸發地形效果 | [v8 核對 2026-10-15] 因子-戰法連動純規則（dd7cfb5f）、林地移動+1 與大霧免疫接線（043210b8，e6d4a928 改粉色）、水域合攻 +50%（c6df9961）、綠因子戰法折扣（6b3df0b3）；FactorTacticLinkage 4 處呼叫端與測試 |  |
| **FBR-06** | M2 | 爆發力 EP 計算（含 §K 加分補正） | logic | 2 | ✅ 已驗收 | FBR-03 | EP 預覽與 AI 推薦使用同一公式 | /tmp/integ/assets/scripts/core/systems/BreedingSystem.ts computeEpMvp；/tmp/integ/tests/Breeding.test.ts EP 案例（精力滿載 +10 未實作） |  |
| **FBR-07** | M2 | Discovery_Level 遮罩（UI 顯示 ??? 隱藏因子） | ui | 2 | 🟢 已接線 | FBR-02 | 未達發現等級顯示 UI_GENE_LOCKED | [v7 核對 2026-10-14] FactorMask 由 GeneralDetailFormatters 與 BondingSetupController 呼叫（??? 遮罩）；實機畫面未核對 |  |
| **FBR-08** | M10 | 六色 UI 標籤字串與配色（UI_GENE_TAG_*） | content | 1 | 🟢 已接線 | FBR-01 | 六色標籤文案與色碼進 i18n/token | [v11 核對 2026-10-20] 六色因子標籤字串與色碼 token（f0d67ca2，PROG-2-0725）；FactorTagTokens 由 FactorHexGraphic 使用，該元件由 LobbyScene 掛載；字串 i18n 未逐項核對 |  |
| **FBR-09** | M2 | 因子變異 Star Jump（Q38）與洗因子商業鉤 | logic | 2 | 🟡 純邏輯 | FBR-03 | 混血配種低機率星等跳升（如 3→5），不跨色轉化 | [v4 核對 2026-10-13] WildGene.ts 含 Star Jump 暫定邏輯（PROG-2-0102）；洗因子商業鉤未做 |  |
| **FBR-10** | M7 | 紫色因子戰場效果「天命加護」（Q39） | logic | 3 | 🟢 已接線 | FBR-04 | 紫因子提升火計/落石等隨機事件成功率與傷害 | [v8 核對 2026-10-15] 紫色因子天命加護：火計傷害與落石成功率（dadb0356，PROG-2-0610）；FateBlessing 2 處呼叫端與測試；其餘戰場效果未核對 |  |
| **FBR-11** | M2 | 白色因子（抗性/性格/被動）與紅色因子（壽命/精力回復）效果落地 | logic | 4 | 🟢 已接線 | FBR-03 | 白紅因子數值效果被壽命/精力系統讀取 | [v4 核對 2026-10-13] 紅因子精力回復已接（PROG-2-0268，休息回復 ×(1+0.1×紅級)，數值暫定）；白因子效果未做，規格數值未定 |  |
| **NUR-01** | M3 | 培育會話資料結構（Nurture_Session、Snapshot_Stats、Current_Round、Mentor deck）與存檔 | data | 3 | 🟢 已接線 | - | Session 可建立、序列化、讀檔還原 | [master fb02ff9 重估] NurtureSystem.ts + NurtureService.ts（PROG-2-0028） |  |
| **NUR-02** | M3 | 鏡像快照生成與畢業寫回本體 | logic | 3 | ✅ 已驗收 | NUR-01 | 進入培育複製快照；畢業寫回五維，不影響本體直到結算 | [v5 核對 2026-10-14] 鏡像快照寫回與畢業本體測試（f2c9e8a2，PROG-2-0276）；既有實作補上測試 |  |
| **NUR-03** | M3 | 36 回合主流程狀態機（選訓練→執行→結算→事件）＋ 三階段 Phase_Block | logic | 5 | ✅ 已驗收 | NUR-02 | 可從第 1 回合跑到第 36 回合並記錄階段推進 | [master fb02ff9 重估] tests/Nurture.test.ts + NurtureFlow.test.ts（run-cli 通過） |  |
| **NUR-04** | M3 | 訓練效果公式（Training_Base×教官×羈絆×事件）與 TP 累積 | logic | 3 | 🟢 已接線 | NUR-03 | 各階段 Training_Base 區間與 TP 5+溢出可測 | [master fb02ff9 重估] NurtureSystem.ts TRAINING_BASE_RANGE、BASE_TP_PER_TRAINING |  |
| **NUR-05** | M3 | 精力/失敗率模型（Vigor 100、休息 40~60、失敗率分段） | logic | 2 | 🟢 已接線 | NUR-03 | 三段失敗率與負面因子（挫敗/厭學）可驗 | [master fb02ff9 重估] NurtureSystem.ts VIGOR_MAX、TRAINING_VIGOR_COST、REST_VIGOR_RECOVER |  |
| **NUR-06** | M3 | 教官指派（6 槽、TP 加成、羈絆同格 +10%） | logic | 3 | 🟢 已接線 | NUR-03 | 入學鎖定 6 教官，同格多教官羈絆生效 | [master fb02ff9 重估] NurtureSystem.ts NURTURE_MENTOR_SLOTS、SYNERGY_BONUS |  |
| **NUR-07** | M3 | 畢業結算：評級 S/A/B/C、Graduation_Tags、Prowess 定型 | logic | 3 | 🟢 已接線 | NUR-04 | 五維總和對應評級並輸出標籤 | [master fb02ff9 重估] NurtureService.ts 畢業結算（PROG-2-0028） |  |
| **NUR-08** | M3 | 重修與 3 份成績單定型（Q31/Q69） | logic | 2 | 🟢 已接線 | NUR-07 | 最多保存 3 份，選一份定型其餘銷毀 | [v6 核對 2026-10-14] 畢業畫面接上保留／重修／定型（57234188）；ReportCardBook 接畢業流程；成績單 UI 未核對 |  |
| **NUR-09** | M3 | 培育事件系統（覺醒/受傷/好感）與入學令控流 | logic | 4 | 🟢 已接線 | NUR-03 | 事件權重依階段，入學令每季限額 | [v4 核對 2026-10-13] NurtureEvents.ts 受傷/好感擲骰接進 executeRound（PROG-2-0265/0292）；tests/NurtureEvents.test.ts；機率為暫定 3%/5% |  |
| **NUR-10** | M7 | 戰法學習 TP 門檻與戰法槽位（INT/30） | logic | 3 | ✅ 已驗收 | NUR-04 | 達 TP 門檻可學習，槽位數依 INT | [v8 核對 2026-10-15] 戰法槽位依智力計算（e3d145bd，NUR-10 部分）、TP 門檻＝消耗×2（1393a813）、培育學戰法接線（25c89f8a）、武將詳情 N/M（13ca86e4）；TacticLoadout 測試與 3 處呼叫端 |  |
| **NUR-11** | M3 | 世家血脈保底（姓氏匹配強制觸發三段事件、金戰法 PT -20%） | logic | 2 | ✅ 已驗收 | NUR-09 | 姓氏相同時 36 回合內保證觸發完畢 | [v6 核對 2026-10-14] 姓氏匹配血脈保底（475c229f）；BloodlineGuarantee 接線 |  |
| **NUR-12** | M3 | 子嗣資訊分層揭露 Revelation_Level 0~3 與 UI 顯示 | ui | 3 | 🟢 已接線 | NUR-01 | UI 依層級顯示剪影/傾向/區間/精確值 | [v4 核對 2026-10-13] StatRevelation.ts 子嗣分層揭露（PROG-2-0269）；揭露來源（窺探/教官等級）未定 |  |
| **NUR-13** | M3 | 培育 UI（入學確認、回合面板、教官指派、畢業結果）與字串 | ui | 5 | 🟢 已接線 | NUR-03 | UI 完成一次完整培育流程 | [master fb02ff9 重估] NurtureFlowController + NurtureFlowViewApplier（PROG-2-0034） |  |
| **NUR-14** | M8 | 自動培育（解鎖條件、0.7 懲罰、評級上限 A、無事件） | logic | 3 | 🟢 已接線 | NUR-07 | 條件達成並消耗自動培育券才可啟用 | [v8 核對 2026-10-15] 自動培育純邏輯與整季執行（0c05a8b2，NUR-14）、自動培育券與主線旗標存檔、畢業評級上限 A（b8643b7a）；AutoNurture 1 處呼叫端與測試；入口畫面未核對 |  |
| **NUR-15** | M11 | 培育紀錄 Server 表（Session/Final_Stats/Graduation_Tags/Reveal_Log） | server | 3 | 🟢 已接線 | NUR-01 | 畢業後寫入 Server 並可查詢 | [v14 核對 2026-10-21] 畢業時寫入培育紀錄存檔欄位（3dc76ee9，PROG-2-0721，#651；38a8bc03 補 revelation_level 預設，#675）；NurtureService 呼叫 buildNurtureRecordRow，NurtureRecordWiring.test.ts 與 ServerSchemaNur15.test.ts 存在。伺服器未部署，依 PM 2026-10-21 裁定定為已接線 |  |
| **LUK-01** | M2 | LUK 屬性資料（Stats.luk、LUK_Max、前期隱藏旗標） | data | 1 | 🟡 純邏輯 | - | 武將資料含 luk 與 Is_Visible，LUK_Max 由紫因子計算 | [master fb02ff9 重估] core/models 含 luk；DiscoveryProgress 無 LUK 上限，待核對 |  |
| **LUK-02** | M2 | 天命波動公式並接入 EP | logic | 2 | 🟢 已接線 | LUK-01 | EP 加入 LUK×Random(-0.5,1.5) 並可注入隨機源測試 | [v7 核對 2026-10-14] 天命波動接入子嗣 EP（e23c7741，PROG-2-0511）；小區間修正（79648675） |  |
| **LUK-03** | M2 | 紫色因子定義與 LUK 上限（50+等級×10） | logic | 2 | 🟢 已接線 | LUK-01 | 紫因子 ★5 時 LUK_Max=100 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **LUK-04** | M2 | Phase 3（Lv46+）紫色因子可見性解鎖 | logic | 1 | 🟢 已接線 | LUK-03 | Lv46 前顯示『???（Lv46 解鎖）』，達到後顯示 | [v14 核對 2026-10-21] Phase 3 紫色可見性接到六角圖（2bcd8638，PROG-2-0883，#663）；GameSession、FactorHexGraphic、LobbyScene 有改動，GameSessionVisibleFactorColors.test.ts 存在；六角圖 UI 實機未核對 |  |
| **LUK-05** | M3 | LUK 對事件觸發率、覺醒速度與繼承率的修正 | logic | 3 | 🟢 已接線 | LUK-01 | 三個公式在培育/覺醒/繼承處被呼叫並有單元測試 | [v16 核對 2026-10-21] 覺醒速度與繼承率 LUK 修正（PROG-2-0509、PROG-2-0510，已 done，改既有配種與培育路徑，各 4 條新測）；繼承率文字衝突的 PM 裁決見 0509 紀錄，UI 未核對 |  |
| **LUK-06** | M2 | LUK 特殊門檻（≥80 戰法強制複製、≥95 血統變異、=100 天命傳承） | logic | 3 | ✅ 已驗收 | LUK-05 | 各門檻只在達標時觸發且可測 | [v13 核對 2026-10-20] 運氣門檻三效果全數接線：≥80 戰法強制複製（38a79664，LuckTacticCopy）、≥95 血統變異（dc1b9bf9，LuckBloodlineMutation）、=100 天命傳承（fa4c021b，LuckFateInheritance），皆由 BreedingSystem 呼叫，三者測試存在；門檻旗標接入結緣（5a793176） |  |
| **LUK-07** | M8 | 天命重置卷與高 LUK 種母商業鉤 | logic | 3 | ⚪ 未開始 | LUK-02 | 道具可重 roll 天命波動並消耗 | 無 |  |
| **LUK-08** | M10 | LUK UI（UI_LUK_* 字串、天命波動顯示與劇本文案） | ui | 2 | 🟢 已接線 | LUK-04 | UI 顯示 LUK 與波動並套用字串 | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（已接線）；待 QA／實機驗收 |  |
| **FEM-01** | M2 | 女性品質分級與來源標記（Source_Type/Quality_Grade/Base_Conception_Mod） | data | 2 | ✅ 已驗收 | - | 每位女性武將帶來源與品質欄位並可存檔 | [v5 核對 2026-10-14] 女性來源與品質欄位（eead76f8，PROG-2-0244）與 GameSession 存檔接線（f2cc2e31，PROG-2-0297）；FemaleSource 2 處呼叫端，tests 通過 |  |
| **FEM-02** | M2 | 受孕率來源修正（SSR×1.2、民女×0.8、>40 歲×0.7、安胎藥×1.5） | logic | 2 | 🟢 已接線 | FEM-01 | 與結緣受孕率合併後輸出且 ≤0.95 | [v6 核對 2026-10-14] 母體來源受孕率修正（7271ba2f，37297cb3）接上結緣流程；PM 確認 BreedingService 已套用 femaleSourceConceptionMod |  |
| **FEM-03** | M6 | 轉蛋女將池（SSR/SR/R，5 轉保底） | logic | 3 | 🟢 已接線 | - | 女將池抽卡含保底並寫入名冊與來源 | assets/scripts/core/services/LocalGachaService.ts、assets/resources/data/gacha-config.json（未區分女將池）；/tmp/integ/tests/GameSession.test.ts 大廳抽卡案例 |  |
| **FEM-04** | M6 | 傭兵池女武將刷新（8 小時、宴客令/徵人令）與 6 日結義 | logic | 4 | 🟢 已接線 | FEM-01 | 每 8 小時刷新並可篩選結義 | [v7 核對 2026-10-14] FemalePoolRefresh 由 GameSession 與 DungeonRescue 呼叫（c681aab1）；8 小時刷新與宴客令／徵人令 UI 未核對 |  |
| **FEM-05** | M5 | 戰場俘虜女性處理（勸降/招募/釋放/無期徒刑） | logic | 4 | 🟢 已接線 | FEM-01 | 破城後女俘虜可走四種處置並帶來源 | [v5 核對 2026-10-14] 戰場俘虜女將帶 CAPTIVE 來源（f8081d43，31b02f3e，PROG-2-0243/0245）；PrisonerOfWar.ts 接進名冊；勸降/無期徒刑的女性專屬分支未核對 |  |
| **FEM-06** | M3 | 子嗣女兒 14 歲及笄分流（前線武將/後宮女官/教官儲備） | logic | 3 | ✅ 已驗收 | FEM-01 | 14 歲觸發選擇並更新職能 | [v11 核對 2026-10-20] 子嗣女兒清單、分流與年度掛點（90bb8d7d，PROG-2-0715）；DaughterComingOfAge 由 GameSession 與 FemaleSystemState 呼叫，測試存在 |  |
| **FEM-07** | M6 | 地下城救美任務（8h 刷新、民女60%/千金30%/貴族10%） | logic | 4 | 🟢 已接線 | FEM-01 | 依機率產出三種結果並 8h 刷新 | [v7 核對 2026-10-14] DungeonRescue 由 GameSession 呼叫（02c41c27）；救美結果畫面未核對 |  |
| **FEM-08** | M6 | 送禮好感度（戰俘/傭兵，0~100 提升轉化機率） | logic | 3 | 🟢 已接線 | FEM-04, FEM-05 | 送禮增加好感，達門檻提高轉化率 | [v7 核對 2026-10-14] GiftAffection 由 FemaleSystemState 呼叫（0a82c76d）；送禮 UI 未核對 |  |
| **FEM-09** | M2 | 血統模擬器預覽（雙方 14 人樹與預計爆發力） | ui | 3 | ✅ 已驗收 | FEM-01 | 放入男女雙方即時預覽 EP 與祖譜 | [v10 核對 2026-10-20] 結緣 EP 明細接線 BreedingPreviewPresenter（91ef88bd，PROG-2-0713），BondingSetupController 呼叫，測試存在 |  |
| **FEM-10** | M11 | 女性來源字串、劇本與 Server source_log 表 | server | 3 | 🟡 純邏輯 | FEM-01 | UI_SRC_* 字串與 source_log 紀錄可查 | [v13 核對 2026-10-20] 女性來源 source_log 表定義與列驗證（9d0cfee7，PROG-2-0542，#630）；server/schema 僅定義，無執行期呼叫端 |  |
| **MENT-01** | M3 | 教官卡資料結構與 JSON schema（Teaching_Style/Stat_Bonus/Tactic_Inspire_Events/Passive_Effects/Friendship_Bonus/Slot_Burst_Rate/Role_Boundary） | data | 2 | ✅ 已驗收 | - | 新增 mentor-cards.json 與 TS 型別，SUP_ZHAO_SSR_01 範例可載入並通過 schema 驗證 | [v6 核對 2026-10-14] 教官卡 schema 與 JSON parser（ced0eb00，MentorSupportSchema）；3 處呼叫端，4 個測試檔 |  |
| **MENT-02** | M3 | 五來源獲取管線（支援卡池/5 歲分流/退役轉化/戰場俘虜/傭兵結義）與 Source 標記 | logic | 3 | ✅ 已驗收 | MENT-01, LIFE-07 | 五種來源各能產出一張帶 Source 欄位的教官卡並寫入玩家持有清單，單元測試覆蓋 | [v6 核對 2026-10-14] 教官卡五來源標記與持有清單（6b091567，PROG-2-0277）；MentorSources 2 處呼叫端 |  |
| **MENT-03** | M3 | 36 回合教學互動核心：TP 累積（10×(1+Support_TP_Bonus)）與結業戰法點選清單 | logic | 3 | 🟢 已接線 | MENT-01 | 給定教官組與回合數，TP 累計值與公式一致；未觸發靈感的戰法不出現在結業清單 | [master fb02ff9 重估] NurtureSystem.ts BASE_TP_PER_TRAINING、MENTOR_BURST_MULTIPLIER |  |
| **MENT-04** | M3 | 戰法靈感事件觸發引擎（Base_Rate×友情×LUK、Trigger_Window、Min_Star 閘、家傳 Bloodline_Required） | logic | 3 | ✅ 已驗收 | MENT-03 | 固定種子下 SSR 趙雲六組事件觸發結果可重現；Min_Star 不足與非趙姓血統均不觸發；單元測試通過 | [v6 核對 2026-10-14] 戰法靈感事件觸發引擎（43896704，PROG-2-0280）；接入培育回合（d42ed8e7，PROG-2-0500）；MentorInspiration 2 處呼叫端 |  |
| **MENT-05** | M3 | 靈感保底：世家血脈連動（Q32 裁決），需先釐清 60 回合 vs 36 回合 | logic | 1 | ✅ 已驗收 | MENT-04 | 姓氏匹配支援卡家族時在規定回合前保證觸發並套用 PT 折扣，數值依釐清後規則 | [v6 核對 2026-10-14] 靈感保底依規格回合數推算期限（649269e9）；BloodlineGuarantee 接線 |  |
| **MENT-06** | M3 | 突破（Limit Break）★0~★5 星等表與解鎖效果、重複卡自動突破 | logic | 2 | ✅ 已驗收 | MENT-01 | 重複同名教官卡 Current_Star+1 至上限 5，F-4 表各星等友情/訓練倍率與事件組解鎖正確 | [v5 核對 2026-10-14] 教官星等突破與重複卡判定（30b92269，PROG-2-0274）；MentorBreakthrough 接線，tests/MentorBreakthrough.test.ts 通過 |  |
| **MENT-07** | M8 | 溢出轉化（★5 後重複卡→積分 SSR500/SR100/R20）與點數商店入口 | logic | 2 | ✅ 已驗收 | MENT-06 | 滿突破重複卡不再升星並入帳對應積分，Toast 文案正確 | [v13 核對 2026-10-20] 教官卡重複抽中的溢出入帳接線（61ab3e47，PROG-2-0867，#597）；MentorOverflow 由 GameSession 呼叫，測試存在 |  |
| **MENT-08** | M3 | 訓練格爆發（Slot_Burst_Rate、稀有度範圍、點數×1.5、友情+10%、靈感+5%） | logic | 2 | 🟢 已接線 | MENT-03 | 依稀有度與星等的爆發率區間骰出爆發，爆發回合訓練點數×1.5，測試以固定種子驗證 | [master fb02ff9 重估] NurtureSystem.ts MENTOR_BURST_MULTIPLIER、SYNERGY_BONUS_PER_EXTRA_MENTOR |  |
| **MENT-09** | M3 | 教官鏡像快照與培育鎖定（固定 6 槽、入學快照、Is_Locked_In_Training） | logic | 2 | ✅ 已驗收 | MENT-01 | 進入培育時凍結教官屬性，外部升星不影響進行中培育；同一教官不能同時在兩場培育 | [v5 核對 2026-10-14] 教官鏡像快照寫回與教官鎖定測試（f2c9e8a2，PROG-2-0276）；接線為既有 NurtureSystem 6 槽 |  |
| **MENT-10** | M3 | 培育主畫面教官席位 UI（6 槽、教官頭像亮彩、靈感提示、TP 購買） | ui | 3 | 🟢 已接線 | MENT-03, MENT-08 | 培育畫面顯示 N/6 教官席位並可看見靈感/爆發提示，UCUF 驗證通過 | [master fb02ff9 重估] NurtureFlowViewApplier 教官席位（PROG-2-0034） |  |
| **MENT-11** | M3 | 血統/教學邊界檢查（Role_Boundary=TeachingOnly，教官效果不得回寫因子/祖先矩陣/受孕率） | test | 1 | ✅ 已驗收 | MENT-01 | 自動化測試證明教官加成不修改 Genes、Ancestors_JSON 與受孕率 | [v13 核對 2026-10-20] 教學邊界執行期檢查接入培育（5e26144d，PROG-2-0870，#611）；MentorBoundary 由 NurtureService 呼叫，MentorBoundaryGuard 測試存在 |  |
| **MENT-12** | M9 | 師友羈絆（羈絆對表、Min_Friendship、回合 12 前一次判定、四類效果） | logic | 3 | 🟢 已接線 | MENT-04 | 羈絆對同場且友情達標時觸發一次羈絆事件並套用效果，五組預設羈絆資料可載入 | [v8 核對 2026-10-15] 師友羈絆純邏輯（115b072a）、旗標存檔與 TP 效果接進培育回合（d920ef05）；MentorSynergy 1 處呼叫端；Min_Friendship 與四類效果未逐項核對 |  |
| **MENT-13** | M10 | 教官卡詳情頁三頁籤（支援效果/培育事件/小插曲）與星等鎖頭 | ui | 3 | 🟢 已接線 | MENT-06 | 頁籤切換顯示正確資料，未達星等的事件顯示鎖頭 | [v9 核對 2026-10-15] MentorCardTabs 三頁籤 3 處呼叫端與測試，MentorCardDetailController 接詳情入口（#421）；星等鎖頭與小插曲未核對 |  |
| **MENT-14** | M9 | 好友借用教官（每日 1 張、快照複製、結義點數回饋、當下星等） | server | 3 | 🟢 已接線 | MENT-09 | 借用流程產生 Borrow 記錄並以快照進入培育，原主不受影響 | [v14 核對 2026-10-21] 好友借用教官接上 NPC 好友清單（28a2a361，PROG-2-0723，#656）；NpcFriendMentor 由 GameSession、ServiceLoader、PlayerSaveService 引用，NpcFriendMentor.test.ts 存在；借用面板 UI 未實機核對 |  |
| **MENT-15** | M9 | 名將傳道（Legendary_Mentoring：傳道令、一生一次、100% 傳奧義） | logic | 2 | ✅ 已驗收 | MENT-03, LIFE-06 | 死亡名將英靈卡可消耗傳道令對培育子嗣傳授專屬奧義一次，第二次被拒 | [v13 核對 2026-10-20] 名將傳道：NurtureFlowController 入口與 GameSession.performLegendaryMentoringFor 接線（LegendaryMentoring 呼叫端；養成線 2026-10-20 回報）；LegendaryMentoring、LegendaryMentoringSession、LegendaryMentoringSaveE2E 測試存在 |  |
| **MENT-16** | M7 | 戰場端 Mentor 戰法來源轉換（SkillSourceType.Mentor） | logic | 1 | 🟢 已接線 | - | 以 awakened 戰法槽建立 Mentor 來源技能請求，型別為 SkillSourceType.Mentor | [v8 核對 2026-10-15] 戰場端 MentorTacticAdapter 轉換 SkillSourceType.Mentor（e6f7fc03 改取 awakened 槽）；戰場 src 呼叫；測試未核對 |  |
| **FATE-01** | M3 | 職能資料模型（Primary_Class/Sub_Class/Fate_Recommend/Fate_Defied/Growth_Modifier）與存檔欄位 | data | 1 | ✅ 已驗收 | - | GeneralConfig 與存檔含職能欄位並可往返序列化 | [v5 核對 2026-10-14] 職能資料模型存讀往返測試（01578ada，tests/P0RoundTrip.test.ts）；Unveiling 既有呼叫端 |  |
| **FATE-02** | M3 | 5 歲宿命推薦演算法（藍色因子 STR/POW vs INT/POL） | logic | 1 | 🟢 已接線 | FATE-01 | 給定藍色因子輸入，輸出武官/文官建議，邊界等值有明確規則，測試通過 | [master fb02ff9 重估] Unveiling.ts FateRecommendation、classifyFactorLeaning |  |
| **FATE-03** | M3 | 接受/抗命選擇與成長率懲罰（×0.8） | logic | 1 | 🟢 已接線 | FATE-02 | 抗命後 Growth_Modifier=0.8，順應天命=1.0，並寫入存檔 | [master fb02ff9 重估] Unveiling.ts FATE_DEFY_GROWTH_MODIFIER |  |
| **FATE-04** | M3 | 大器晚成機制（25 歲後成長率×1.5，觸發條件待定） | logic | 2 | 🟢 已接線 | FATE-03, LIFE-02 | 規則釐清後，抗命武將在 25 歲依機率轉為 ×1.5 並提示名士批語 | [master fb02ff9 重估] Unveiling.ts LATE_BLOOMER_AGE/GROWTH |  |
| **FATE-05** | M3 | 5 歲宿命分流 UI（天命揭曉、接受/抗命按鈕、職能標籤 武🔴/文🔵/雙🟡） | ui | 3 | 🟢 已接線 | FATE-02, FATE-03 | 開獎畫面顯示宿命建議與兩個選項，標籤色正確，UCUF 驗證通過 | [master fb02ff9 重估] Unveiling 揭曉 UI（PROG-2-0034 unveiling screen） |  |
| **FATE-06** | M4 | 20 歲轉職（轉職令消耗、追加副職、副職能力×0.6） | logic | 2 | ✅ 已驗收 | FATE-01 | 滿 20 歲且持有轉職令才能追加副職，副職能力=主職×0.6，扣令一枚 | [v4 核對 2026-10-13] JobChange.ts 20 歲轉職接 GameSession 與道具消耗（PROG-2-0226）；tests/JobChange.test.ts、JobChangeWiring.test.ts 通過；副職不可同主職為 PM 暫定（PROG-2-0283） |  |
| **FATE-07** | M6 | 轉職 UI 與轉職令道具 | ui | 2 | 🟢 已接線 | FATE-06 | 20 歲成人禮畫面可選副職並顯示 UI_JOB_CHANGE 文案 | [v4 核對 2026-10-13] JobChangeController.ts 轉職選單畫面接大廳與場景（PROG-2-0227）；轉職令道具 UI 細節未逐項核對 |  |
| **FATE-08** | M4 | 退役分流（武→虎符/戰技教官；文→竹簡/智識教官；雙職能→全能教官） | logic | 3 | 🟢 已接線 | FATE-01, LIFE-06, MENT-01 | 退役時依職能產出對應產物與教官類型，雙職能產出兩者 | [v6 核對 2026-10-14] 退役流程接上教官分流（09379f1a）與主職 fallback、竹簡產物（a92f0005）；分流規則測試未逐一核對 |  |
| **FATE-09** | M10 | 因子色彩對應職能視覺化（卡片） | ui | 2 | ⚪ 未開始 | FATE-05 | 武將卡片上藍/粉因子色彩與職能標籤對應，色彩表有文件 | 無 |  |
| **FATE-10** | M7 | 特種兵虎符規則落地（糧草消耗 Q62、Set 羈絆冷卻-10% Q64，不設冷卻 Q61） | logic | 3 | 🟢 已接線 | - | 依 Q61~Q64 裁決實作召喚扣糧與 Set 羈絆加成；歸屬釐清後交由兵種虎符規格 | [v8 核對 2026-10-15] 特種兵虎符回歸測試（39374999，FATE-10）；規則引用見 BattlePowerRating；糧草 Q62 與 Set 冷卻 Q64 未逐項核對 |  |
| **FATE-11** | M10 | 宿命與轉職劇本文案（5 段台詞+6 字串 Key）進 i18n | content | 1 | 🟢 已接線 | - | 文案 Key 全部進入 i18n 表並可於畫面顯示 | [v12 核對 2026-10-20] 轉職與宿命文案進語系表（8b251e8b，PROG-2-0734，#586）；工作包已更正為 5 段台詞（依規格 §G，PM 2026-10-20） |  |
| **LIFE-01** | M1 | 壽命上限計算（65+紅因子×3+隨機 -5~+10） | logic | 1 | ✅ 已驗收 | - | resolveMaxLifespan 以 id 決定性產生 60~75，紅因子每級 +3，測試通過 | assets/scripts/core/systems/GeneralAging.ts（resolveMaxLifespan）；tests/GameSession.test.ts『Aging：壽命上限依 id…』『紅色因子每級 +3 歲』（已登錄 tests/run-cli.ts，本次未實跑） |  |
| **LIFE-02** | M1 | 每季增齡與年齡階段判定（幼兒/少年/青年/壯年/老年/超齡）及能力修正係數 | logic | 2 | 🟢 已接線 | LIFE-01 | 每季+0.25 歲；Phase 與能力修正（×0.6/1.0/1.1/0.8/0.5）依表計算，測試通過 | [v3 核對 2026-10-13] GeneralAging 增齡 ＋ DS3 人物頁年齡階段顯示（PROG-2-0074，LifeVitalityPresenter） |  |
| **LIFE-03** | M1 | 退役候選判定（65 歲事件，一次性） | logic | 1 | ✅ 已驗收 | LIFE-02 | 跨過 65 歲時只發一次 reached-retirement-age 事件 | GeneralAging.ts 事件；GameSession 廣播 GeneralReachedRetirementAge；tests/GameSession.test.ts『Aging：跨過 65 歲時發出退役候選事件，只發一次』與『Session：推進時廣播換季、退役與死亡事件』 |  |
| **LIFE-04** | M1 | 死亡判定（超齡死亡率 min(0.8, Over_Age×0.1)，死者不再增齡） | logic | 1 | ✅ 已驗收 | LIFE-02 | 超齡且擲骰小於死亡率則 status=dead；死者不再增齡，測試通過 | GeneralAging.deathChancePerSeason；tests/GameSession.test.ts『Aging：死亡率…』『超過壽命且擲骰小於死亡率時死亡』 |  |
| **LIFE-05** | M1 | 壽命 UI（年齡/壽命進度條、階段標籤、死亡通知） | ui | 2 | 🟢 已接線 | LIFE-02 | 武將詳情顯示 UI_AGE_DISPLAY/UI_LIFESPAN_BAR/階段名稱 | [v3 核對 2026-10-13] PROG-2-0074 壽命 UI（d4be8a0）：年齡/壽命進度與階段，CharacterDs3StatsChild / GeneralDetailBasicsChild |  |
| **LIFE-06** | M4 | 身後傳承結算（死亡快照→英靈卡→虎符卡→寫入宗族與兵符倉） | logic | 4 | ✅ 已驗收 | LIFE-04 | 名將死亡同步產出英靈卡與虎符卡，已先退役者死亡時補發，測試涵蓋 | [master fb02ff9 重估] tests/Legacy.test.ts、LegacyTally.test.ts（run-cli 通過） |  |
| **LIFE-07** | M4 | 退役轉教官流程（確認 UI、保種結緣後轉卡片、不直接產卡） | logic | 3 | ✅ 已驗收 | LIFE-03, MENT-01 | 65 歲玩家可選擇退役轉教官卡，產生 Source=Retire 教官，且不產英靈/虎符卡 | [master fb02ff9 重估] tests/Legacy.test.ts（run-cli 通過） |  |
| **LIFE-08** | M8 | 延壽丹道具（延長 Max_Lifespan 1~5 歲及限制） | logic | 2 | ⚪ 未開始 | LIFE-01 | 使用延壽丹提高 Max_Lifespan 並受次數/上限規則限制 | 無 |  |
| **LIFE-09** | M1 | 壽命消耗雙軌（不老哲學：僅主動指令消耗，培育 1 月/攻城 3 月/結緣 6 月） | logic | 3 | ✅ 已驗收 | LIFE-02 | 規則與每季增齡裁決後，主動指令依表扣月數，放置不消耗 | [v4 核對 2026-10-13] LifespanCost.ts 主動指令壽命消耗（培育 1 月/攻城 3 月/結緣 6 月）接 LifespanWiring（PROG-2-0221/0237）；tests/LifespanCost.test.ts、LifespanWiring.test.ts、SiegeLifespan.test.ts 通過 |  |
| **LIFE-10** | M7 | 精力與戰場軟懲罰（>50%/10~50%/<10% 禁用終極/主動戰法，撤退風險） | logic | 3 | ✅ 已驗收 | VIT-01 | 戰場依精力區間限制主動戰法並提高撤退風險，普攻移動不受限 | [v8 核對 2026-10-15] 戰場精力軟懲罰（051dd746）、戰法施放精力閘門（28423d05）、出陣精力帶入（877cfd29）、奧義扣精力（47de4762）；VitalityBattleGate 5 處呼叫端與測試；撤退風險 RetreatRisk 已接線 |  |
| **LIFE-11** | M9 | 演武聖境（死後精華快照，保值名將） | logic | 3 | ✅ 已驗收 | LIFE-06 | 死亡名將可保留精華並轉為可繼承資源，數值係數釐清後實作 | [v9 核對 2026-10-15] 演武聖境 LegacyArena 呼叫端（#429，0802）與 3 個測試檔；精華快照與付費復活純邏輯 |  |
| **LIFE-12** | M9 | 不老傳說活動（突破壽命上限 161 季） | logic | 2 | ⚪ 未開始 | LIFE-01 | 活動期間壽命上限可突破並可回收 | 無 |  |
| **LIFE-13** | M10 | 壽命與階段劇本文案/字串（少年/壯年/老年/退役/死亡/身後結算） | content | 1 | ✅ 已驗收 | - | 文案 Key 進 i18n 並在事件觸發時顯示 | [v9 核對 2026-10-15] 壽命劇本 LifeScriptCopy 呼叫端與四語系字串（#423，0800）；LifeScriptCopy 2 處呼叫端與 2 個測試 |  |
| **GEN-01** | M0 | 武將基礎資料結構（UID/Template_ID/Title/性別/年齡/六色屬性/Role/Status）統一入口 generals.json + GeneralConfig | data | 3 | ✅ 已驗收 | - | 235 位武將資料載入通過驗證器，欄位含 templateId/title/stats/role/status | assets/resources/data/generals.json（235 筆，皆含 templateId、stats、status）；assets/scripts/core/models/GeneralUnit.ts（GeneralConfig）；tools_node/validate-generals-data.js |  |
| **GEN-02** | M2 | 遺傳因子槽 GeneObject（Type/ID/Level/Is_Locked/Discovery_Level）資料與讀寫 | data | 2 | 🟢 已接線 | GEN-01 | 每位武將 genes 欄位含 3~5 個結構化因子並可序列化 | [v7 核對 2026-10-14] GeneObject 由 PlayerRosterService 存讀呼叫（genesForSave／genesFromSave）；GeneralUnit 尚未改用 GeneObject |  |
| **GEN-03** | M2 | 血統家族樹（Father_ID/Mother_ID/Bloodline_ID/14 人 Ancestors）與 BloodlineGraph | logic | 4 | ✅ 已驗收 | GEN-01 | 任一武將可取得完整 14 人祖譜；子嗣註冊後祖譜上移一代 | assets/scripts/core/services/BloodlineGraph.ts（master 已有）；/tmp/integ/tests/Breeding.test.ts『BloodlineGraph：真實 registry 的關羽有完整 14 人祖譜』『registerChild 後子嗣祖譜…』（pr_only 測試）；person-registry.json |  |
| **GEN-04** | M2 | 爆發力 EP 公式（共鳴+15/異脈+20/契合+25；精力+10/LUK 浮動待補） | logic | 3 | 🟢 已接線 | GEN-03, KIN-04 | computeEpMvp 與完整版 EP 在固定輸入下輸出正確加成，測試通過 | [master fb02ff9 重估] BreedingSystem.ts EP_* 常數與 calc（PROG-2-0026） |  |
| **GEN-05** | M1 | 精力系統（消耗、季度回補、待命加速）與資料欄位 vitality/maxVitality | logic | 3 | 🟢 已接線 | GEN-01 | 戰鬥/結緣/培育扣精力，季度回補依出征/待命比例，不超過上限 | [master fb02ff9 重估] BattleRoster.ts、BreedingSystem.ts 精力消耗與回復 |  |
| **GEN-06** | M3 | 職能雙軌分流（戰鬥武將 vs 專業教官）資料與規則裁決 | logic | 2 | ✅ 已驗收 | GEN-01 | Role=Combat/Mentor 規則統一（含轉職/退役切換裁決）並寫入模型與驗證 | [v6 核對 2026-10-14] 職能雙軌分流歸類與不可變更規則（f62c4ed4）；讀檔正規化（fe59432c）；入名冊套用（e50ee85b）；GeneralRole 與 RosterRoleLoad 有呼叫端與測試 |  |
| **GEN-07** | M1 | 生命週期狀態機（出生→開獎→成年→巔峰→衰老→退役） | logic | 3 | ✅ 已驗收 | GEN-01, LIFE-02 | 狀態轉換由年齡與事件驅動並可存檔還原 | [v5 核對 2026-10-14] GeneralStage.ts 生命週期狀態機接上 GeneralLifecyclePresenter（PR #149，武將詳情與培育顯示生命週期）；tests/GeneralStage.test.ts 通過 |  |
| **GEN-08** | M2 | 因子覺醒（Is_Locked 解鎖條件、碎裂特效） | logic | 3 | 🟢 已接線 | GEN-02 | 觸發條件滿足時 Is_Locked 由 true 改 false 並發出覺醒事件 | [master fb02ff9 重估] core/systems/FactorAwakening.ts（PROG-2-0044） |  |
| **GEN-09** | M10 | 武將詳情頁 GeneralDetailComposite 與 Skills 分頁資料流（tacticSlots/ultimateSlots → master） | ui | 4 | 🟢 已接線 | GEN-01 | 詳情頁各分頁掛載成功，Skills 分頁直接消費 GeneralConfig 槽位與 master library | assets/scripts/ui/components/general-detail/*（Basics/Stats/Aptitude/Bloodline/Skills/Extended/Overview）；tests/ucuf/compositePanel.test.ts；GeneralDetailSkillsChild.ts |  |
| **GEN-10** | M2 | 稱號系統（Template_ID+Title 辨識同名不同版本） | data | 1 | ✅ 已驗收 | GEN-01 | 所有武將具 title 並於 UI 顯示『名稱・稱號』 | [v6 核對 2026-10-14] 稱號顯示格式與同名辨識（4fba11f7）；名稱接上稱號 UI（493ba48a）；GeneralTitle 2 處呼叫端 |  |
| **GEN-11** | M3 | 六色屬性成長曲線（年齡-屬性衰減、巔峰期加成） | logic | 2 | ✅ 已驗收 | LIFE-02 | 依年齡階段修正屬性，與 LIFE-02 係數一致 | [v6 核對 2026-10-14] 六色屬性依年齡階段修正（0dac2cd8）；武將年齡接入戰力與詳情（4ef0915f）；GeneralGrowth 2 處呼叫端 |  |
| **GEN-12** | M2 | 近親警告與 Inbreeding 判定（同源血脈警示） | logic | 1 | 🟢 已接線 | GEN-03 | 3 代內共同祖先禁止結緣，同 Bloodline_ID 子嗣 Vitality_Max×0.7，UI 警告可顯示 | [v5 核對 2026-10-14] 同源血脈警告接上結緣血緣列（01578ada，PROG-2-0317）；判定與 UI 文字已接，測試見 BondingSetup.test.ts |  |
| **GEN-13** | M9 | 演武筆記（升級/千人斬產出戰法筆記交教官） | logic | 2 | 🟢 已接線 | GEN-06 | 達成條件產出筆記物件並可交給教官轉化 | [v11 核對 2026-10-20] 戰後里程碑發戰法筆記（50fcd7c0、931ddc6e，PROG-2-0816/0817）；MilestoneRewards 與 PlayerInventory 接 GameSession，BattleNoteGrant 測試存在。升級來源未核對 |  |
| **GEN-14** | M10 | 武將劇本台詞（5 歲開獎天象、退役語錄、英靈告別、大器晚成批語、職能分流選擇） | content | 2 | ⚪ 未開始 | - | 台詞 Key 進 i18n 並於對應事件顯示 | 無 |  |
| **KIN-01** | M2 | 關係類型與 Schema 定義（史實 5 種+動態 4 種） | data | 1 | ✅ 已驗收 | - | HistoricalRelation/DynamicRelation 型別與 JSON schema 完成 | [v7 核對 2026-10-14] KinRelation 關係 Schema（58403015）與測試，5 處呼叫端 |  |
| **KIN-02** | M2 | 史實相性資料表 HISTORICAL_PAIR/ENEMY_PAIR（以 Template_ID）收錄首批名單 | data | 3 | ✅ 已驗收 | KIN-01 | 至少收錄 MVP 範圍的夫妻/義兄弟/宿敵配對並通過 Template_ID 驗證 | [v7 核對 2026-10-14] HistoricalPairs 史實相性配對表（0d17062b）與測試，2 處呼叫端 |  |
| **KIN-03** | M2 | 相性標籤引擎（14 人祖先標籤共鳴/純血判定） | logic | 3 | 🟢 已接線 | KIN-01 | countSharedTags≥3 判共鳴，≥5 觸發家風，14 人全同族純血+30，測試通過 | [v7 核對 2026-10-14] 相性標籤引擎（58403015）接爆發力（4596e08f，KIN-03 接線）；純血判定與 14 人祖先共鳴細節未逐項核對 |  |
| **KIN-04** | M2 | 爆發力關係加成接線（契合+25、宿敵受孕×0.7） | logic | 2 | 🟢 已接線 | KIN-02, KIN-03 | BreedingService 以資料表解析史實配對與宿敵並影響 EP/受孕率 | [v7 核對 2026-10-14] 契合 +25、宿敵受孕 ×0.7 接線（0d17062b、4596e08f）；未逐項驗算 |  |
| **KIN-05** | M2 | 宿敵配種『狼性』白色因子引入 | logic | 1 | ⚪ 未開始 | KIN-04 | 宿敵配對有機率給予子嗣狼性白色因子 | 無 |  |
| **KIN-06** | M9 | 動態關係建立（戰場共鬥→戰友、結義傭兵→義兄弟、結緣→夫妻、親子） | logic | 3 | 🟢 已接線 | KIN-01 | 對應事件發生時建立 DynamicRelation 並寫入存檔 | [v7 核對 2026-10-14] 動態關係建立與存檔快照（7bf4c941）、存讀與互動觸發（ccb7ca10）；KinDynamicRelations 2 處呼叫端；戰場共鬥、結義、親子等建立點未全數核對 |  |
| **KIN-07** | M9 | 關係圖鑑 UI（節點+連線） | ui | 4 | ⚪ 未開始 | KIN-02 | 武將詳情可開啟關係網路圖並顯示類型標籤 | 無 |  |
| **KIN-08** | M9 | 關係事件觸發（戰場/治理專屬事件） | content | 3 | 🟢 已接線 | KIN-06 | 指定關係組合在對應場景觸發一次事件並顯示劇本 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **KIN-09** | M7 | 合攻聯動（義兄弟/夫妻相鄰格合攻+30%） | logic | 3 | 🟢 已接線 | KIN-06 | 相鄰格有義兄弟時合攻觸發率+30% 並有戰場演出 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **KIN-10** | M9 | 關係衰退與維護（Intimacy 衰減） | logic | 2 | 🟢 已接線 | KIN-06 | 每季依 Decay_Rate 減親密度，互動可回補 | [v7 核對 2026-10-14] 親密度衰退與互動回補（22026f7b）、換季衰退（52d7efa1）、歸零保留（aa272829）；KinSeasonWiring 測試 |  |
| **KIN-11** | M9 | 家風傳承 Buff 與關係圖鑑完成稱號（內容待設計） | content | 2 | ⚪ 未開始 | KIN-03 | 同族三代 5+ 標籤觸發家風被動，內容定義後實作 | 無 |  |
| **KIN-12** | M10 | 相性劇本與字串（契合/共鳴/宿敵/家風） | content | 1 | 🟡 純邏輯 | - | 字串 Key 進 i18n | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **SAME-01** | M2 | Template_ID 多版本資料模型（同 Bloodline_ID 不同 Template_ID、Initial_Genes、Is_Limited） | data | 2 | 🟢 已接線 | - | 版本表 schema 與資料載入完成，趙雲至少 2 版本可載入 | [v9 核對 2026-10-15] GeneralVersion 呼叫端與測試（checkFormationBloodlines，PROG-2-0422）；同名武將版本圖鑑 GeneralVersionGallery（89f56c2d，PROG-2-0707）尚無呼叫端。協調者回報為 P0，WBS 規格為 P1，請 PM 確認 |  |
| **SAME-02** | M5 | 名號限定制：編隊同 Bloodline_ID 拒絕 | logic | 2 | 🟢 已接線 | SAME-01 | 編入同 Bloodline_ID 武將被拒並顯示 UI_SAME_NAME_REJECT，測試通過 | [v4 核對 2026-10-13] 戰場整隊同血統檢查（commit「戰場整隊同血統檢查，出征帳本拒絕同血統整隊」）；SortieDeploy.validateSortieLoadout SAME_BLOODLINE；整隊層級專屬測試未逐一核對 |  |
| **SAME-03** | M8 | 重複抽卡分流 UI（復生重練/血脈灌注選擇彈窗） | ui | 3 | ⚪ 未開始 | SAME-04, SAME-05 | 重複卡彈窗顯示兩選項並呼叫對應邏輯 | 無；LobbyScene 只顯示『N 位已持有』（/tmp/integ/assets/scripts/ui/scenes/LobbyScene.ts） |  |
| **SAME-04** | M9 | 復生重練邏輯（新同名本體、嵌回英靈卡、Rebirth_Count+1） | logic | 3 | ⚪ 未開始 | SAME-01, LIFE-06 | 選擇復生後建立新本體並嵌入既有英靈卡 | 無 |  |
| **SAME-05** | M9 | 血脈灌注邏輯（Bloodline_Level+1、Spirit_Power、Linked_Tally_Level） | logic | 3 | 🟢 已接線 | SAME-01, LIFE-06 | 灌注後既有英靈卡/虎符等級上升，數值依釐清後規則 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **SAME-06** | M6 | 重複卡偵測與 addGenerals duplicates 回報 | logic | 1 | ✅ 已驗收 | - | 重複抽到已持有武將不重複加入並回報 duplicates | GameSession.addGenerals（/tmp/integ/assets/scripts/core/managers/GameSession.ts）；tests/GameSession.test.ts『大廳：重複抽到已持有武將不重複加入，只回報 duplicates』『全部重複時不存檔、不廣播』 |  |
| **SAME-07** | M10 | 版本圖鑑與版本差異展示 UI | ui | 3 | 🟢 已接線 | SAME-01 | 顯示 UI_COLLECTION 收集進度與同名版本因子/戰法/立繪對比 | [v16.6 核對 2026-10-28] master #1199 後已接上（已接線）；待 QA／實機驗收 |  |
| **SAME-08** | M9 | 戰魂寄宿（死後 TP×0.2 轉同 Bloodline_ID 他版本） | logic | 2 | 🟡 純邏輯 | SAME-01 | 死亡武將 Soul_Fragment 可注入同血源版本，TP 增加量=0.2×Total_TP | [v11 核對 2026-10-20] 戰魂寄宿純邏輯（076fb54e，PROG-2-0857）與測試；SoulTransfer 無 src 呼叫端 |  |
| **SAME-09** | M9 | 血脈歸宗（歸宗令、轉移 1 個特殊因子） | logic | 2 | ✅ 已驗收 | SAME-01 | 消耗歸宗令使 V1 獲得 V2 的 1 因子，V2 保留並標記已歸宗 | [v12 核對 2026-10-20] 血脈歸宗成功扣 1 張歸宗令（0570d7e7，PROG-2-0862，#562）；BloodlineMerge 由 GameSession 呼叫，測試 2 個 |  |
| **SAME-10** | M10 | 同名劇本與字串（初見/寄宿/歸宗/衝突） | content | 1 | 🟡 純邏輯 | - | 字串 Key 進 i18n | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **ORAC-01** | M9 | 名士資料表（Sage_ID/Bias_Type/Accuracy_Base/Unlock_Condition）六位名士 | data | 1 | ⚪ 未開始 | - | 六位名士資料載入並通過 schema 驗證 | 無 |  |
| **ORAC-02** | M9 | 預言生成引擎（accuracy 判定、WeightedSample 偏見、Distort、Comment 模板） | logic | 3 | 🟢 已接線 | ORAC-01 | 以固定種子覆寫 Random() 驗證三個規格示例（0.10/0.90/0.50）結果 | [v16.7 全面核對 2026-10-28] SageDivination（WeightedSample 等）由 GameSession、SageRemarks、BondingSetupController 呼叫；預言生成引擎已接線 |  |
| **ORAC-03** | M9 | 預言輸入：父母因子→子嗣預期因子分布（與結緣預覽共用） | logic | 2 | 🟢 已接線 | ORAC-01 | 可由父母因子與 14 人祖譜得出子嗣預期色系/屬性分布供 WeightedSample 使用 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **ORAC-04** | M8 | 求籤令消耗與占卜次數累計 | logic | 1 | 🟢 已接線 | ORAC-02 | 占卜扣 1 求籤令，不足時拒絕，累計次數存檔 | [v16.4 核對 2026-10-27] GameSession.divineFactor 扣求籤令並累計占卜次數（_spendOracleToken），由 SageOracleController 呼叫；有 SageDivination.test.ts / SageOracle.test.ts ；無 |  |
| **ORAC-05** | M9 | 占卜介面（放入父母→選擇名士→結果、嵌入結緣主介面） | ui | 4 | 🟢 已接線 | ORAC-02, ORAC-03 | 結緣畫面中央血統模擬器+左右批語區+底部求籤令入口可操作 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **ORAC-06** | M9 | 名士解鎖（占卜次數/劇情進度） | logic | 1 | 🟢 已接線 | ORAC-01, ORAC-04 | 累計占卜達標解鎖龐統等名士，未解鎖顯示 UI_ORACLE_LOCKED | [v16.8 更正 2026-10-28] 名士解鎖由 GameSession.isSageUnlocked 與 SageDivination.ts 提供，SageOracleController、LobbyScene 呼叫；鎖定提示改語系鍵（#1239/#1249），協調者確認 |  |
| **ORAC-07** | M9 | 矛盾預言提示（兩名士意見相左，待 5 歲驗證） | ui | 1 | 🟢 已接線 | ORAC-05 | 同一對父母多次占卜結果衝突時顯示 UI_ORACLE_CONFLICT | 無 | 未開始→已接線；v16.9 協調線回報：SageOracleController 已有意見相左提示；LobbyScene 掛載 |
| **ORAC-08** | M10 | 祖輩顯靈台詞（命中祖先標籤觸發補充台詞） | content | 2 | ⚪ 未開始 | ORAC-02 | 命中特定祖先標籤時附加顯靈台詞，且不改變準確率 | 無 |  |
| **ORAC-09** | M10 | 名士台詞/批語模板（各名士風格、含左慈含糊） | content | 2 | ⚪ 未開始 | ORAC-01 | 各名士至少 5 組模板，覆蓋色系傾向與關鍵詞 | 無 |  |
| **ORAC-10** | M9 | 準確率單元測試（固定種子） | test | 1 | 🟡 純邏輯 | ORAC-02 | 三個規格示例以 unit test 通過 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（純邏輯）；待 QA／實機驗收 |  |
| **DUP-01** | M8 | 重複卡彈窗 UI 契約落地（抽卡重複卡彈窗：兩個分流按鈕與預覽） | ui | 3 | ⚪ 未開始 | SAME-03 | 重複抽卡彈窗顯示『復生重練/血脈灌注』並能回傳選擇 | 無；契約檔 artifacts/ui-qa/UI-2-0054/duplicate-hero-bloodline-flow-contract-v1.md 屬設計文件 |  |
| **DUP-02** | M9 | 英靈卡詳情頁（顯示血脈等級、英靈濃度、灌注入口） | ui | 3 | 🟢 已接線 | SAME-05 | 英靈卡詳情可顯示 Bloodline_Level 並接受灌注 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **DUP-03** | M9 | 虎符升階 UI（接收血脈灌注提升層級/特種軍隊強度） | ui | 3 | 📄 僅資料 | SAME-05 | 虎符詳情顯示 Linked_Tally_Level 並隨灌注更新 | assets/scripts/ui/components/TigerTallyDetailComposite.ts、assets/resources/ui-spec/content/tiger-tally-detail-states-v1.json（僅詳情展示，無升階/灌注） |  |
| **DUP-04** | M10 | 命鏡升階/覺醒頁灌注銜接 | ui | 2 | ⚪ 未開始 | SAME-05 | 命鏡升階頁可顯示並觸發灌注結果 | 無 |  |
| **DUP-05** | M8 | 重複卡分流與轉蛋系統接線（抽到重複卡進入分流而非碎片） | logic | 2 | 🟡 純邏輯 | SAME-06 | LocalGachaService 偵測重複後導向分流流程 | LocalGachaService + GameSession.addGenerals 已回報 duplicates（/tmp/integ/assets/scripts/core/managers/GameSession.ts，pr_only）；尚未導向分流 |  |
| **STORY-01** | M10 | 歷史趣聞/血脈傳聞欄位 schema（historicalAnecdote、bloodlineRumor、storyStripCells） | data | 1 | ✅ 已驗收 | - | GeneralConfig 含兩層敘事欄位與 6 格 strip 型別 | assets/scripts/core/models/GeneralUnit.ts（historicalAnecdote/bloodlineRumor/storyStripCells）；assets/resources/data/generals.json 235 筆皆含 6 格 strip；assets/resources/data/master/generals-stories.json |  |
| **STORY-02** | M10 | 日常人物頁 6 格 story strip 顯示 | ui | 2 | 🟢 已接線 | STORY-01 | 人物頁顯示 origin/faction/role/awakening/bloodline/future 六格 | assets/scripts/ui/components/GeneralDetailOverviewMapper.ts（storyStripCells 映射）；tools_node/gen-general-content-states.js |  |
| **STORY-03** | M10 | 首批文案池（趙雲/甄姬/孫尚香/關羽/諸葛亮）品質與完成度 | content | 3 | 📄 僅資料 | STORY-01 | 五人 historicalAnecdote/bloodlineRumor 無 '???' 且六格符合前段歷史後段血脈 | generals.json 中 historicalAnecdote 與 bloodlineRumor 各有 12 筆為空或 '???'；tools_node/audit-core-generals-quality.js、fix-generals-stories.js |  |
| **STORY-04** | M10 | 命鏡/覺醒頁 5 格命運帶資料與顯示 | ui | 3 | 🟢 已接線 | STORY-01 | 命鏡頁顯示 5 格命運帶並與 6 格 strip 有明確映射 | 無；血脈命鏡過場載入規格相關 UI 未見實作 | 未開始→已接線；MirrorFateStrip 接 LobbyScene |
| **STORY-05** | M0 | 敘事分層與內容品質檢核工具（中段必有命運介入） | tool | 2 | 🟡 純邏輯 | STORY-01 | 驗證腳本檢查格數、前後段分層與缺漏 '???' 並納入閘門 | tools_node/validate-generals-data.js、tools_node/audit-core-generals-quality.js（檢核欄位完整度，未檢中段命運介入） |  |
| **VIT-01** | M1 | 精力資料模型（Vitality_Current/Max、Recovery、Is_Pregnant、Pregnancy_Remaining、Red_Gene_Level）與存檔 | data | 1 | ✅ 已驗收 | - | GeneralConfig 含 vitality/maxVitality/待產欄位並可存檔往返 | [v5 核對 2026-10-14] 精力資料模型存讀往返測試（01578ada，tests/P0RoundTrip.test.ts）；VitalityCap 既有呼叫端 |  |
| **VIT-02** | M1 | 精力消耗規則（戰鬥-30/結緣男-50女-100/培育-20） | logic | 2 | 🟢 已接線 | VIT-01 | 各行動扣除對應精力，不足時拒絕並顯示 UI_VIT_EXHAUSTED | [master fb02ff9 重估] core/systems/BattleRoster.ts（BATTLE_VITALITY_COST）、NurtureSystem.ts（VIGOR）、BreedingSystem.ts（男-50/女-100） |  |
| **VIT-03** | M1 | 每季自然回復（Base20+紅因子×5，老年×0.6）與待產凍結 | logic | 2 | 🟢 已接線 | VIT-01, LIFE-02 | 每季推進時依公式回復，待產中不回復，不超過上限 | [master fb02ff9 重估] BattleRoster.ts VITALITY_RECOVER_DEPLOYED/STANDBY；PROG-2-0041 對齊 Q17 |  |
| **VIT-04** | M1 | 精力上限公式（100+紅因子×20，近親×0.7） | logic | 1 | 🟢 已接線 | VIT-01 | Vitality_Max 依紅因子與近親折算 | [master fb02ff9 重估] core/systems/VitalityCap.ts（VITALITY_MAX_MALE/FEMALE） |  |
| **VIT-05** | M8 | 補元散道具（+50/+100，不超過上限） | logic | 1 | ✅ 已驗收 | VIT-01 | 使用補元散回復精力且封頂，測試通過 | [v8 核對 2026-10-15] 補元散回復純函式（f669c947）、精力已滿拒絕並扣背包道具（7a5cdac6）、存檔寫入與背包使用流程（f46e3d50）；VitalityPill 2 處呼叫端與測試 |  |
| **VIT-06** | M1 | 精力 UI（精力條綠→黃→紅、消耗提示、待產剩餘季數） | ui | 2 | 🟢 已接線 | VIT-01 | 精力條隨比例變色並顯示 UI_VIT_BAR/UI_PREGNANCY_LOCK | [v3 核對 2026-10-13] PROG-2-0074 精力 UI（d4be8a0 / 67d872e）：LifeVitalityPresenter 精力條分段 |  |
| **VIT-07** | M3 | 大器晚成偵測（精力極低線索） | logic | 1 | ✅ 已驗收 | VIT-01, FATE-04 | 精力低於門檻時出現大器線索文案 | [v5 核對 2026-10-14] 精力極低大器晚成線索（749db278，PROG-2-0316）；LateBloomClue 接線，tests/LateBloomClue.test.ts 通過 |  |
| **VIT-08** | M8 | 月卡精力+20%、待產縮短道具（商業化） | logic | 2 | ⚪ 未開始 | VIT-03 | 月卡狀態使回復×1.2，待產縮短道具減少剩餘季數 | 無 |  |
| **VIT-09** | M10 | 精力劇本字串與提示（精疲力竭/補元散/待產/大器線索） | content | 1 | ✅ 已驗收 | - | 字串 Key 進 i18n | [v12 核對 2026-10-20] 精力劇本字串進語系表（a439069c，PROG-2-0728，#566）；VitalityScriptTexts 由 VitalityPillController、NurtureFlowController、BondingSetupController 呼叫，測試存在 |  |
| **REC-01** | M5 | 戰績資料模型 BattleRecord（Win/Lose/Kill/Damage/Guardian/Milestones）與存檔欄位 | data | 1 | ✅ 已驗收 | - | GeneralConfig 或獨立 Record 含五欄位並納入存檔 | [v3 核對 2026-10-13] BattleRecordStats.ts（BattlePerformance/BattleRecordLike）＋ BattlePerformanceTracker 結算寫回；tests/BattleRecordStats.test.ts 通過 |  |
| **REC-02** | M5 | 戰鬥結算寫入（勝敗、擊殺、傷害、承傷+治療） | logic | 3 | 🟢 已接線 | REC-01 | 戰鬥結束時對出戰武將累加欄位，單元測試涵蓋勝/敗/撤退 | [master fb02ff9 重估] BattleRoster 結算回寫（PROG-2-0033 settle results back） |  |
| **REC-03** | M5 | 勝率與守護力計算函式 | logic | 1 | ✅ 已驗收 | REC-01 | WinRate 與 Guardian_Power 公式測試通過，分母為 0 有保護 | [v3 核對 2026-10-13] BattleRecordStats.winRate / guardianPowerOf；tests/BattleRecordStats.test.ts 通過 |  |
| **REC-04** | M5 | 戰績面板 UI（武將詳情『戰績』分頁） | ui | 3 | 🟢 已接線 | REC-02 | 詳情頁新增戰績分頁顯示五項與勝率 | [v3 核對 2026-10-13] GeneralDetailRecordChild.ts（戰績分頁）掛入 GeneralDetailComposite.ts:360/440；buildBattleRecordTabText；PROG-2-0081 |  |
| **REC-05** | M9 | 里程碑成就（百人/千人/萬人斬、不敗神話、守護之壁、修羅）判定與獎勵 | logic | 3 | ✅ 已驗收 | REC-02 | 達標時觸發成就並發放戰法筆記/稱號，隱藏因子待因子字典確認 | [v14 核對 2026-10-21] 里程碑成就獎勵表與達成後組合（f91a609d，合併 #376）；GameSession、HiddenFactorAwakening 呼叫 MilestoneRewards，MilestoneRewards.test.ts 存在 |  |
| **REC-06** | M9 | 隱藏因子覺醒掛鉤（不敗/鐵壁/殺意） | logic | 2 | ✅ 已驗收 | REC-05, GEN-08 | 成就達成時解鎖對應白/紅色因子 | [v13 核對 2026-10-20] 里程碑達成時覺醒隱藏因子（7730b68d，PROG-2-0711，#633）；HiddenFactorAwakening 由 GameSession 呼叫，測試存在 |  |
| **REC-07** | M4 | 退役戰績評分與虎符品質（retire_score 分級） | logic | 2 | ✅ 已驗收 | REC-02, LIFE-06 | 依公式輸出 N/R/SR/SSR 等級，邊界值測試通過 | [v8 核對 2026-10-15] 退役戰績評分分級（61741379，驗收測試 7a0f8304）；retire_score 由 BattleRecordStats 與 MentorCard 使用 |  |
| **REC-08** | M4 | 退役戰績回顧面板與季度戰損報告 | ui | 2 | 🟢 已接線 | REC-07 | 退役畫面顯示 UI_RETIRE_REVIEW，季度戰報顯示精力% | [v9 核對 2026-10-15] 退役戰績回顧面板 RetireReviewController 2 處呼叫端與 2 個測試（79e71c36 文字、面板控制器）；季度戰損報告未逐項核對 |  |
| **REC-09** | M9 | 單場戰報快照 BattleSnapshot | logic | 2 | ✅ 已驗收 | REC-02 | 每場戰鬥保存快照並含單場 MVP/最高傷害，受資料增長監控保護 | [v15 核對 2026-10-21] 單場戰報快照 BattleSnapshot 於戰後結算產出並接上 GameSession（77e30769，#703）；BattleSnapshot.test.ts 與 BattleSnapshotWiring.test.ts 存在 |  |
| **REC-10** | M9 | 賽季戰績重置與結算 | server | 3 | ✅ 已驗收 | REC-02 | 賽季切換時分段重置並結算獎勵（需伺服器或離線賽季機制） | [v15 核對 2026-10-21] 武將賽季戰績分段重置純邏輯（e9718e3d，#700）；戰後寫入與季切換歸檔接上 BattleRoster（0d4289ea #706、def0de1e #718）；BattleSeasonStats.test.ts 存在 |  |
| **REC-11** | M11 | 戰績排行榜（好友/全服） | server | 4 | 🟢 已接線 | REC-10 | 可依傷害/擊殺/守護力排序顯示好友與全服榜 | [v15 核對 2026-10-21] 戰績排行榜排序純邏輯（85a84d65，#709）與 GameSession 本機查詢（1176d601，#716）；BattleLeaderboard.test.ts 存在；好友／全服部分未做，排行 UI 未核對 |  |
| **REC-12** | M10 | 戰績劇本與字串（百人斬、千人斬、不敗、守護、退役回顧） | content | 1 | 🟢 已接線 | - | 字串 Key 進 i18n | [v9 核對 2026-10-15] 戰績里程碑名稱字串進語系表（521eb895，PROG-2-0445）；戰後里程碑 log 改用語系查詢（2f5313bf，PROG-2-0801）；劇本文案未逐項核對 |  |
| **MERC-01** | M6 | 傭兵資料模型（Merc_UID/Bond/Days_Left/Status/Illustration_Stage/Original_Owner）與存檔 | data | 1 | ✅ 已驗收 | - | 傭兵狀態型別與存檔欄位完成，往返序列化測試通過 | [v4 核對 2026-10-13] MercenarySaveModel 序列化與讀檔校正接進 GameSession 與玩家存檔快照；tests/MercenarySaveModel.test.ts、MercenarySaveWire.test.ts |  |
| **MERC-02** | M6 | 傭兵獲取（試用券/轉蛋→6 日傭兵，能力固定 100%） | logic | 2 | 🟢 已接線 | MERC-01 | 使用試用券產生 Trial 傭兵，數值=原值×1.0 | [v6 核對 2026-10-14] 試用券招募接上 GameSession（53602c07）；MercenaryTrialTicket 有呼叫端 |  |
| **MERC-03** | M6 | 6 日結義倒數與每日好感（+10，最大 60） | logic | 2 | ✅ 已驗收 | MERC-01, GEN-01 | 每日推進 Days_Left-1 與 Bond+10，6 日後狀態轉 Expired，測試通過 | [v5 核對 2026-10-14] MercenaryAffection.ts 試用每日好感與倒數合併推進（8e6b9366，PROG-2-0311）；3 處呼叫端，tests/MercenaryAffection.test.ts 通過 |  |
| **MERC-04** | M6 | 結義轉永久（結義點數 R100/SR300/SSR600/UR1200；SSR/UR 雙軌美酒） | logic | 3 | 🟢 已接線 | MERC-03 | 點數足夠則轉為永久武將並扣點；SSR/UR 美酒路徑依 Q42 裁決 | [v5 核對 2026-10-14] 結義點數改扣 GCH-06 餘額（8e724e11，PROG-2-0320）；MercenaryBondPermanent 接線；SSR/UR 美酒路徑與點數獲得流程仍未定 |  |
| **MERC-05** | M6 | 退場流程（到期未結義離隊、告別信）與 30 天冷卻 | logic | 2 | ✅ 已驗收 | MERC-03 | 到期傭兵離隊並出現告別信；同武將 30 天內不再出現於傭兵選單 | [v5 核對 2026-10-14] MercenaryDeparture.ts 退場與 30 天冷卻以武將為單位（a5074a16，PROG-2-0315）；5 處呼叫端，tests/MercenaryDeparture.test.ts 通過 |  |
| **MERC-06** | M5 | 傭兵上場限制（可出戰、數值不計入永久紀錄、不被俘虜） | logic | 2 | 🟢 已接線 | MERC-02, REC-02 | 傭兵出戰不寫入永久戰績，戰場上不可被俘虜 | [v4 核對 2026-10-13] 試用傭兵出戰不寫入永久紀錄（PROG-2-0217）；接戰場結算 |  |
| **MERC-07** | M6 | 傭兵介面（倒數、結義進度、名牌、確認視窗、告別 UI） | ui | 4 | 🟢 已接線 | MERC-03 | 傭兵畫面顯示 UI_MERC_* 字串並可執行結義/退場 | [v8 核對 2026-10-15] 傭兵池列表（91fce092）、名牌入口（9b5d511e）與 MercenaryPanelController 2 處呼叫端；倒數與告別 UI 未逐項核對 |  |
| **MERC-08** | M10 | 五階段插畫進度系統（見面/交手/認同/信任/結義） | content | 3 | ⚪ 未開始 | MERC-03 | Illustration_Stage 1~5 依好感度解鎖並顯示對應插圖/文案（D3/D4 純敘事） | 無 |  |
| **MERC-09** | M8 | 二轉機制（結義後再抽同名卡自動二轉）與重複卡分流整合 | logic | 2 | ⚪ 未開始 | MERC-04, SAME-06 | 已永久的傭兵武將再次抽到時觸發二轉並提升屬性上限 | 無 |  |
| **MERC-10** | M4 | 退役轉教官（Age≥65→教官卡，Mentor_TP_Base=Total_TP×0.3） | logic | 2 | 🟢 已接線 | LIFE-07 | 退役後產生教官卡且 TP 基底=Total_TP×0.3 | [master fb02ff9 重估] LegacyService.ts + MentorCard.ts（PROG-2-0031） |  |
| **MERC-11** | M11 | 傭兵名牌與演武筆記回傳原主（社交） | server | 3 | ⚪ 未開始 | MERC-01 | 傭兵顯示原主名並將戰鬥記錄回傳原主（需伺服器） | 無 |  |
| **MERC-12** | M6 | 傭兵凍結（結義後保留數值快照） | logic | 1 | 🟢 已接線 | MERC-04 | 結義後保留當前 Stats_Snapshot 為永久武將初始值 | [v5 核對 2026-10-14] MercenaryBondPermanent 數值快照複製接進結義流程（5c48e5d5，PROG-2-0308） |  |
| **FBR-12** | M6 | 因子揭露順序改照因子爆發系統 §K（FACTOR_DISCOVERY_LEVEL 綠 20→1、紅 45→20，代表色改白） | logic | 1 | 🟢 已接線 | - | 揭露門檻依 §K 推導，DiscoveryThresholds/FactorAwakening 讀同一門檻 | PROG-2-1465（#1276，ed52892e）；工時為估計值 | 新增列（協調線指示）；來源卡 PROG-2-1465；已接線 |

### 3.6 6. 數值、架構與底層支援 (Formula, Architecture & Backend)

> 涵蓋核心數值公式 (FormulaSystem)、數據結構規範、同步與斷線重連、熱更新、戰鬥數據管線 (GDP) 與 NPC 敘事大腦。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **DS-01** | M1 | Root Save 外殼：Player_ID/Save_Version/Last_Sync_Hash/Data/Action_Records 型別與讀寫 | data | 2 | ✅ 已驗收 | - | 存檔 round-trip 後五個頂層欄位完整保留且有單元測試 | [v6 核對 2026-10-14] Root Save 外殼與 semver 版號、遷移鏈、規格 envelope（578e8cc5，PROG-2-0334）；SaveVersion 呼叫端與測試 |  |
| **DS-02** | M1 | General 主結構欄位落地（Template_ID/Phase/Talent_Stats/Prowess_Stats/Genes/Ancestors_JSON/Profile_Presentation 等） | data | 3 | 🟡 純邏輯 | DS-01 | GeneralUnit 型別與 generals.json 涵蓋規格範例全部欄位並通過 schema 驗證 | [v10 核對 2026-10-20] GeneralMainSchema 欄位契約與列舉驗證（fb335ca1）與測試；無 src 呼叫端。PM 裁定 2026-10-20 卡狀態改為 partial（fd40a567），adapter 差異登記（e105f3bb） |  |
| **DS-03** | M1 | Save_Version 遷移鏈（MigrationService，semver 逐版升級） | logic | 2 | ✅ 已驗收 | DS-01 | 載入 1.0.0 舊檔會依序跑 Migration 後標記最新版，並有測試 | [v6 核對 2026-10-14] Save_Version 遷移鏈（578e8cc5，PROG-2-0334）；SaveVersion 呼叫端與測試 |  |
| **DS-04** | M1 | Data.* 子系統掛載點骨架（培育/結緣/教官/經濟/時間/治理/大廳/日誌/他國/官職等約 25 條路徑） | data | 3 | 🟡 純邏輯 | DS-01 | Root Data 預設值含全部掛載路徑，缺漏欄位由 Migration 補齊 | [v10 核對 2026-10-20] Data.* 掛載點骨架 DataMounts（cb8fa923）與測試；無 src 呼叫端 |  |
| **DS-05** | M7 | 共用技能資料流：seed library → save overlay → battle read model（shared/skill-runtime） | logic | 4 | 🟢 已接線 | DS-02 | UI 與戰鬥只吃 read model；Learned_Tactics/Ultimates overlay 疊加 seed 後產出 battleSkillId/unlockState | shared/skill-runtime.ts；shared/skill-runtime.schema.json；tests/BattleSkillExecutor.test.ts；tests/BattleSkillSourceTranslator.test.ts；assets/resources/data/master/tactic-library.json、ultimate-definitions.json |  |
| **DS-06** | M5 | 虎符/英靈卡/出征編制/Battle_State 最小 read model 與 2-1 約束 | data | 4 | 🟢 已接線 | DS-04 | Talisman_Inventory/Spirit_*/Sortie_Loadout/Battle_State 型別與唯一性驗證（三角色不重覆、一將一符一命）皆有測試 | [v6 核對 2026-10-14] 開戰前檢查戰場狀態 read model（75f6dcee，PROG-2-0248）；出征帳本與虎符 read model 接線 |  |
| **DS-07** | M1 | 2-2 補充欄位列舉驗證（Revelation_Level、Breeding_Mode、Default_Tab、Pool_Positioning 等 34 條） | logic | 3 | 🟡 純邏輯 | DS-04 | 所有列舉欄位寫入非法值被驗證器拒絕，附測試 | [v10 核對 2026-10-20] §2-2 補充欄位列舉與跨欄位規則驗證（9e372f30）與測試；DataSchemaEnumRules 無 src 呼叫端 |  |
| **DS-08** | M8 | Data.Inventory_Service 統一物件庫與 Tally/Spirit projection（2-1 §11） | data | 3 | 🟢 已接線 | DS-06 | 物件庫為 canonical，兩個 projection 由其推導且不重複存真相 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **DS-09** | M11 | NPC_Memory 最小 read model（SQLite-vec 路徑、Recall_Context、MVP 只存 Template_Slot_Values） | logic | 2 | 🟡 純邏輯 | DS-04 | 離線模板選句可讀寫 Recall_Context，Player_ID 綁定且不上傳完整存檔 | assets/scripts/core/dialogue/NpcMemoryAdapter.ts（58 行，ServiceLoader/GeneralListComposite 引用）；無 SQLite-vec |  |
| **DS-10** | M1 | Action_Records 離線佇列與轉蛋 GachaDrawRecord/GachaHistoryRecord | logic | 3 | 🟢 已接線 | DS-01 | 三種轉蛋 Action 寫入佇列，getRecentPullHistory 依時間戳降序回傳 | assets/scripts/core/services/ActionLogStore.ts；LocalGachaService.ts；ui/dev/GachaDevOverlay.ts；ui/panels/ActionLogDebugPanel.ts（無測試） |  |
| **DS-11** | M11 | 客戶端 Tx_Hash 滾動雜湊鏈 | logic | 2 | ✅ 已驗收 | DS-10 | 客戶端雜湊與伺服器 fixture 一致且 64 字元 hex | 整合樹 assets/scripts/core/systems/SyncHash.ts；tests/SyncContract.test.ts（雜湊與 fixture 比對） |  |
| **DS-12** | M11 | Server 事件重演與 Session_Secret 輪換驗證流程 | server | 4 | 🟢 已接線 | DS-11 | 竄改紀錄被拒、驗證成功回傳新 Secret 並清空本機佇列 | 整合樹 server/src/sync.ts（in-memory mock store）；tests/SyncContract.test.ts；master server/src/index.ts 僅舊版 POST /sync |  |
| **DS-13** | M11 | Server 資料表 users/save_snapshots 與靜態 Config 上 CDN | server | 3 | 🟡 純邏輯 | DS-12 | 資料庫建表與讀寫通過 smoke:db，Client 登入時以版號/MD5 核對靜態 JSON | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **TERM-01** | M0 | ID 命名契約驗證器（UID/Template_ID/Bloodline_ID/Gene_ID/V_PID/SIGIL/SPIRIT_TALLY/ATM-ID） | tool | 2 | 🟡 純邏輯 | - | validate 工具對 generals/gene-dictionary/bloodline-templates 的 ID 格式違規回報錯誤 | [v11 核對 2026-10-20] IdContractValidator 報告模式，已涵蓋 gene-dictionary 與血脈模板（73c8b848）；無 src 或工具呼叫端，尚未接入 CI |  |
| **TERM-02** | M0 | 稀有度與角色分類列舉（RarityTier 五級、characterCategory、商業七色 CommercialRarityBand） | data | 2 | ✅ 已驗收 | - | 雙軸 maxStat/avg5 判定結果與門檻檔一致，七色層不回寫戰力 | [v6 核對 2026-10-14] 商業化 7 色稀有度分層接線（53f27fd7，PROG-2-0320）；CommercialRarityBand 有呼叫端與測試 |  |
| **TERM-03** | M5 | 兵源模型名詞落地欄位（General_Fame/General_Rank/Command_Capacity/City_Troops/Sortie_Troop_Pool/Unit_Troop_Cost/Current_Troops/Recruit_Regen） | data | 3 | 🟢 已接線 | - | 型別與 JSON 皆含欄位，Sortie_Troop_Pool=min(帶兵上限,城市兵源,關卡上限) 有單元測試 | [v4 核對 2026-10-13] 將階/名聲欄位與 computeCommandCapacity 帶兵上限接線（PROG-2-0231） |  |
| **TERM-04** | M10 | 人物頁分頁與槽位名詞契約（將/屬/命/技/寶/兵、Destiny_Slot、Tally_Slot、StoryDock） | ui | 2 | 🟢 已接線 | - | Default_Tab 六值與本地化對應一致，寶頁不含英靈卡/虎符槽 | assets/scripts/ui/components/GeneralDetailOverviewMapper.ts；assets/scripts/ui/components/general-detail/GeneralDetailFormatters.ts；tools_node/validate-general-detail-ui.js |  |
| **TERM-05** | M0 | 任務卡 ID 系統代碼表與卡號格式檢查 | tool | 1 | 🟢 已接線 | - | 任務卡 frontmatter 的 ID 符合 {系統}-{子系統}-{4位流水} | tools_node/sync-task-briefs-from-cards.js；docs/agent-briefs/（compute-gate 掃描，未逐項核對格式） |  |
| **TERM-06** | M11 | 資料中心名詞對應實作（DataCatalog/PersonRegistry/BloodlineGraph/SaveSerializer/DeltaPatchBuilder/DataGrowthMonitor/LoreCache） | logic | 3 | 🟡 純邏輯 | - | 每個名詞皆有對應類別與一則單元測試 | master assets/scripts/core/storage/DataCatalog.ts、core/models/PersonRegistry.ts、core/services/{BloodlineGraph,SaveSerializer,DeltaPatchBuilder,DataGrowthMonitor}.ts（皆無專屬測試，SaveSerializer 無引用） |  |
| **TERM-07** | M7 | 虎符 Q61~Q65 裁決欄位約束（糧耗、Set 羈絆、無冷卻、無 TallyCategory） | logic | 2 | ⚪ 未開始 | TERM-03 | TALLY_GRAIN_COST 與 SET_BONUS_DEFS 為單一常數來源，schema 不含 Cooldown_Turns/TallyCategory | 無 |  |
| **TERM-08** | M10 | UI 字串 Key 規則 UI_{SYSTEM}_{ACTION} 與 i18n 字典 | content | 2 | ⚪ 未開始 | - | UI 文案皆經 key 查表且 key 符合命名 | [v16.4 封鎖 blocked 2026-10-27] 命名待使用者裁決 ；無（未見 UI_ 前綴字典） |  |
| **TERM-09** | M7 | 天氣/場景名詞列舉（SUNNY/RAINY/FOG/WINDY/NIGHT/THUNDER、Scene_Preset_ID、Tile_Preset_ID） | data | 1 | 🟢 已接線 | - | 列舉在 tile-buffs/戰場資料中一致 | [v6 核對 2026-10-14] 天氣 enum 改為規格六種（9e24eabd，PROG-2-0343）；名詞列舉與場景 preset 未全部核對 |  |
| **SYNC-01** | M11 | API 契約型別與 JSON Schema（delta/full 請求回應、錯誤碼表 E001~E099） | data | 2 | 📄 僅資料 | - | client 與 server 共用契約檔，SyncContract 測試比對 fixture 通過 | 整合樹 server/smoke-fixtures/sync-request.valid.json；assets/scripts/core/systems/SyncManager.ts 內 interface；無共用契約檔、無 E 碼 |  |
| **SYNC-02** | M11 | POST /sync/delta：baseHash 檢查、RFC6902 套用、行動重演、409 | server | 3 | ✅ 已驗收 | SYNC-01 | 合法 patch 回 200 並更新 hash；baseHash 不符回 409 | 整合樹 server/src/sync.ts；tests/SyncContract.test.ts（delta 套用與重演）；欄位名與規格不同 |  |
| **SYNC-03** | M11 | POST /sync/full：完整覆蓋、版本衝突 409 version_too_old、gzip Base64 | server | 2 | 🟡 純邏輯 | SYNC-01 | 全量上傳覆蓋快照；舊版存檔回 409/E006 | 整合樹 server/src/sync.ts（覆蓋已有；version_too_old 與 compressed 旗標無）；tests/SyncContract.test.ts fallback 測試 |  |
| **SYNC-04** | M11 | 認證：Bearer sessionToken、24h 輪換、deviceId 綁定、401 E003/E004 | server | 3 | 🟡 純邏輯 | SYNC-01 | 無效/過期 token 回 401 對應錯誤碼，換機 token 失效 | 整合樹 server/src/sync.ts authenticate（比對 Session_Secret，無 24h 輪換、無 deviceId 綁定、無 E 碼） |  |
| **SYNC-05** | M11 | 限流與大小限制：429 每分鐘 10 次、413 5MB compressed | server | 1 | ⚪ 未開始 | SYNC-02 | 第 11 次請求回 429/E008；超限 body 回 413/E007 | 無（僅 express.json limit 5mb） |  |
| **SYNC-06** | M11 | JSON Pointer 路徑白名單與 patch 驗證（E002） | server | 2 | ⚪ 未開始 | SYNC-02 | 白名單外路徑與非 RFC6902 patch 回 400/E002，附注入測試 | 無（整合樹 applyJsonPatches 未見白名單） |  |
| **SYNC-07** | M11 | 客戶端 SyncManager：delta 優先、409 fallback full、401 重驗、5xx 指數退避最多 3 次 | logic | 3 | ✅ 已驗收 | SYNC-02, SYNC-03 | 模擬 409/401/5xx 時流程符合 §6 並有測試 | master assets/scripts/core/systems/SyncManager.ts（retrySync 1/2/4s）；tests/SyncManager.test.ts；整合樹 tests/SyncContract.test.ts（fallback） |  |
| **SYNC-08** | M11 | 客戶端 gzip 請求壓縮與 compressed 旗標 | logic | 1 | 🟡 純邏輯 | SYNC-01 | 超過門檻的 body 以 gzip 傳輸，伺服器可解 | assets/scripts/core/systems/SyncManager.ts 批次上傳（actionRecordsCompressed，非規格的 Content-Encoding 路徑） |  |
| **SYNC-09** | M11 | 同步安全規範：HTTPS 強制、PII 過濾 Action_Records、dev 例外 | server | 1 | ⚪ 未開始 | SYNC-02 | 非 HTTPS 請求被拒（dev 除外），payload PII 檢查有測試 | 無 |  |
| **SYNC-10** | M0 | HTTP 同步整合 smoke 與 CI | test | 1 | 🟡 純邏輯 | SYNC-02 | npm run smoke:sync 在 CI 通過 | server/scripts/run-sync-smoke.js；server/smoke-fixtures/sync-request.valid.json（打舊版 POST /sync） |  |
| **HOT-01** | M11 | 版號策略與強更導流（Major 不可熱更、跳轉商店提示） | logic | 2 | ⚪ 未開始 | - | Major 版號不符時顯示商店導向彈窗並阻擋進入 | 無 |  |
| **HOT-02** | M11 | Save_Version 與 Server_Schema_Version 比對流程接入登入 | logic | 2 | 🟡 純邏輯 | HOT-01 | 登入後比對版本並觸發 MigrationService | assets/scripts/core/storage/SchemaMigration.ts（needsMigration/migrate；未接登入、未取 Server 版本） |  |
| **HOT-03** | M11 | Migration 腳本註冊慣例與逐版升級測試 | test | 2 | ⚪ 未開始 | HOT-02 | 每個 Schema 版本均有 migration 與前後 fixture 測試 | 無（tests/ 無 SchemaMigration 測試） |  |
| **HOT-04** | M11 | Web 發佈管線：MD5 Cache、CDN 長快取、index.html no-cache | tool | 3 | 📄 僅資料 | - | 建置輸出檔名含 hash，部署腳本設定 Cache-Control 並驗證 | 整合樹 tools_node/build-web.js；tools_node/run-web-smoke.js（未核對 MD5/Cache-Control） |  |
| **HOT-05** | M11 | Native 發佈管線：project.manifest/version.manifest 產生 | tool | 3 | ⚪ 未開始 | HOT-04 | CI 產出 manifest 且 MD5 與檔案一致 | 無 |  |
| **HOT-06** | M11 | HotUpdateScene 與 AssetsManager 差異下載、重啟（cc.game.restart） | ui | 4 | ⚪ 未開始 | HOT-05 | 實機模擬舊版包可下載差異並重啟進入新版 | 無（grep HotUpdate/AssetsManager 無命中） |  |
| **HOT-07** | M11 | Asset Bundle 切分（main/resources/lobby_ui/battle_assets）與 loadBundle 動態載入 | logic | 4 | 📄 僅資料 | - | 啟動場景不靜態參照戰鬥資源，bundle 清單通過檢查 | assets/scripts/battle/views/BattleSceneLoader.ts、core/systems/ResourceManager.ts 引用 loadBundle（bundle 配置未核對） |  |
| **HOT-08** | M11 | Minor 版更新進度條 UI（下載 25MB/100MB）與 Patch 靜默驗證 | ui | 2 | ⚪ 未開始 | HOT-06 | Minor 顯示進度條，Patch 1 秒內完成驗證 | 無 |  |
| **HOT-09** | M0 | 啟動場景靜態參照審計 lint（禁止 Start Scene 綁定核心戰鬥資源） | tool | 1 | ⚪ 未開始 | HOT-07 | compute-gate 掃描違規並失敗 | 無 |  |
| **GDP-01** | M0 | ingest-generals-wiki.js：Wiki 爬取、500ms 限速、wiki-cache、--limit/--dry-run | tool | 2 | ✅ 已驗收 | - | dry-run 不寫檔；實跑輸出 raw-wiki.json 結構符合規格且命中快取 | [v10 核對 2026-10-20] ingest-generals-wiki 爬取工具（0415、0807 完成，協調者確認）；IngestGeneralsWiki 與 GeneralDataPipelineE2E 測試覆蓋。CLI 入口，無其他腳本呼叫，若 PM 不以 CLI 入口計入，請降回已接線 |  |
| **GDP-02** | M10 | ingest-generals-ai.js：lore 欄位生成與單筆容錯 | tool | 2 | 🟡 純邏輯 | GDP-01 | 單筆失敗只 WARN 不中斷，輸出 historicalAnecdote/bloodlineRumor/storyStripCells | tools_node/ingest-generals-ai.js；assets/resources/data/master/generals-lore.json 235 筆 |  |
| **GDP-03** | M0 | merge-generals-master.js：以 id 合併、既有優先、自動後置驗證 | tool | 2 | ✅ 已驗收 | GDP-01, GDP-02 | 重跑合併不覆蓋手改資料並自動執行 validate | [v10 核對 2026-10-20] merge-generals-master 合併工具（0414 完成，協調者確認）；被 ingest-generals-ai.js 呼叫，MergeGeneralsMaster 與 E2E 測試存在 |  |
| **GDP-04** | M0 | validate-generals-data.js：R1~R7 驗證規則 | tool | 2 | 🟢 已接線 | - | 對違規 fixture 回報對應規則錯誤，現有資料 0 errors | tools_node/validate-generals-data.js（實跑 errors=0 warnings=0，235 筆；無反例測試）；tools_node/validate-general-data-tooling.js |  |
| **GDP-05** | M10 | 25 核心欄位補齊（title/bloodlineId/genes/awakeningTitle/skillId/parentsSummary/ancestorsSummary） | data | 4 | 🟢 已接線 | GDP-03 | master 全部 235 位具備 25 欄位且通過驗證 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **GDP-06** | M0 | master 資料集容量與覆蓋率（>=50 位、lore/story 100%、rarity/category 100%） | data | 1 | ✅ 已驗收 | GDP-04 | validate 輸出覆蓋率報告且皆達標 | assets/resources/data/master/generals-{base,lore,stories}.json 各 235 筆；rarityTier 與 characterCategory 缺漏 0；validate 實跑通過 |  |
| **GDP-07** | M0 | 稀有度雙軸計算（RarityResolver + rarity-thresholds）併入管線 | logic | 2 | 🟢 已接線 | GDP-04 | 管線以 maxStat/avg5 重算 rarityTier 與資料一致，legendary<20% | [v7 核對 2026-10-14] 稀有度雙軸計算併入資料管線（52bbc06b，PROG-2-0413） |  |
| **GDP-08** | M10 | 人工審核清單自動化（極值武將、tier 分布、亂碼截斷、重複 id、關鍵 25 位 lore） | tool | 2 | 🟡 純邏輯 | GDP-04 | 輸出審核報告列出 Top 屬性、分布與疑似亂碼 | [v9 核對 2026-10-15] 人工審核清單報告（3286288c，#442）；報告工具，無執行期呼叫端 |  |
| **GDP-09** | M10 | 故事條 6 格敘事連貫與 slot1-6 內容審核 | content | 5 | 🟡 純邏輯 | GDP-02 | 235 位 storyStripCells 均 6 格且通過人工抽查 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（純邏輯）；待 QA／實機驗收 |  |
| **GDP-10** | M0 | 管線工具測試與 CI 整合 | test | 2 | 🟡 純邏輯 | GDP-03, GDP-04 | ingest→merge→validate 以 fixture 跑端到端並進 compute-gate | [v9 核對 2026-10-15] GDP-10 管線端到端測試（afe1be5d，#449）；工具測試，CI 整合未核對 |  |
| **NUM-01** | M7 | 武將化身單挑 ATK/暴擊/閃躲公式（E-11/E-14） | logic | 1 | ✅ 已驗收 | - | FormulaSystem 單測涵蓋 ATK(STR×0.7+LEA×0.3)、crit(上限50%)、dodge(上限40%) | assets/scripts/core/systems/FormulaSystem.ts；tests/FormulaSystem.test.ts（crit/dodge/攻擊力共約8案） |  |
| **NUM-02** | M7 | 單挑接受判定與拒絕懲罰（score≥0.58） | logic | 1 | 🟡 純邏輯 | NUM-01 | score=0.45HP+0.35兵力+0.2戰力，≥0.58接受；拒絕全軍攻防與HP減半有測試 | assets/scripts/battle/runtime/BattleDuelResolver.ts:89-90、BattleGeneralDuelFlow.ts:232；tests/BattleCombatRegression.test.ts 僅間接涵蓋，未確認拒絕懲罰斷言 |  |
| **NUM-03** | M7 | 主傷害公式完整乘區（剋制×地形×天氣×兵種適性×general_buff，E-3/F-1） | logic | 3 | 🟢 已接線 | NUM-04 | calculateDamage 納入天氣、兵種適性效率、general_buff，並與規格表數值對照測試 | [v6 核對 2026-10-14] 兵種剋制五角與機械 ×1.5（4fa7790c，PROG-2-0341）；主傷害乘區（地形×天氣×適性）既有接線；完整公式未逐項核對 |  |
| **NUM-04** | M0 | 數值常數集中化 NumericalConfig JSON + FormulaRegistry（I 節） | data | 3 | 🟡 純邏輯 | - | Counter/Aptitude/Age/Reincarnation/Ult/Tally 常數由單一 JSON 載入，可熱更新，Constants.ts 不再 hardcode | [v9 核對 2026-10-15] NumericalConfig.ts 與測試已加入；src 無呼叫端，數值仍散在各模組 |  |
| **NUM-05** | M5 | 兵種剋制表與適性等級修正表（E-4/E-5，含粉色因子→適性轉換） | logic | 2 | 🟢 已接線 | NUM-04 | S~D 的攻防/移動/命中修正與 0.8~1.2 效率可查，粉因子★→適性、≥5同適性升級有測試 | [v3 核對 2026-10-13] BattleAptitude.ts 適性表（攻防/移動/命中）＋ TROOP_COUNTER_MAP；戰場 BattleCombatResolver 使用 |  |
| **NUM-06** | M2 | EP 爆發力計算（E-8/F-2：共鳴/異脈/契合/精力/天命波動） | logic | 2 | 🟢 已接線 | NUM-04 | calculateEP 五項條件各有單測，14人祖譜輸入結果符合規格 | [master fb02ff9 重估] BreedingSystem.ts EP 公式 |  |
| **NUM-07** | M1 | 精力經濟：消耗/回復/上限/補元散（E-2/E-7/F-3） | logic | 3 | 🟢 已接線 | NUM-04 | 戰鬥-30、結緣男-50女-100、入學-20、奧義Ult×10、季度回補與補元散有單測，並與 MCQ Q45/Q46 對齊 | [v3 核對 2026-10-13] BattleRoster 戰鬥精力消耗與季度回復（BATTLE_VITALITY_COST、VITALITY_RECOVER_*）；VitalityCap.ts 上限 |  |
| **NUM-08** | M1 | 年齡階段倍率、壽命與死亡率（E-6） | logic | 2 | ✅ 已驗收 | NUM-04 | AGE_MODIFIER 六階段與壽命/超齡死亡率/每季+0.25歲有單測 | [v9 核對 2026-10-15] GeneralAging 與 GeneralGrowth 測試（GeneralAging.test.ts、GeneralGrowth.test.ts，PROG-2-0424）；GeneralAging 有 28 處呼叫端 |  |
| **NUM-09** | M7 | 轉生屬性上限與奧義 Base Power/精力消耗（E-6） | logic | 2 | 📄 僅資料 | NUM-04, NUM-07 | REINCARNATION_CAP 與 ult_damage=base×(1+lv×0.15)×stat_mod 有單測 | assets/resources/data/master/ultimate-definitions.json 存在（未核對是否含 200~700 數值）；無轉生上限與奧義傷害公式程式碼 |  |
| **NUM-10** | M7 | 戰法 TP 消耗表與綠因子半價（E-9） | data | 1 | 📄 僅資料 | NUM-04 | 28 個戰法 TP 與規格表一致，持有綠因子時 final_TP=base×0.5 | assets/resources/data/master/tactic-library.json、skills.json 存在；grep 未找到 TAC_* ID 與 TP 欄位，未核對一致性 |  |
| **NUM-11** | M3 | 培育數值公式與畢業評級（E-10） | logic | 3 | 🟢 已接線 | NUM-04 | Stat_Gain/TP_Gain/覺醒率/窺探率與畢業 S≥450 A≥350 B≥250 有單測 | [master fb02ff9 重估] NurtureSystem.ts TRAINING_* 常數；畢業評級在 NurtureService |  |
| **NUM-12** | M8 | 虎符戰力：品質/星級/共鳴/適性、升星突破成本（E-12/F-5） | logic | 4 | 📄 僅資料 | NUM-04 | QUALITY_MOD、星級封頂、突破成本與機率、地形/家族/性別乘區有單測 | assets/scripts/shared/TallyCardContract.ts（資料契約）、TigerTally*Composite.ts（UI）；無戰力乘區/升星公式 |  |
| **NUM-13** | M9 | 虎符忠誠度與叛變規則（E-13） | logic | 2 | ⚪ 未開始 | NUM-12 | 拔裝/裝上增減、連續變更×1.5、<30拒命、<10叛變機率有單測 | grep loyalty 僅見 master/gene-dictionary.json，無忠誠度邏輯 |  |
| **NUM-14** | M5 | 主將帶隊總戰力 Battle Power Rating 與勝敗預判（F-4/F-4a） | logic | 3 | ✅ 已驗收 | NUM-03, NUM-12 | calculateBattlePowerRating 與 predictBattleOutcome 輸出與規格偽代碼一致，出征支援防火牆規則有測試 | [v3 核對 2026-10-13] BattlePowerRating.calculateBattlePowerRating + BattlePowerPrediction.predictBattleOutcome；tests/BattlePowerRating.test.ts、BattlePowerPrediction.test.ts 通過；出征編制顯示粗估勝率（PROG-2-0212） |  |
| **NUM-15** | M5 | 帶兵上限/出征軍勢/部署限制/戰損與初中後期錨點（覆寫裁定、E-15） | logic | 3 | 🟢 已接線 | NUM-04 | Command_Capacity、Sortie_Troop_Pool_Max、CanDeploy、Lost_Troops 公式與三階段錨點表落地並有單測 | [v3 核對 2026-10-13] SortieDeploy.computeCommandCapacity / computeSortiePoolMax / 精銳上限 / 戰損回寫；帶兵上限錨點數值仍待覆核 |  |
| **NUM-16** | M10 | 數值系統 UI 字串與彈出文字（G/H 節） | content | 1 | 🟢 已接線 | - | STAT_*/VAL_*/LABEL_*/POPUP_* 與 G-1 文案進 i18n 並在戰場顯示 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **NUM-17** | M11 | Server 端 numerical_config 資料表與熱更新（I 節 Server） | server | 2 | 🟡 純邏輯 | NUM-04 | config_key/value/version 表可由 sync API 下發並讓客戶端比對版本 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **BRAIN-01** | M11 | NPC Brain FastAPI 服務骨架與 /healthz（C-5/F-1） | server | 3 | ⚪ 未開始 | - | server/npc-brain 可啟動，/healthz 回傳規格欄位並通過 smoke | find 全機器僅有 docs/tech/npc-brain-memory 文件；master 與 /tmp/integ 皆無 server/npc-brain/ 目錄（server/ 為 TypeScript express） |  |
| **BRAIN-02** | M11 | 三國演義 PDF→MD→章回切片資料管線（E-1~E-3） | tool | 4 | ⚪ 未開始 | BRAIN-01 | 可產出 source.md、chapters-manifest.json、conversion-report.json | 無 pipelines/sanguo-rag，無 artifacts/data-pipeline/sanguo-rag |  |
| **BRAIN-03** | M11 | 武將主名冊/文本稱呼表/正式對照表 與稱呼消歧（E-4/E-5a） | tool | 4 | ⚪ 未開始 | BRAIN-02 | 「將軍，我送您一把寶刀」可解析為正確 generalId 並保留物品關係 | 無 build_alias_dict.py / collect_observed_mentions.py |  |
| **BRAIN-04** | M11 | 事件抽取與 relationshipEdges（E-5b） | tool | 4 | ⚪ 未開始 | BRAIN-03 | 張飛長坂橋事件穩定抽出，edgeConfidence/edgeStrength 分離 | 無抽取器與 gold_seed_registry |  |
| **BRAIN-05** | M11 | 互動關鍵字抽取與 keyword pack（E-6） | tool | 3 | ⚪ 未開始 | BRAIN-04 | 張飛可產出 person/event/location/item/creature 關鍵字，label 長度與去噪規則通過 | 無 extracted/keyword-options |  |
| **BRAIN-06** | M10 | Persona Card 生成與人工審核標記（E-7） | content | 4 | ⚪ 未開始 | BRAIN-04 | 核心名將 persona card 欄位齊全且 manualReviewRequired=true，含 safeFallbackLine | assets/resources/data 無 persona card 檔 |  |
| **BRAIN-07** | M11 | Embedding 與向量庫入庫、namespace 規劃（E-8） | server | 3 | ⚪ 未開始 | BRAIN-05, BRAIN-06 | metadata filter 可按 generalId+contextKey 命中 | 無向量庫程式碼 |  |
| **BRAIN-08** | M11 | Evidence Resolver 與 ResolvedEvidencePack（C-3） | server | 3 | ⚪ 未開始 | BRAIN-07 | 輸出 resolvedEvidence/unresolvedEvidenceRefs/resolutionTrace，證據不足走 fallback | 無實作 |  |
| **BRAIN-09** | M11 | LLM Provider Router 與多層 Fallback（C-4/G-3） | server | 4 | ⚪ 未開始 | BRAIN-08 | deterministic/gemini/local_llama/vllm 依 NPC_LLM_PROVIDER_ORDER 切換並寫 providerTrace | 無實作 |  |
| **BRAIN-10** | M11 | 對話/情境/關鍵字 API（F-2~F-4）與 Prompt 組裝（G） | server | 3 | ⚪ 未開始 | BRAIN-09, BRAIN-05 | /v1/npc/context-options、keyword-options、dialogue 回應含 providerTrace/fallbackUsed/qualityWarnings | Cocos 端已呼叫這些路徑（NpcDialogueService.ts:147,156,186），但伺服器端不在 repo |  |
| **BRAIN-11** | M11 | 互動記憶 API M1-M4 與 M5 壓縮（F-6/C-6） | server | 4 | ⚪ 未開始 | BRAIN-10 | interaction-events/general-memory/memory/compress 可讀寫，四段全空時省略 playerGeneralMemory | server 端不在 repo；僅 docs/tech/npc-brain-memory/ 規格 |  |
| **BRAIN-12** | M10 | Cocos NpcDialogueService 與 GeneralList 對話測試入口（H/H-1） | ui | 3 | 🟢 已接線 | BRAIN-10 | 選武將才拉 keyword、按鈕才 POST dialogue、debug 顯示 evidenceRefs/fallbackUsed，並有單測與 mock server 驗收 | assets/scripts/core/services/NpcDialogueService.ts（274行，含 6 個 /v1/npc 呼叫）、ui/components/GeneralListComposite.ts；tests 無 NpcDialogueService 測試 |  |
| **BRAIN-13** | M11 | Cocos 互動記憶 adapter（M6）與事件回寫 | logic | 2 | 🟡 純邏輯 | BRAIN-11, BRAIN-12 | 對話完成後事件經 NpcMemoryAdapter 回寫 interaction-events | assets/scripts/core/dialogue/NpcMemoryAdapter.ts（58行），未見測試與全域事件系統接線 |  |
| **BRAIN-14** | M11 | SQLite-vec 離線降級、dialogue/stream、vLLM（後續階段，J/L-9） | server | 5 | ⚪ 未開始 | BRAIN-10 | 離線時可用 SQLite-vec 檢索；SSE 串流可用 | 規格標示第二階段；無實作 |  |
| **NPC-01** | M10 | Persona Card 資料 schema 與核心武將資料（I-1） | data | 3 | 🟡 純邏輯 | - | 核心武將 persona card 含 Core_Traits/Voice_Style/Relationship_Anchors/Safe_Fallback_Line/Golden_Lines 並過 schema 驗證 | [v7 核對 2026-10-14] NpcPersonaCard 資料結構與結構驗證（c34bd866，PROG-2-0461）與測試；無 src 呼叫端 |  |
| **NPC-02** | M10 | Context Option 情境鍵清單（長坂橋、桃園結義等） | data | 1 | ⚪ 未開始 | NPC-01 | 每位核心武將至少 3 個 contextKey 可由本地資料取得 | 無本地情境資料（僅透過中台 API 取得） |  |
| **NPC-03** | M6 | Offline Template Engine（STATIC_TEMPLATE slot filling） | logic | 3 | 🟡 純邏輯 | NPC-01 | 無中台時依模板與 slot 輸出 20~60 字台詞 | [v7 核對 2026-10-14] OfflineTemplateEngine 離線模板台詞引擎（28a43022，PROG-2-0462）與測試；PR #300 已併入；無 src 呼叫端 |  |
| **NPC-04** | M9 | Journal Reaction 日誌/晨報/派遣反應 | logic | 3 | ⚪ 未開始 | NPC-03 | 晨報與派遣結果可生成一句個性化反應 | grep Journal 在 assets 無結果（武將日誌系統亦未實作） |  |
| **NPC-05** | M9 | Utility AI 行為選擇與主動互動限流（F-1） | logic | 2 | 🟢 已接線 | NPC-01 | scoreNpcAction 五因子相乘，同登入窗只 1 則高權重互動 | 無實作 | 未開始→已接線；#1379 NpcUtilityAI 接 OfflineInteractionEvents |
| **NPC-06** | M10 | Personality Drift Guard（F-3） | logic | 2 | ⚪ 未開始 | NPC-01 | canAcceptGeneratedLine 檢查字數/現代語/未支持史實/toneTags，失敗回退 FALLBACK_LINE | 無實作 |  |
| **NPC-07** | M10 | Golden Line Set 與驗收樣本 | content | 2 | 🟡 純邏輯 | NPC-01 | 核心武將錨點台詞不可被覆蓋，附驗收樣本 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **NPC-08** | M11 | RAG Dialogue Hook 與 Unknown Event Capture（E-5/E-6） | logic | 3 | 🟡 純邏輯 | BRAIN-12, NPC-03 | 未命中情境寫入 Pending_Unknown_Events，連網時送中台 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（純邏輯）；待 QA／實機驗收 |  |
| **NPC-09** | M1 | NPC_Memory 本地 read model 與 UI 字串（H/I-2） | data | 2 | 🟢 已接線 | NPC-01 | Data.NPC_Memory 存讀檔，UI_NPC_* 字串入 i18n | i18n 無 UI_NPC_*；存檔無 NPC_Memory | 未開始→已接線；#1438 NpcMemoryReadModel 接 GameSession/PlayerSaveService |
| **NPC-10** | M11 | 生成結果回寫為可驗證摘要/可丟棄快取（K 節） | logic | 1 | ⚪ 未開始 | BRAIN-12 | 中台文字不直接當唯一真相，快取可清除 | 無實作 |  |
| **DS-14** | M0 | 存檔備份與壞檔自動退回上一份（讀檔失敗時退回最近一份有效備份） | logic | 3 | ✅ 已驗收 | DS-01 | 存檔寫入前保留上一份備份；主檔解析或驗證失敗時自動退回上一份並記錄；單元測試覆蓋壞檔與退回路徑 | [v14 核對 2026-10-21] 存檔備份與壞檔自動退回上一份（97217635，PROG-2-0885，#671）；PlayerSaveService 讀寫 _backupKey 並於讀檔失敗時退回，PlayerSaveBackup.test.ts 存在 |  |

### 3.7 7. UI 介面與視覺工程 (UI Architecture & Art Pipeline)

> 涵蓋武將資訊介面 (GDUI/GDV3)、戰場介面 (BML/BMV3)、美術資產索引、肖像裁切標準與視覺反饋。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **GDUI-01** | M10 | 六 tab 外層骨架與 route key 路由（Header/SummaryStrip/TabRail/ContentHost） | ui | 3 | 🟢 已接線 | - | 六 tab 依規格順序與 route key 切換，Default_Tab 只接受六個合法值 | assets/scripts/ui/components/GeneralDetailComposite.ts（TAB_ORDER、_switchToTab）；ui-spec screens/general-detail-unified-screen.json；順序與規格不一致 |  |
| **GDUI-02** | M10 | 將頁 Overview：身份/生命週期/名聲官職/統領軍勢/升星入口 | ui | 3 | 🟢 已接線 | GDUI-01 | Overview 顯示規格 §4 七項，升星僅在可升星角色出現，預估出征軍勢=min 三值 | assets/scripts/ui/components/general-detail/GeneralDetailOverviewChild.ts；GeneralDetailOverviewMapper.ts；character-ds3/CharacterDs3OverviewChild.ts；缺升星入口條件/出征軍勢公式測試 |  |
| **GDUI-03** | M10 | 屬頁 Stats：六色屬性、Talent/Prowess 雙層、能力評語、教官群 | ui | 3 | 🟢 已接線 | GDUI-01 | Stats 顯示六色雙層數值、評語、六位教官並支援 HIDDEN/TENDENCY/RANGE/EXACT | character-ds3/CharacterDs3StatsChild.ts（479 行）；general-detail/GeneralDetailStatsChild.ts；無專屬測試 |  |
| **GDUI-04** | M10 | 命頁左半：隱藏立繪層+14 人祖先圖+祖先 detail peek | ui | 4 | 🟢 已接線 | GDUI-01 | 三代 14 節點不被立繪遮斷，點擊開 peek，未揭露顯示鎖/問號 | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（已接線）；待 QA／實機驗收 |  |
| **GDUI-05** | M10 | 命頁右半六塊資訊欄（血脈摘要/靈獸/奧義軌/特殊因子/EP與覺醒進度/英靈卡操作） | ui | 5 | 🟢 已接線 | GDUI-04 | 六塊依固定順序渲染，英靈卡支援插入/更換/卸下/設主卡/詳情 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **GDUI-06** | M10 | StoryDock 三態（COLLAPSED/HALF/EXPANDED）抽拉與 layout reflow | ui | 3 | 🟢 已接線 | GDUI-04 | 三態切換時主血統區以 reflow 縮放且不被 overlay 覆蓋 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **GDUI-07** | M2 | 五階血脈傳承奧義邏輯：Stage_Cap/Stage_Current、名聲+事蹟點亮、升星開上限 | logic | 4 | 🟡 純邏輯 | - | 升星僅改 Stage_Cap、覺醒僅改 Stage_Current，名聲 100/300/700/1500 門檻有單元測試 | [v12 核對 2026-10-20] 武將詳情頁版本圖鑑入口（dbc8f2b2，#556）對應 GDUI-07 的 commit 標記，但五階奧義邏輯 BloodlineTransmissionUltimate 仍無 src 呼叫端，維持純邏輯。待 PM 確認該 commit 是否屬 GDUI-07 |  |
| **GDUI-08** | M8 | Lineage_Seal 譜牒印記與子孫/史實名將升星分流 | logic | 3 | ⚪ 未開始 | GDUI-07 | 史實名將吃同模板卡、子孫吃 Lineage_Seal，無規則者不顯示升星 | [v15 核對 2026-10-21] GDUI-08 前置：升星素材路由 StarUpMaterial（754c82ef，#699）與升星按鈕接線（c8a56443，#705）非印記部分已接線，有 StarUpMaterial.test.ts；譜牒印記來源待裁決（PM 2026-10-21 裁定維持本列不改） |  |
| **GDUI-09** | M2 | 命紋靈獸資料與覺醒傾向（Bloodline_Beast/Archetype/Persona_Tags/Awakening_Tendency） | data | 2 | 🟢 已接線 | - | 每個靈獸綁定原型、2~3 人格標籤、覺醒傾向並可由 ui 讀取 | [v11 核對 2026-10-20] 命紋靈獸暫定清單與 cc 摘要接線（02515484，PROG-2-0720）；BloodlineBeast 由 LobbyScene 呼叫，測試存在 |  |
| **GDUI-10** | M10 | 技頁 Tactics：已習得/可習得/未解鎖三態與戰法詳情 | ui | 3 | 🟢 已接線 | GDUI-01 | 三態以彩色/半透明/灰階顯示，含等級、TP、類型 | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（已接線）；待 QA／實機驗收 |  |
| **GDUI-11** | M8 | 寶頁 Equip：2x3 裝備格、傳家寶、道具摘要、評價 | ui | 3 | 🟢 已接線 | GDUI-01 | 六格 WEAPON/HEAD/BODY/BOOTS/ACCESSORY_A/B 與傳家寶顯示，不含英靈卡/虎符 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **GDUI-12** | M5 | 兵頁 Aptitude：兵種/地形/天氣適性+虎符槽與摘要 | ui | 4 | 🟢 已接線 | GDUI-01 | 適性三表與虎符槽可裝備/替換/卸下，BATTLE_LOCKED 時不可更換 | general-detail/GeneralDetailAptitudeChild.ts；general-detail/TigerTallyComposite.ts、TigerTallyPanel.ts；CharacterDs3AptitudeChild 為空殼 |  |
| **GDUI-13** | M10 | Data Read Model 映射層與資訊揭露四階/NO_DATA 狀態 | logic | 3 | 🟢 已接線 | GDUI-01 | §10 全部欄位有 mapper，HIDDEN/TENDENCY/RANGE/EXACT/NO_DATA 不填假資料 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **GDUI-14** | M0 | 人物頁 ui-spec 契約與驗證（layout/skin/screen/content schema） | test | 2 | 🟢 已接線 | - | validate-ui-specs 通過六 child panel 必要模組 | tools_node/validate-ui-specs.js；tests/ucuf/validateUiSpecsCli.test.ts；contracts/general-detail-content.schema.json；Layout Contract §11 模組未逐項驗證 |  |
| **GDV3-01** | M10 | 日常人物頁 v3 layout：gd-root-frame/左立繪載體/右資訊卡/故事帶 | ui | 3 | 🟢 已接線 | - | layout JSON 依四大容器渲染且通過 ui-spec 驗證 | assets/resources/ui-spec/layouts/general-detail-unified-main.json、general-detail-bloodline-v3-main.json；screens/general-detail-bloodline-v3-screen.json |  |
| **GDV3-02** | M10 | gd-attribute-grid：Prowess 主顯+Talent 印章資質層 | ui | 2 | 🟢 已接線 | GDV3-01 | 同時顯示 Prowess 與 Talent 兩層數值 | character-ds3/CharacterDs3StatsChild.ts；無測試 |  |
| **GDV3-03** | M10 | gd-nameplate/gd-role-card/gd-trait-card 資訊模組 | ui | 2 | 🟢 已接線 | GDV3-01 | 名牌、定位、特質卡三模組可顯示 | character-ds3/CharacterDs3OverviewChild.ts；GeneralDetailOverviewVisuals.ts |  |
| **GDV3-04** | M10 | gd-bloodline-card 與 gd-bloodline-crest 靜態徽記 | ui | 2 | 📄 僅資料 | GDV3-01 | 血脈卡顯示命紋徽記 sprite，不使用直白獸首 icon | sprites/ui_families/general_detail/formal/crest_face_formal.png；CharacterDs3BloodlineChild 空殼 |  |
| **GDV3-05** | M10 | 6 格故事帶 story-strip-rail 與 story-cell-01~06 slot | ui | 3 | 📄 僅資料 | GDV3-01 | 六格固定 slot 讀 storyStripCells 並依六段節奏顯示 | GeneralUnit.ts storyStripCells、defaultTab 欄位；UI 節點未見實作 |  |
| **GDV3-06** | M10 | 六格故事節奏內容（早年/入世/功績/命運/血脈真相/延續）撰寫 | content | 5 | 📄 僅資料 | - | 名將故事六格文案符合節奏並通過 schema | GeneralUnit.storyStripCells 型別；generals.json 實際故事格內容比例未驗 |  |
| **GDV3-07** | M10 | 命紋徽記 family 與背景 motif 資產（crest family）production | content | 5 | ⚪ 未開始 | GDV3-04 | 徽記可 family 化並與色彩因子一致 | 僅 crest_face_formal.png 一張；無 crest family |  |
| **GDV3-08** | M10 | 可行性邊界守則：日常頁排除長駐血脈虛影/強發光/跑馬燈 | test | 1 | ⚪ 未開始 | GDV3-01 | 審查清單確認日常頁無被排除的效果 | 無自動檢查 |  |
| **HUM-01** | M9 | GeneralUnit 擴充 personality/loyalty/recentLog/currentSuitability 資料模型 | data | 2 | ⚪ 未開始 | - | 四個選填欄位進型別與 generals schema 並向下相容 | grep personality\|loyalty 於 assets/scripts/core/models/GeneralUnit.ts 無結果 |  |
| **HUM-02** | M10 | 性格圖騰四型 icon family 與 Header 徽章（義綠/豪紅/睿藍/貪紫） | ui | 3 | ⚪ 未開始 | HUM-01 | Header 緊鄰職能標籤顯示對應顏色圓徽與提示文案 | 無 |  |
| **HUM-03** | M9 | 性格驅動離線行為規則（尋訪/喝酒/內政/遊歷） | logic | 4 | ⚪ 未開始 | HUM-01 | 四性格依規格觸發對應晨報行為，有單元測試 | 無 |  |
| **HUM-04** | M9 | 忠誠度條 UI 與來源鎖定（轉蛋 100 鎖） | ui | 3 | ⚪ 未開始 | HUM-01 | 非轉蛋武將顯示 0~100 條，<60 橙、<30 紅，轉蛋顯示鎖定 100 | 無 |  |
| **HUM-05** | M9 | 忠誠度系統邏輯與沒收虎符 -30 提示 | logic | 3 | ⚪ 未開始 | HUM-04 | 沒收虎符彈提示並扣 30，低忠誠觸發下野/被勸降 | 無 |  |
| **HUM-06** | M9 | GeneralJournalPeek 日誌氣泡與完整生平實錄彈窗 | ui | 4 | ⚪ 未開始 | HUM-01 | 氣泡顯示時間戳+動作，點擊開生平彈窗 | 無 |  |
| **HUM-07** | M9 | 任務適合度 Suitability Badge 與大廳任務牆跳轉 | ui | 3 | ⚪ 未開始 | HUM-01 | 自告奮勇+50% 任務顯示自薦徽章並可跳轉 | 無（依賴大廳任務牆） |  |
| **GDART-01** | M10 | 共用骨架節點命名固定（Overlay/PopupBody/HeaderPanel/SummaryStrip/TabBar/ContentFrame/FooterPanel） | ui | 2 | 🟢 已接線 | - | 節點名與 GeneralDetailPanel 查找路徑一致 | assets/resources/ui-spec/layouts/general-detail-main.json；GeneralDetailComposite.ts 使用 RightTabBar/ContentSlot 等；與清單命名不完全一致 |  |
| **GDART-02** | M10 | bg_ink_main 不對稱九宮格背景延展 | ui | 1 | 🟢 已接線 | - | 左右 border 保留立繪留白與山景，禁 simple 縮放 | assets/resources/ui-spec/skins/general-detail-default.json；ui-spec/placeholders/bg_ink_detail |  |
| **GDART-03** | M10 | 通用 panel 框體 variants 與 popup_card_bg 九宮格統一 | content | 2 | 🟢 已接線 | - | header/section/footer 共用同一九宮格邊界 | assets/resources/sprites/common/popup_card_bg（依清單進度補充，現況未逐檔驗證） |  |
| **GDART-04** | M10 | frame/bleed/fill/accent 分層 slot 家族 32 個 skin slot 落地 | content | 8 | 📄 僅資料 | GDART-03 | general-detail-default 含 32 個分層 slot 並以 fill->bleed->frame->content 渲染 | skins/general-detail-default.json 現僅相容期單層 slot；skinLayers 測試 tests/ucuf/skinLayers.test.ts 為通用框架 |  |
| **GDART-05** | M10 | 六頁 tab icon（idle/active 兩態）production 與接線 | content | 4 | ⚪ 未開始 | GDART-01 | 六個 tab icon 兩態齊備且按鈕尺寸不變 | assets/resources/sprites/ui/general-detail 目錄不存在 |  |
| **GDART-06** | M10 | Row icon 家族（約 25 個）production 與命名 | content | 6 | ⚪ 未開始 | GDART-05 | §6.2 清單 icon 全數存在 spriteFrame 並可載入 | assets/resources/sprites/ui/general-detail 目錄不存在 |  |
| **GDART-07** | M10 | 頁籤按鈕 normal/pressed/disabled 狀態圖與 44x44 觸控區 | ui | 2 | 📄 僅資料 | GDART-05 | 三態視覺齊備且觸控區≥44x44 | GeneralDetailComposite.ts tab 按鈕；無視覺驗收 |  |
| **GDART-08** | M10 | 底部操作區 BtnClose 與預留 BtnCompare/Favorite/Lock 節點 | ui | 1 | 📄 僅資料 | GDART-01 | 僅 BtnClose 啟用，其餘節點保留 inactive | layouts/general-detail-main.json 是否含預留節點未逐項核對 |  |
| **GDART-09** | M6 | GeneralPortraitPanel 全幅立繪面板（RAW 尺寸、Overflow 保護、Texture2D fallback） | ui | 4 | 🟢 已接線 | - | 抽卡/圖鑑可開全幅立繪，不變形且文字不被壓縮 | layouts/general-portrait-main.json；screens/general-portrait-screen.json；skins/general-portrait-default.json |  |
| **GDART-10** | M0 | 美術接線交付檢查（節點名/icon 兩態/鎖定樣式/手機觸控）自動化 | test | 3 | 🟡 純邏輯 | GDART-01 | validate-ui-specs 可檢查節點名與 icon 槽位 | tools_node/validate-ui-specs.js 通用檢查；清單 §7 五項未自動化 | 僅資料→純邏輯；#1298 ArtWiringIcons 僅測試，無 src 呼叫端 |
| **GDART-11** | M10 | 人工視覺驗證：tabbar/summary ornament 密度實機比例 | test | 2 | ⚪ 未開始 | GDART-04 | 實機截圖審查通過 | 清單自述『未完成』 |  |
| **PC-01** | M11 | PersonaCard schema（general_persona_v2）與輸出契約 | data | 2 | ⚪ 未開始 | - | persona-card.response.json schema 驗證通過 | find 無 *persona* schema；僅 scratch/vector-ready-sima-yi/vector-records.persona.jsonl 實驗檔 |  |
| **PC-02** | M11 | build_persona_cards.py 骨架：讀 generals.json、events.jsonl、keyword pack | tool | 3 | ⚪ 未開始 | PC-01 | 可對單一/全部武將輸出 {id}.persona.json、index、summary.md | server/npc-brain/pipelines/sanguo-rag/build_persona_cards.py 不存在 |  |
| **PC-03** | M11 | 事件過濾規則（ready、排除 alias-smoke、排除 fixture-only、需含目標武將） | logic | 1 | ⚪ 未開始 | PC-02 | 四條過濾規則各有測試 | 無 |  |
| **PC-04** | M11 | 欄位生成與去重排序（relationshipAnchors/keywordAnchors≤12/moodAnchors/evidenceRefs） | logic | 3 | ⚪ 未開始 | PC-02 | 欄位生成順序與規格表一致 | 無 |  |
| **PC-05** | M11 | derive_generic_traits 推導與 generic taboos/llmPromptRules | logic | 2 | ⚪ 未開始 | PC-02 | str>=80、int>=85 等規則與保底有單測 | 無 |  |
| **PC-06** | M11 | PERSONA_PRESETS 與 CORE_REVIEW_GENERAL_IDS 六核心名將人工審查 | content | 3 | ⚪ 未開始 | PC-02 | 張飛/關羽/趙雲/劉備/曹操/諸葛亮 preset 完成並 manualReviewRequired=true | 無 |  |
| **PC-07** | M11 | gold_seed_registry 與 changban-bridge gold seed 事件 | data | 2 | ⚪ 未開始 | PC-03 | changban-bridge 可經通用抽取器產出 battle cluster | find gold_seed_registry 無結果 |  |
| **PC-08** | M11 | edgeConfidence/edgeStrength 分離與 relationship edge 模型 | data | 1 | ⚪ 未開始 | PC-04 | edge 同時含兩欄位且 strength 可空 | 無 |  |
| **PC-09** | M11 | 通用事件抽取器 generic-battle-candidate-v1 與 review queue（pending/accepted/rejected） | tool | 6 | ⚪ 未開始 | PC-03 | candidate 預設 needs-review，不直接入正式 persona | 無 |  |
| **PC-10** | M11 | keyword pack 投影（build_keyword_options） | tool | 3 | ⚪ 未開始 | PC-09 | 由 accepted events 產出 {generalId}.keywords.json | 無 |  |
| **PC-11** | M11 | Persona Card API 與 Cocos 接線（events->keyword->persona->API->Cocos） | server | 4 | ⚪ 未開始 | PC-04 | 客戶端可讀 persona card 並顯示 | server/src 內無 persona 相關 |  |
| **PC-12** | M11 | LLM proposer/renderer 接入（Gemini/Ollama/vLLM）與 schema gate 驗證 | server | 6 | ⚪ 未開始 | PC-11 | LLM 只提案不定案，無 evidence 不生成 | 無 |  |
| **BML-01** | M10 | 共用 layout/skin：bloodline-mirror-loading-main + default（五大模組） | ui | 3 | 🟢 已接線 | - | StateBadge/MirrorHeader/CenterStage/TipPanel/ActionRow/StoryStrip 渲染通過驗證 | assets/resources/ui-spec/layouts/bloodline-mirror-loading-main.json；skins/bloodline-mirror-loading-default.json；LobbyScene.ts 預覽掛載 |  |
| **BML-02** | M10 | loading 與 awakening screen JSON 與 content.source 綁定 | ui | 2 | 🟢 已接線 | BML-01 | 兩 screen 讀 bloodline-mirror-states-v1 的對應 state | screens/bloodline-mirror-loading-screen.json、bloodline-mirror-awakening-screen.json |  |
| **BML-03** | M10 | 四 state 內容契約（loading/awakening/ascension/unowned-preview）與 schema | data | 2 | 📄 僅資料 | BML-01 | validate-ui-specs --check-content-contract 通過 | content/bloodline-mirror-states-v1.json；contracts/bloodline-mirror-state-content.schema.json；tests/ucuf/validateUiSpecsCli.test.ts（通用） |  |
| **BML-04** | M10 | 升星/二轉 ascension 與 unowned-preview 獨立 screen | ui | 2 | 📄 僅資料 | BML-02 | 升星與未持有預覽可由 screen 路由進入 | 僅有 state 內容；無 ascension/unowned screen JSON |  |
| **BML-05** | M10 | Loading 流程實際接線：場景切換顯示命鏡並輪播角色 | ui | 3 | 📄 僅資料 | BML-02 | 場景切換時顯示命鏡 Loading，可輪播含未持有角色 | core/config/UIConfig.ts UIID.BloodlineMirrorLoading 已登記；LoadingScene.ts 未使用命鏡；僅 LobbyScene 預覽 |  |
| **BML-06** | M10 | 覺醒/升星成功過場觸發（升星、二轉、血脈卡啟動） | logic | 3 | ⚪ 未開始 | BML-04 | 升星/覺醒成功事件觸發過場並回到流程 | UIConfig 有 awakening prefab 登記；無事件觸發 |  |
| **BML-07** | M10 | 未持有角色展示規則（未結識/命格未開/尚未得其英靈 badge，不劇透數值） | ui | 2 | 📄 僅資料 | BML-04 | 未持有狀態顯示三種標示且隱藏數值 | states-v1 unowned-preview state 文案；無 runtime 驗證 |  |
| **BML-08** | M10 | 左右雙人物大圖 production（表象面/血脈面）與中線漸層 | content | 8 | ⚪ 未開始 | - | 代表武將具備左右雙圖且中線自然滲透 | 無雙面立繪資產 |  |
| **BML-09** | M10 | 命鏡裂隙/定心者/稀有度 aura 靜態資產 | content | 5 | ⚪ 未開始 | - | 命鏡門、定心者與 aura 色齊備，不似 generic portal | sprites 中無 mirror 資產 |  |
| **BML-10** | M10 | 5 格命運故事帶圖 production 與（可選）極慢橫移 | content | 8 | ⚪ 未開始 | - | 代表角色 5 格故事圖齊備可讀 | 無 |  |
| **BML-11** | M10 | 國際化 motif layer 可替換與視覺禁區審查 | test | 2 | ⚪ 未開始 | BML-08 | 替換配色/符號後骨架成立，禁區清單審查通過 | 無 |  |
| **BMV3-01** | M10 | mirror-* 15 個元件節點拆分（root-frame 至 confirm-cta） | ui | 4 | 🟢 已接線 | - | 15 個元件在 layout 中有穩定節點名 | layouts/bloodline-mirror-main.json；skins/bloodline-mirror-default.json（元件逐項對照未核） |  |
| **BMV3-02** | M10 | 五種 state 變體（含 owned-legendary）CTA/tips/英靈亮度/aura/badge 差異 | ui | 3 | 📄 僅資料 | BMV3-01 | 五 state 切換時五項差異正確 | content/bloodline-mirror-states-v1.json 僅四 state，缺 owned-legendary |  |
| **BMV3-03** | M10 | 稀有度 aura 色映射（金/紫/藍/銀白）接到 mirror-rarity-aura | ui | 1 | ⚪ 未開始 | BMV3-01 | 各 rarity 顯示對應 aura 色 | UIRarityMark.ts 為通用稀有度標記，未接 mirror |  |
| **BMV3-04** | M10 | 低頻動效：命鏡霧化、定心者呼吸光、英靈邊緣淡閃（tween/opacity/additive） | ui | 3 | ⚪ 未開始 | BMV3-01 | 三種動效低頻運作且不影響閱讀 | 無 |  |
| **BMV3-05** | M10 | 右側英靈角色圖 production（同一名將、命紋/光痕） | content | 8 | ⚪ 未開始 | - | 代表武將英靈圖齊備且仍可辨識為同一人 | 無 |  |
| **BMV3-06** | M10 | 5 格故事圖 production 與命紋/徽記/aura 一致性 | content | 6 | ⚪ 未開始 | BMV3-05 | 故事圖與 aura、徽記風格一致 | 無 |  |
| **BMV3-07** | M10 | mirror-lock-badge / mirror-unowned-state-tag / mirror-confirm-cta 元件接線 | ui | 2 | 📄 僅資料 | BMV3-02 | 未持有顯示鎖定 badge，覺醒顯示 CTA | states-v1 欄位 PrimaryActionButton；元件接線未驗 |  |
| **BVC-01** | M10 | 正式視覺契約文件 bloodline-sigil-and-beast-contract-v1 落檔 | content | 2 | ⚪ 未開始 | - | 契約文件存在並列出因子-紋樣-材質-靈獸對照 | artifacts/ui-qa/UI-2-0054 不存在 |  |
| **BVC-02** | M10 | 六色因子對應紋樣/材質/靈獸 family 對照表（資料化） | data | 3 | ⚪ 未開始 | BVC-01 | 六色各有固定紋樣、材質、靈獸 family 的 JSON | 無 |  |
| **BVC-03** | M10 | 共用 crest 語言：角色頁/血統樹/血脈卡/英靈虎符/特種軍隊統一元件 | ui | 5 | 📄 僅資料 | BVC-02 | 五處使用同一組 crest sprite 與命名 | assets/resources/sprites/ui_families/general_detail/formal/crest_face_formal.png；LoadingScene EliteTroopCodex 有 SelectedTroopCrestArt |  |
| **BVC-04** | M10 | 禁區守則（無科技 DNA/HUD/實驗室）美術審查清單 | test | 1 | ⚪ 未開始 | - | 審查清單用於所有血脈美術 | 無 |  |
| **BVC-05** | M10 | 虎符/英靈卡/特種軍隊視覺對應（UI-2-0064） | content | 4 | ⚪ 未開始 | BVC-03 | 三類卡面採同一 crest 規則 | 無 |  |
| **BSS-01** | M10 | slot 契約文件 bloodline-symbol-slot-contract-v1 落檔 | content | 1 | 📄 僅資料 | - | 契約列出主/副/延伸共 8 種 slot 定義 | artifacts/ui-qa/UI-2-0054 不存在 | 未開始→僅資料；#1299 契約文件落檔（docs） |
| **BSS-02** | M10 | 男武將/女武將 prompt 模板回灌 slot 規則 | content | 3 | ⚪ 未開始 | BSS-01 | 兩份模板含 slot 與落地原則 | 無 |  |
| **BSS-03** | M10 | male/female/bloodline 三類 slot-map compare board | content | 3 | ⚪ 未開始 | BSS-02 | 三類 compare board 可供審查 | 無 |  |
| **BSS-04** | M10 | slot 與 UI crest/badge/icon/虎符兵牌對應表 | data | 2 | ⚪ 未開始 | BSS-01 | 對應表 JSON 覆蓋全部 slot | 無 |  |
| **BSS-05** | M10 | 核心武將立繪套用 slot 並驗收（血脈面不得恐怖裂痕） | content | 8 | ⚪ 未開始 | BSS-02 | 核心武將立繪皆含主 slot，審查通過 | 無 |  |
| **DS-14** | M0 | 存檔備份與壞檔自動退回上一份（讀檔失敗時退回最近一份有效備份） | logic | 3 | ✅ 已驗收 | DS-01 | 存檔寫入前保留上一份備份；主檔解析或驗證失敗時自動退回上一份並記錄；單元測試覆蓋壞檔與退回路徑 | [v14 核對 2026-10-21] 存檔備份與壞檔自動退回上一份（97217635，PROG-2-0885，#671）；PlayerSaveService 讀寫 _backupKey 並於讀檔失敗時退回，PlayerSaveBackup.test.ts 存在 |  |
| **FBR-12** | M6 | 因子揭露順序改照因子爆發系統 §K（FACTOR_DISCOVERY_LEVEL 綠 20→1、紅 45→20，代表色改白） | logic | 1 | 🟢 已接線 | - | 揭露門檻依 §K 推導，DiscoveryThresholds/FactorAwakening 讀同一門檻 | PROG-2-1465（#1276，ed52892e）；工時為估計值 | 新增列（協調線指示）；來源卡 PROG-2-1465；已接線 |
