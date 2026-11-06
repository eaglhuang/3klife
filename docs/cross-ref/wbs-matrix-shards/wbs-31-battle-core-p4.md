# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.1 戰鬥核心（4/7）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.1 戰鬥核心（4/7）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.1 1. 戰鬥核心系統 (Battle Core) · 第 4/7 段

> 續上段（表頭重複）。工作包 TAC-07 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **TAC-07** | M7 | TSTEALTH/TCOND 條件觸發（鄰格/天氣/兵種限制、隱身忽略索敵） | logic | 3 | 🟢 已接線 | TAC-01 | 隱身 2 回合敵 AI 忽略；騎兵戰法帶步兵不可發動的兵種限制有測試 | [v7 核對 2026-10-14] TacticCondition 條件表與評估（d646bb52、a85d84c6）由 2 處 src 呼叫；隱身忽略索敵於戰鬥中未核對 |  |
| **TAC-08** | M2 | 天賦戰法初始庫 8 條資料 + tacticSlots 分配 + 稀有度配額/評分 | data | 2 | 🟢 已接線 | - | tactic-library.json 8/8 含 battleSkillId/autoAimMode；generals 231/235 帶 tacticSlots | assets/resources/data/master/tactic-library.json（8條）；tests/BattleSkillProfileAutoTargeting.test.ts；generate-general-tactics.js（規格自述，未核） |  |
| **TAC-09** | M7 | 天賦戰法自動施放：BattleSkillProfiles 與 AI cadence（manualTargeting:false、autoAimMode） | logic | 3 | 🟢 已接線 | TAC-08, TAC-03 | 8條天賦戰法在戰場自動選錨點施放，敵方施放有最小回合間隔 | assets/scripts/battle/skills/BattleSkillProfiles.ts（16 profile）；tests/BattleSkillProfileAutoTargeting.test.ts |  |
| **TAC-10** | M7 | 虎符專屬戰法 G-1 14 條逐條落地（目前僅無視防禦、百步穿楊） | logic | 8 | 🟢 已接線 | TAC-02, TAC-05, TAC-06 | 14 條各有 profile + 單元測試 + 對位規格公式；規格 checklist 全勾 | [v10 更正 2026-10-20] master 上 BattleSkillProfiles 已登錄 10 條 profile（戰場線確認）；連環計、幼麒天算以 id（tally-link、tally-counter-weak）登錄，名稱無誤。第一批 4 條見 5dc19d7e（PROG-2-0763）。以 14 條為準，剩餘條數與逐條測試未核對 | 狀態不變（已接線）；PROG-2-1444（虎痴符）、1457（錦帆等五符）為 G-1 虎符被動，D-1a 缺口 15→14 條，對應本列 |
| **TAC-11** | M7 | 教官靈感戰法 G-2 六招（單騎破陣/八陣圖/空城計/醫療/鼓舞/緩速） | logic | 4 | 🟢 已接線 | TAC-04, TAC-05 | 6 招逐條公式/TP 消耗對位並有測試 | [v10 核對 2026-10-20] G-2 六招中，鼓舞（morale，65325787）、緩速（slow，5408b074）、醫療（HealSkillResolver）已有效果解析；八陣圖、單騎破陣有關鍵字命中；空城計有 1 處命中。逐招公式與 TP 消耗對位未核對 |  |
| **TAC-12** | M7 | 血統戰法 趙家槍法 三段遞增 1.0/1.2/1.4 + 血統限制 | logic | 2 | 🟢 已接線 | TAC-03 | 前方3格三次獨立結算，遞增係數正確，非趙家血脈不可發動 | [v6 核對 2026-10-14] 趙家槍法三段遞增結算接上戰場（51bffeef）；BLT 血統戰法測試未逐一核對 |  |
| **TAC-13** | M7 | 場景全局戰法注入 SceneGambitAdapter（水淹/森林埋伏/落石/夜襲）+ 場勢視覺 | logic | 5 | 🟢 已接線 | TAC-05, TAC-07 | BattleTactic 載入後棋盤預設格型/隱身/夜襲規則生效，HUD badge 與 pulse 顯示 | adapters/SceneGambitAdapter.ts、views/BattleSceneGambitSummary.ts、BoardRenderer.ts(water-ripple)、scene-backgrounds.json；BattleTactic enum 僅 5 種 |  |
| **TAC-14** | M7 | UI 資料出口：GeneralDetail Skills 分頁、BattleScene 戰法摘要/可施放狀態/灰化原因 | ui | 3 | 🟢 已接線 | TAC-08 | Skills 分頁讀 tacticSlots+tactic-library；戰場 HUD 顯示灰化原因與戰報字串 | ui/components/general-detail/GeneralDetailSkillsChild.ts；battle/views/BattleSceneLoader.ts（灰化原因無） |  |
| **TAC-15** | M7 | 戰法 AI 選技規則（斬殺線/危險值/choke point）與 7 步驗收矩陣 | logic | 3 | 🟢 已接線 | TAC-09 | AI 單體傷害優先斬殺、Buff/Heal 看危險值；各模組 unit + 各來源 integration + UI smoke | [v16 核對 2026-10-21] 戰法 AI 選技規則 TacticAiRules（219a2bc2，PROG-2-0907，#724）由 EnemyTacticCandidates、EnemyTacticNumbers、BattleController 呼叫（0912、0914、0918 接線，#736、#742、#761）；TacticAiRules.test.ts 存在。7 步驗收矩陣實機未核對 |  |
| **TAC-16** | M10 | 戰法 VFX/英靈面演出/assets/fx/tactics prefab 與戰場掠奪飄字 | content | 5 | 🟢 已接線 | TAC-10 | SSR/UR 戰法有半身英靈閃現；掠奪金色飄字顯示資源清單 | TacticVfxHooks 被 BattleUIBridge 匯入；PROG-2-1861 英靈閃現（#1768）、PROG-2-1852 掠奪飄字（#1759） | [v17.2 更正 2026-11-07] 純邏輯→已接線；assets/fx/tactics prefab 目錄仍不存在 |
| **SCN-01** | M7 | 場景戰法 6 種資料表（ID/INT門檻/情報門檻/Tile預設比例）JSON 驅動 | data | 2 | 🟡 純邏輯 | - | scene-presets.json 含 6 場景完整欄位並可由 loader 讀入 | battle/shared/SceneGambitTrigger.ts 已有六場景 INT／情報門檻常數 | [v17.2 更正 2026-11-07] 未開始→純邏輯；尚未移入 JSON 資料表 |
| **SCN-02** | M7 | Tile-State 預設佈局生成（Stealth/Hazard/Force-Move/Normal 比例） | logic | 3 | 🟢 已接線 | SCN-01 | 給定 preset 產生 5×8 棋盤格狀態分佈符合比例，同 seed 可重現 | battle/shared/SceneTilePresets.ts 被 BattleTacticBehavior 匯入 | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **SCN-03** | M7 | 發動判定：INT門檻/情報門檻/成功率公式 P=min(95%,50%+(INT-th)*2%) | logic | 2 | 🟡 純邏輯 | SCN-01 | 單元測試覆蓋門檻邊界與 95% 上限 | [v8 核對 2026-10-15] 場景戰法發動判定純函式（3bc41d0d）與測試；無 src 呼叫端 |  |
| **SCN-04** | M9 | 軍事任務接取→下一場戰鬥自動套用場景戰法（BattleEntryParams 資料橋） | logic | 3 | 🟡 純邏輯 | SCN-03 | 接任務後進入戰鬥時 battleTactic 被注入並顯示 | shared/BattleEntryParams.ts、LobbyScene→BattleScene 傳遞 battleTactic；軍事任務接取無 |  |
| **SCN-05** | M10 | 預繪靜態場景背景切換（day/night 等）+ 水淹 ripple 條件掛載/fallback | ui | 3 | 🟢 已接線 | SCN-01 | Flood 才掛 water-ripple，載入失敗回退 floodBaseFillMaterial 且可重試 | battle/views/SceneBackground.ts、BoardRenderer.ts、scene-backgrounds.json（僅 bg_normal_*） |  |
| **SCN-06** | M7 | 森林埋伏+夜襲專屬規則（前2回合隱身、陷阱定身、命中-25%暴擊+20%、營帳可佔領） | logic | 4 | 🟢 已接線 | SCN-02 | 隱身2回合、陷阱格定身1回合+傷害、營帳佔領=勝利 有測試 | [v8 核對 2026-10-15] 暴擊系統與夜襲改寫（1dceedb2）；CombatCrit 1 處呼叫端與測試 |  |
| **SCN-07** | M7 | 峽谷落石+水淹+火燒偷襲場景規則與擊破/掠奪掉落（Loot System） | logic | 5 | 🟢 已接線 | SCN-02 | 落石擊破掉石材100~300等；佔領火格=掠奪成功，金色飄字顯示 | PROG-2-1583 擊破落石掉落（#1402）、PROG-2-1852 掠奪飄字（#1759）、Stage_Salvage | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **SCN-08** | M7 | 攻城戰：城門/城牆地利/衝車雲梯投石機器械 | logic | 5 | 🟢 已接線 | SCN-02 | 器械可破門、雲梯攀爬、投石機AOE，各有單元測試 | PROG-2-1589 攻城戰最小版（#1409，城牆地利＋衝車）；PROG-2-1596 投石機、1597 雲梯、1598 護城河 | [v17.2 更正 2026-11-07] 未開始→已接線；器械通道格、城牆美術未做 |
| **SCN-09** | M7 | 格子戰法分類（突擊/控制/環境）與離間等未列戰法定義 | logic | 2 | ⚪ 未開始 | SCN-02 | 離間(敵軍互鬥)等至少一個控制類格子戰法落地 | 無 | [v17.2 更正 2026-11-07] 待裁決：離間等戰法規格未列定義，無法落資料表 |
| **SCN-10** | M7 | 軍師智謀能量 HUD（每回合 INT*0.5、滿100觸發全局增幅、金色粒子） | ui | 2 | 🟢 已接線 | SCN-03 | 垂直能量條由下往上填滿，滿格噴發並觸發增幅 | WisdomMeter 被 BattleController、BattleUIBridge、StrategistHudView 匯入；PROG-2-1574（#1393）、PROG-2-1851（#1758） | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **SCN-11** | M10 | 場景背景圖 AI 繪製 Pipeline（6 張預繪背景） | content | 4 | 📄 僅資料 | SCN-01 | 6 場景背景資產入庫並在 scene-backgrounds.json 註冊 | scene-backgrounds.json 僅 bg_normal_day/night；其餘 4 張無 |  |
| **DEP-01** | M5 | 出征軍勢池 Sortie_Troop_Pool：min(帶兵上限,城市兵源,關卡上限) 與 Command_Capacity 公式 | logic | 3 | 🟢 已接線 | - | 給定武將/城市/關卡參數算出 Pool_Max，且初期不低於 8000，單元測試通過 | [v3 核對 2026-10-13] SortieSetupController.ts:156 呼叫 computeSortiePoolMax(min 帶兵上限/城市兵源/關卡上限)；出征編制畫面顯示軍勢池（PROG-2-0083） |  |
| **DEP-02** | M9 | 城市兵源鏈：City_Troops_Cap/補兵速度/戰損回扣/恢復回合 | logic | 3 | 🟢 已接線 | DEP-01 | 戰後 Lost_Troops 回扣城市兵源，Turns_To_Recover=ceil(loss/regen) 正確 | [v3 核對 2026-10-13] MilitaryReserve.ts regenMilitaryOneSeason/applySortieResult 接 GameSession 每季補兵與戰損回扣（PROG-2-0072） |  |
