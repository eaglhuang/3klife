# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.4 國家官職天下（2/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.4 國家官職天下（2/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.4 4. 國家、官職與天下大勢 (Nation, Officer & Politics) · 第 2/4 段

> 續上段（表頭重複）。工作包 RAI-15 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
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
