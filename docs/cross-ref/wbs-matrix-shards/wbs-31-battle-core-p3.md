# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.1 戰鬥核心（3/7）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.1 戰鬥核心（3/7）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.1 1. 戰鬥核心系統 (Battle Core) · 第 3/7 段

> 續上段（表頭重複）。工作包 GRD-05 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **GRD-05** | M10 | 格子視覺層：VFX/Decal 掛載使同邏輯多表現（毒沼/火海） | ui | 3 | 🟡 純邏輯 | GRD-01 | 同一 Hazard 邏輯可切換 fire/poison 兩套 Decal+VFX 且不改邏輯 | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（純邏輯）；待 QA／實機驗收 |  |
| **SPV-01** | M10 | 英靈虎符視覺契約文件落地（spirit-tally-and-elite-troop-contract-v1） | content | 1 | ⚪ 未開始 | - | 契約文件存在於 repo 並被兵種/人物頁規格引用 | 補遺引用 artifacts/ui-qa/UI-2-0054/spirit-tally-and-elite-troop-contract-v1.md；repo 內未驗證存在（artifacts 目錄非追蹤範圍） |  |
| **SPV-02** | M10 | 每位核心名將四件組：本體血脈 slot、英靈卡形象、英靈虎符 crest、特種軍隊旗紋/兵牌 | content | 5 | ⚪ 未開始 | SPV-01 | 首批核心名將資料表含四欄且資源存在 | 無（grep crest/bloodline crest family 無對應資料） |  |
| **SPV-03** | M10 | 特種軍隊造型回收 bloodline crest family（旗紋/兵牌/武器細節） | content | 4 | ⚪ 未開始 | SPV-02 | 軍隊美術引用同一 Sigil_Pattern_ID | 無 |  |
| **SPV-04** | M9 | 血脈卡/英靈卡 → 英靈虎符的資料與 UI 鏈（名將→血脈卡→虎符→軍隊） | ui | 3 | 📄 僅資料 | SPV-02 | 人物頁可從英靈卡進入虎符與軍隊，三者同一血脈標識 | assets/resources/ui-spec/screens/spirit-tally-detail-screen.json、tiger-tally-detail-panel-screen.json；資料鏈未串 |  |
| **SPV-05** | M10 | 後續任務卡 UI-2-0061/0062/0063（趣聞內容層、重複卡分流與血脈灌注、命鏡 Loading 文案） | content | 5 | ⚪ 未開始 | SPV-04 | 三張任務卡各自驗收 | 補遺列為後續任務；本組未見對應檔案 |  |
| **LVL-01** | M7 | 連環破主鏈資料（Stage_ID/Chain_ID/Boss/Theme/Required_Loadout/Preview_Intel）與前置解鎖 | data | 3 | 🟢 已接線 | - | 關卡節點表含六欄，典韋→許褚→曹操鏈順序解鎖可測 | StageChainNodes 被 BattleSceneLoader 匯入 | [v17.2 更正 2026-11-07] 純邏輯→已接線；原註記「無 src 呼叫端」已過時 |
| **LVL-02** | M5 | 關卡進度與解鎖狀態存檔（連環破進度） | logic | 2 | ✅ 已驗收 | LVL-01 | 完成前置關後下一關解鎖並持久化 | [v4 核對 2026-10-13] StageChainProgress.ts 通關進度存檔與連環破順序解鎖（PROG-2-0214/0215）；tests/StageChainProgress.test.ts 通過 |  |
| **LVL-03** | M7 | 戰前偵查面板（Enemy_Name/Core_Mechanic/Risk_Tags/Recommended_Loadout_Check 四塊，不揭露站位） | ui | 4 | 🟡 純邏輯 | LVL-01 | 進關前顯示四塊資訊，Formation_Preview 不出現 | LoadoutCheck 戰前三態檢核接線（PROG-2-1763，#1652）；d1a-rejudge 關卡設計 D-1~D-3 | [v17.2 更正 2026-11-07] 未開始→純邏輯；偵查面板欄位（Core_Mechanic／Risk_Tags）是否齊備未逐項核 |
| **LVL-04** | M7 | Recommended_Loadout 三態檢核（已具備/缺少/高風險）與『高風險仍可挑戰』 | logic | 3 | 🟢 已接線 | LVL-03 | 依當前 loadout（非收藏）計算三態，缺口時不鎖死 | LoadoutCheck 被 BattleSceneLoader、BattleUIBridge 匯入；PROG-2-1763（#1652） | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **LVL-05** | M7 | 戰法槽位容量（智力/培育/關卡）與關卡推薦對策槽位數 | logic | 3 | 🟡 純邏輯 | LVL-04 | 槽位數 = f(智力,培育,關卡等級)，關卡寫明推薦槽數 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（純邏輯）；待 QA／實機驗收 |  |
| **LVL-06** | M7 | 軍師 HUD 四摘要欄（Theme_Hazard/Interactive_Object_Status/Stage_Salvage_Summary/Recommended_Loadout_Gap） | ui | 4 | 🟢 已接線 | LVL-03, LVL-08 | HUD 顯示四欄且不洩漏埋伏點與 AI 路徑 | StrategistHud／StrategistHudSource 經 BattleUIBridge 接進戰場；PROG-2-1851（#1758） | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **LVL-07** | M10 | 特殊戰場視覺四層（背景/棋盤Decal/立牌VFX/HUD）與棋盤提示語言 | ui | 5 | 📄 僅資料 | GRD-05 | 四層可獨立替換；落石/營帳/陷阱不畫死背景；關鍵格微光低於 HUD | assets/resources/data/scene-backgrounds.json；battle/shared/BattleSceneMode.ts；分層與 Decal 未見 |  |
| **LVL-08** | M7 | Interactive_Object 四類（Rockfall_Node/Floodgate/Camp_Target/Trap_Cluster）與擊破/觸發狀態 | logic | 4 | 📄 僅資料 | GRD-01 | 四類物件可被擊破或觸發並產生狀態 | battle/shared/BattleTacticBehavior.ts 以 setTileEffect 建 hazard-rock/night-raid camp；無 Interactive_Object 抽象 |  |
| **LVL-09** | M8 | Stage_Salvage 戰後結算（石材/木材/補給/情報，一次結算入經濟） | logic | 3 | 🟢 已接線 | LVL-08 | 戰鬥結束一次彙總 Salvage 並寫入戰後摘要，戰中不改帳號經濟 | 無（grep Salvage 無結果） | 未開始→已接線；#1462 StageSalvage 接 BattleTileEffectPhase |
| **LVL-10** | M7 | 四主題關卡內容（峽谷落石/水淹圍堵/夜襲掠奪/森林埋伏）各含主互動物件與收益 | content | 8 | 📄 僅資料 | LVL-08, LVL-09 | 四主題各一關可玩，標示主要互動物件與可回收收益 | encounters.json 僅 1 場；BattleTacticBehavior.ts 有 hazard-rock/river-current/night-raid/ambush-field 場景戰法雛形 |  |
| **LVL-11** | M7 | Boss AI：主將血量<50% 召喚親衛隊（呂布、曹操） | logic | 3 | 🟢 已接線 | LVL-01 | HP 降至 50% 觸發一次親衛隊召喚，測試覆蓋 | BossGuardSummon 被 BattleEnemyDeployPhase 匯入；PROG-2-1862（#1769） | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **LVL-12** | M10 | 攝影機固定 2.5D 斜視角與 UI 安全區 | ui | 2 | 🟢 已接線 | - | 各主題關卡共用固定鏡頭，棋盤不被 HUD 遮擋 | battle/views/BattleScene.ts 固定鏡頭（未逐項驗收）；規格 H 節 |  |
| **LVL-13** | M9 | 軍師演武模式與釋放敵將頓悟捷徑門檻（Q50=D） | logic | 3 | ⚪ 未開始 | LVL-01 | 待 Q50 選項 D 內容明確後驗收 | 無；規格僅在 MCQ 記錄出現 | [v17.2 更正 2026-11-07] 待裁決：演武模式與頓悟捷徑門檻（Q50=D）規格僅見於 MCQ 記錄 |
| **TAC-01** | M7 | 統一戰法請求/結果契約 BattleSkillRequest / SkillExecutionResult + shared contract | logic | 2 | 🟢 已接線 | - | 五種來源皆可轉成同一 BattleSkillRequest，型別於 shared 被 Battle/UI 共用 | assets/scripts/shared/SkillRuntimeContract.ts；tests/BattleSkillExecutor.test.ts（未能本地執行） |  |
| **TAC-02** | M7 | 五來源轉譯器 Seed/Bloodline/Mentor/Scene/TigerTally Adapter | logic | 3 | 🟢 已接線 | TAC-01 | 每個來源至少 1 個 integration test 通過，tacticSlots 可轉 request | assets/scripts/battle/skills/adapters/*.ts（6檔）；tests/BattleSkillSourceTranslator.test.ts |  |
| **TAC-03** | M7 | P0 傷害投射包 TDIR/TLINE/TFAN（單體/直線/扇形/falloff/穿甲） | logic | 4 | 🟢 已接線 | TAC-01 | unit test 驗各 targetMode 命中集合與倍率 falloff；施放到扣血整合通過 | assets/scripts/battle/skills/resolvers/ProjectedDamageSkillResolver.ts、BattleSkillDamageResolver.ts、BattleSkillTargetSelector.ts；tests/BattleSkillDamageResolver.test.ts、BattleSkillTargetSelector.test.ts |  |
| **TAC-04** | M7 | P0 增益續航包 TBUFF/THEAL/TDEBUFF（Buff/治療/DOT/緩速/刷新覆蓋） | logic | 3 | 🟢 已接線 | TAC-01 | unit test 驗刷新/覆蓋與回合 tick；醫療公式 25% 已損HP 正確 | assets/scripts/battle/skills/resolvers/BuffDebuffSkillResolver.ts、HealSkillResolver.ts；tests/BattleSkillExecutor.test.ts |  |
| **TAC-05** | M7 | P1 棋盤控制包 TMOVE/TPUSH/TTILE（衝刺/擊退/火海/水域/落石/阻擋） | logic | 4 | 🟢 已接線 | TAC-01 | unit test 驗 path/blocker/tile tick；移動到地格觸發傷害 | assets/scripts/battle/runtime/phases/BattleTileEffectPhase.ts、BattleTileBuffLifecycleManager.ts、BattleController（hazard-fire/river-current/hazard-rock，規格自述）；assets/resources/data/tile-buffs.json |  |
| **TAC-06** | M7 | P1 反應連鎖包 TLINK/TCOUNTER/TRESET（連環計/幼麒天算/威震華夏原型） | logic | 4 | 🟢 已接線 | TAC-03 | damage-link 50% 共享、近戰反擊+Weak、首擊雙倍+擊殺再行動 各有 trigger 測試 | assets/scripts/battle/skills/resolvers/LinkSkillResolver.ts、CounterSkillResolver.ts、ResetSkillResolver.ts；BattleCombatResolver.tryTriggerCounterReaction |  |
