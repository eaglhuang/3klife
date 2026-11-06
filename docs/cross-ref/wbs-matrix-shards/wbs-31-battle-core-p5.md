# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.1 戰鬥核心（5/7）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.1 戰鬥核心（5/7）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.1 1. 戰鬥核心系統 (Battle Core) · 第 5/7 段

> 續上段（表頭重複）。工作包 DEP-03 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
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
