# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.6 數值架構底層（3/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.6 數值架構底層（3/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.6 6. 數值、架構與底層支援 (Formula, Architecture & Backend) · 第 3/4 段

> 續上段（表頭重複）。工作包 GDP-10 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **GDP-10** | M0 | 管線工具測試與 CI 整合 | test | 2 | 🟢 已接線 | GDP-03, GDP-04 | ingest→merge→validate 以 fixture 跑端到端並進 compute-gate | 規格見 doc_spec_0343；GDP-10 管線端到端測試（afe1be5d，#449）；CI 閘門整合協定定案 | [v18.1 更正 2026-11-07] 純邏輯→已接線；規格 doc_spec_0343 定案 |
| **NUM-01** | M7 | 武將化身單挑 ATK/暴擊/閃躲公式（E-11/E-14） | logic | 1 | ✅ 已驗收 | - | FormulaSystem 單測涵蓋 ATK(STR×0.7+LEA×0.3)、crit(上限50%)、dodge(上限40%) | assets/scripts/core/systems/FormulaSystem.ts；tests/FormulaSystem.test.ts（crit/dodge/攻擊力共約8案） |  |
| **NUM-02** | M7 | 單挑接受判定與拒絕懲罰（score≥0.58） | logic | 1 | 🟢 已接線 | NUM-01 | score=0.45HP+0.35兵力+0.2戰力，≥0.58接受；拒絕全軍攻防與HP減半有測試 | [v17.3 更正 2026-11-07] 純邏輯→已接線；assets/scripts/core/systems/AiDuelDecision.ts、DuelAcceptanceRules.test.ts 通過；已由 doc_spec_0314 確立權威規格 |  |
| **NUM-03** | M7 | 主傷害公式完整乘區（剋制×地形×天氣×兵種適性×general_buff，E-3/F-1） | logic | 3 | 🟢 已接線 | NUM-04 | calculateDamage 納入天氣、兵種適性效率、general_buff，並與規格表數值對照測試 | [v6 核對 2026-10-14] 兵種剋制五角與機械 ×1.5（4fa7790c，PROG-2-0341）；主傷害乘區（地形×天氣×適性）既有接線；完整公式未逐項核對 |  |
| **NUM-04** | M0 | 數值常數集中化 NumericalConfig JSON + FormulaRegistry（I 節） | data | 3 | 🟢 已接線 | - | Counter/Aptitude/Age/Reincarnation/Ult/Tally 常數集中配置，支援熱更新與邊界保護 | 已由 doc_spec_0338 確立全域數值常數庫結構與公式註冊中心協定 | [v18.0 更正 2026-11-07] 純邏輯→已接線；規格 doc_spec_0338 定案 |
| **NUM-05** | M5 | 兵種剋制表與適性等級修正表（E-4/E-5，含粉色因子→適性轉換） | logic | 2 | 🟢 已接線 | NUM-04 | S~D 的攻防/移動/命中修正與 0.8~1.2 效率可查，粉因子★→適性、≥5同適性升級有測試 | [v3 核對 2026-10-13] BattleAptitude.ts 適性表（攻防/移動/命中）＋ TROOP_COUNTER_MAP；戰場 BattleCombatResolver 使用 |  |
| **NUM-06** | M2 | EP 爆發力計算（E-8/F-2：共鳴/異脈/契合/精力/天命波動） | logic | 2 | 🟢 已接線 | NUM-04 | calculateEP 五項條件各有單測，14人祖譜輸入結果符合規格 | [master fb02ff9 重估] BreedingSystem.ts EP 公式 |  |
| **NUM-07** | M1 | 精力經濟：消耗/回復/上限/補元散（E-2/E-7/F-3） | logic | 3 | 🟢 已接線 | NUM-04 | 戰鬥-30、結緣男-50女-100、入學-20、奧義Ult×10、季度回補與補元散有單測，並與 MCQ Q45/Q46 對齊 | [v3 核對 2026-10-13] BattleRoster 戰鬥精力消耗與季度回復（BATTLE_VITALITY_COST、VITALITY_RECOVER_*）；VitalityCap.ts 上限 |  |
| **NUM-08** | M1 | 年齡階段倍率、壽命與死亡率（E-6） | logic | 2 | ✅ 已驗收 | NUM-04 | AGE_MODIFIER 六階段與壽命/超齡死亡率/每季+0.25歲有單測 | [v9 核對 2026-10-15] GeneralAging 與 GeneralGrowth 測試（GeneralAging.test.ts、GeneralGrowth.test.ts，PROG-2-0424）；GeneralAging 有 28 處呼叫端 |  |
| **NUM-09** | M7 | 轉生屬性上限與奧義 Base Power/精力消耗（E-6） | logic | 2 | 🟢 已接線 | NUM-04, NUM-07 | REINCARNATION_CAP 與 ult_damage=base×(1+lv×0.15)×stat_mod 有單測 | 規格見 doc_spec_0341；轉生五階上限突破、奧義傷害乘區與精力階梯消耗定案 | [v18.1 更正 2026-11-07] 僅資料→已接線；規格 doc_spec_0341 定案 |
| **NUM-10** | M7 | 戰法 TP 消耗表與綠因子半價（E-9） | data | 1 | 🟢 已接線 | NUM-04 | 28 個戰法 TP 與規格表一致，持有綠因子時 final_TP=max(10, floor(base×0.5)) | 規格見 doc_spec_0344；28 條戰法 TP 消耗階梯與綠因子 50% 減免定案 | [v18.2 更正 2026-11-07] 僅資料→已接線；規格 doc_spec_0344 定案 |
| **NUM-11** | M3 | 培育數值公式與畢業評級（E-10） | logic | 3 | 🟢 已接線 | NUM-04 | Stat_Gain/TP_Gain/覺醒率/窺探率與畢業 S≥450 A≥350 B≥250 有單測 | [master fb02ff9 重估] NurtureSystem.ts TRAINING_* 常數；畢業評級在 NurtureService |  |
| **NUM-12** | M8 | 虎符戰力：品質/星級/共鳴/適性、升星突破成本（E-12/F-5） | logic | 4 | 🟢 已接線 | NUM-04 | 虎符四重乘區評分公式與 1~5 星無碎裂突破成本階梯定案 | 規格見 doc_spec_0349；assets/scripts/shared/TallyCardContract.ts；TigerTally*Composite.ts | [v18.3 更正 2026-11-07] 僅資料→已接線；規格 doc_spec_0349 定案 |
| **NUM-13** | M9 | 虎符忠誠度與叛變規則（E-13） | logic | 2 | 🟢 已接線 | NUM-12 | 拔裝更換扣減、連續變更×1.5、<30拒命、<10叛變狀態機有單測 | 規格見 doc_spec_0354；TigerTallyLoyalty 被 5 個模組匯入；PROG-2-0203（TRP-09）、戰場拒令 PROG-2-0219 | [v18.5 核對 2026-11-07] 規格 doc_spec_0354 定案 |
| **NUM-14** | M5 | 主將帶隊總戰力 Battle Power Rating 與勝敗預判（F-4/F-4a） | logic | 3 | ✅ 已驗收 | NUM-03, NUM-12 | calculateBattlePowerRating 與 predictBattleOutcome 輸出與規格偽代碼一致，出征支援防火牆規則有測試 | [v3 核對 2026-10-13] BattlePowerRating.calculateBattlePowerRating + BattlePowerPrediction.predictBattleOutcome；tests/BattlePowerRating.test.ts、BattlePowerPrediction.test.ts 通過；出征編制顯示粗估勝率（PROG-2-0212） |  |
| **NUM-15** | M5 | 帶兵上限/出征軍勢/部署限制/戰損與初中後期錨點（覆寫裁定、E-15） | logic | 3 | 🟢 已接線 | NUM-04 | 帶兵統御容量公式、初中後三期錨點、CanDeploy 500 底線與 6:4 戰損拆解定案 | 規格見 doc_spec_0357；SortieDeploy.computeCommandCapacity / computeSortiePoolMax / 戰損回寫 | [v18.6 核對 2026-11-07] 規格 doc_spec_0357 定案 |
| **NUM-16** | M10 | 數值系統 UI 字串與彈出文字（G/H 節） | content | 1 | 🟢 已接線 | - | STAT_*/VAL_*/LABEL_*/POPUP_* 與 G-1 文案進 i18n 並在戰場顯示 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **NUM-17** | M11 | Server 端 numerical_config 資料表與熱更新（I 節 Server） | server | 2 | 🟡 純邏輯 | NUM-04 | config_key/value/version 表可由 sync API 下發並讓客戶端比對版本 | 規格見 doc_spec_0662；numerical_config 表結構、差分下發API與FormulaRegistry安全熱注入協議 | [v18.39 核對 2026-11-08] 規格 doc_spec_0662 定案；服務端數值配表熱更下發與客戶端版本比對快取確立 |
| **BRAIN-01** | M11 | NPC Brain FastAPI 服務骨架與 /healthz（C-5/F-1） | server | 3 | 🟡 純邏輯 | - | server/npc-brain 可啟動，/healthz 回傳規格欄位並通過 smoke | 規格見 doc_spec_0684；NpcBrainHealthResponse 探針契約、三態熔斷器(CLOSED/OPEN/HALF_OPEN)、2.5s超時降級與TC-BRAIN-01測試規格 | [v18.46 核對 2026-11-08] 規格 doc_spec_0684 定案；中台Healthz探針監測與客戶端熔斷降級狀態機確立 |
| **BRAIN-02** | M11 | 三國演義 PDF→MD→章回切片資料管線（E-1~E-3） | tool | 4 | ⚪ 未開始 | BRAIN-01 | 可產出 source.md、chapters-manifest.json、conversion-report.json | 無 pipelines/sanguo-rag，無 artifacts/data-pipeline/sanguo-rag |  |
| **BRAIN-03** | M11 | 武將主名冊/文本稱呼表/正式對照表 與稱呼消歧（E-4/E-5a） | tool | 4 | 🟡 純邏輯 | BRAIN-02 | 「將軍，我送您一把寶刀」可解析為正確 generalId 並保留物品關係 | 規格見 doc_spec_0688；OfficialAliasRegistry 官方別稱消歧字典、逆向查表O(1)消歧演算法與相似名防混淆隔離規則 | [v18.47 核對 2026-11-08] 規格 doc_spec_0688 定案；名將官方別稱消歧字典資料規格確立 |
| **BRAIN-04** | M11 | 事件抽取與 relationshipEdges（E-5b） | tool | 4 | ⚪ 未開始 | BRAIN-03 | 張飛長坂橋事件穩定抽出，edgeConfidence/edgeStrength 分離 | 無抽取器與 gold_seed_registry |  |
| **BRAIN-05** | M11 | 互動關鍵字抽取與 keyword pack（E-6） | tool | 3 | 🟡 純邏輯 | BRAIN-04 | 張飛可產出 person/event/location/item/creature 關鍵字，label 長度與去噪規則通過 | 規格見 doc_spec_0688；GeneralKeywordPack 五大分類關鍵字包(人物/事件/地點/物品/神物)、長度限制(2~6字)與前端晶片呈現契約 | [v18.47 核對 2026-11-08] 規格 doc_spec_0688 定案；對話情境關鍵字包資料規格確立 |
| **BRAIN-06** | M10 | Persona Card 生成與人工審核標記（E-7） | content | 4 | 🟡 純邏輯 | BRAIN-04 | 核心名將 persona card 欄位齊全且 manualReviewRequired=true，含 safeFallbackLine | 規格見 doc_spec_0685；NpcPersonaCard 四維性格(義豪睿貪)、說話風格、關係錨點、safeFallbackLine安全保底與審查標記防呆規格 | [v18.46 核對 2026-11-08] 規格 doc_spec_0685 定案；PersonaCard多維性格設定檔契約確立 |
| **BRAIN-07** | M11 | Embedding 與向量庫入庫、namespace 規劃（E-8） | server | 3 | ⚪ 未開始 | BRAIN-05, BRAIN-06 | metadata filter 可按 generalId+contextKey 命中 | 無向量庫程式碼 |  |
| **BRAIN-08** | M11 | Evidence Resolver 與 ResolvedEvidencePack（C-3） | server | 3 | 🟡 純邏輯 | BRAIN-07 | 輸出 resolvedEvidence/unresolvedEvidenceRefs/resolutionTrace，證據不足走 fallback | 規格見 doc_spec_0685；ResolvedEvidencePack 歷史證據包消費契約、置信度三級門檻(>=0.75史實確證/0.50~0.74民間傳聞/<0.50隱藏)與TC-BRAIN-08測試規格 | [v18.46 核對 2026-11-08] 規格 doc_spec_0685 定案；證據包消費契約與置信度分級門檻確立 |
