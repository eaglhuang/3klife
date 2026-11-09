# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.4 國家官職天下（2/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.4 國家官職天下（2/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.4 4. 國家、官職與天下大勢 (Nation, Officer & Politics) · 第 2/4 段

> 續上段（表頭重複）。工作包 RAI-15 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **RAI-15** | M9 | 軍師智力軍事任務偵知分段（BASIC/ADVANCED/MASTER、Intel band） | logic | 1 | 🟡 純邏輯 | - | INT 邊界 50/70/90 分段測試通過 | core/systems/RivalExpansion.ts E-11／F-6 軍師 | [v17.2 更正 2026-11-07] 未開始→純邏輯 |
| **RAI-16** | M9 | External_Power 異域壓力源與 Expedition_Dossier（S3 全球遠征） | content | 2 | 🟡 純邏輯 | OFC-06 | 3 類異域壓力源可顯示於沙盤檔案並依 dossier_state 切換 | ExternalPowerDossier.ts（PROG-2-1968 #1873） | [v17.7 更正 2026-11-07] 未開始→純邏輯；已做、待接沙盤 UI |
| **GOV-01** | M9 | 五類內政任務資料表與公式常數（Base、主屬性、Weight） | data | 1 | 🟢 已接線 | - | gov-tasks.json 五類任務含公式參數並由 schema 驗證 | core/systems/DomesticTasks.ts 五任務表 | [v17.2 更正 2026-11-07] 未開始→已接線 |
| **GOV-02** | M9 | 內政產出計算 calcGovOutput（含人口紅利/政策修正/總計拆分） | logic | 2 | 🟡 純邏輯 | GOV-01 | 五任務產出與 F 節一致，並輸出 基礎/人口紅利/政策/總計 四欄 | FormulaSystem.calculateDiplomacyOutput 與 D | [v17.2 更正 2026-11-07] 未開始→純邏輯 |
| **GOV-03** | M9 | 人口→城市兵源上限與補兵速度模型（City_Troop_Cap/Recruit_Regen、8000 保底） | logic | 3 | 🟡 純邏輯 | GOV-02 | 初期城市兵源上限≥8000；政策調整只改貢獻傾向，無逐場徵兵 | GovernorHallView、BattleController 兵源上限／補兵 | [v17.2 更正 2026-11-07] 未開始→純邏輯 |
| **GOV-04** | M9 | 武將指派服務（任務格、拖放、衝突檢查、Max_Task_Slots） | logic | 2 | 🟢 已接線 | GOV-01 | 同一武將不可重複指派，超過格數被拒 | GovernanceAssignment 被 GameSession | [v17.2 更正 2026-11-07] 未開始→已接線 |
| **GOV-05** | M9 | 每季結算與季度報告（Season_Report） | logic | 2.5 | 🟢 已接線 | GOV-02, GOV-04 | 季結算後資源入庫，報告含 Food/Gold/Fame/Troops/Intel | GovernanceEvents 季度治理報告；PROG-2-1773（#1679） | [v17.2 更正 2026-11-07] 未開始→已接線 |
| **GOV-06** | M9 | 自動治理 AI（argmax Task_Affinity、手動/自動切換） | logic | 2 | 🟢 已接線 | GOV-04 | 閒置武將自動分到親和度最高任務，開關切換保存 | DomesticAutoGovernance 被 GameSession | [v17.2 更正 2026-11-07] 未開始→已接線 |
| **GOV-07** | M9 | 太守府 UI（人口核心儀表盤、產出卡、城市兵源卡） | ui | 5 | 🟢 已接線 | GOV-05, GOV-03 | 治理頁顯示人口/民心中心與四條流向，兵源卡顯示目前/上限/每回合補兵/距離回滿 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端 |  |
| **GOV-08** | M9 | 領地升級（太守府等級→任務格數） | logic | 1.5 | 🟢 已接線 | GOV-04 | 升級後 Max_Task_Slots 依表增加，扣除資源 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端 | [v17.3 規格整併 2026-11-08] 規範於 doc_spec_0587《太守府領地升級格數模型與武將指派排他狀態機規格書》 |
| **GOV-09** | M9 | 世襲主城保護與背水一戰被動 | logic | 2 | 🟢 已接線 | - | 外圍全失時主城不可被攻陷且 Defense x2、兵力生產 +50% | HereditaryKeep 被 GameSession 匯入；規格書 doc_spec_0504（世襲主城絕對保護與背水一戰雙倍防禦被動規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0504 落地，主城不可攻陷與背水一戰防禦翻倍/募兵+50%確立 |
| **GOV-10** | M9 | 非培育子嗣內政職位（縣令/屯田官/工匠/說客） | logic | 2.5 | 🟢 已接線 | GOV-02 | 四職位每季效果與 Official_Output 公式測試通過；兒童低效規則 | ChildOfficialPosts.ts；ChildMagistrate.ts；規格書 doc_spec_0505（非培育子嗣內政職位加成與未成年減半模型規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0505 落地，縣令/屯田/說客產能公式與未成年減半模型確立 |
| **GOV-11** | M10 | 治理事件（蝗災等）與季報文案/字串 | content | 2 | 🟢 已接線 | GOV-05 | 事件池可觸發且文案以 UI_GOV_* key 輸出 | GovernanceEvents 治理事件（蝗災等） | [v17.2 更正 2026-11-07] 未開始→已接線 |
| **GOV-12** | M9 | AI 橡皮筋（領土>30% 反 X 同盟、30~50% 隱性壓力、>50% 全圍攻） | logic | 2 | 🟢 已接線 | RAI-10 | 三個領土區間行為與測試符合規格，與他國 AI 規格閾值對齊 | core/systems/RivalHegemony.ts 30% 霸權 | [v17.2 更正 2026-11-07] 未開始→已接線 |
| **GOV-13** | M11 | 治理存檔與 Server 表（Territory_Level/Auto_Mode/Season_Output_JSON） | server | 1.5 | 🟡 純邏輯 | GOV-05 | 往返一致 | GameSession／PlayerSaveService 本機治理存檔欄位 | [v17.2 更正 2026-11-07] 未開始→純邏輯 |
| **GOV-14** | M8 | 商業化：治理效率道具、太守府擴展、VIP 自動治理 | logic | 2 | 🟡 純邏輯 | GOV-06 | 道具倍率可配置並計入產出 | 規格見 doc_spec_0635；DomesticBuffItem 商業化令籤產出加成、太守府第6委任長史槽與自動治理免費開放 | [v18.30 核對 2026-11-08] 規格 doc_spec_0635 定案；商業化與自動治理邊界裁決完結 |
| **POW-01** | M5 | 俘虜狀態標記與 POW_Record 模型（戰場擊敗→POW） | logic | 2 | ✅ 已驗收 | - | 戰後敗將依規則產生 POW_Record，傭兵來源被過濾 | [v3 核對 2026-10-13] PrisonerOfWar.ts create |  |
| **POW-02** | M5 | 傭兵豁免過濾（試用傭兵不可被俘） | logic | 0.5 | ✅ 已驗收 | POW-01 | MERC_TRIAL 武將戰敗不產生 POW，測試通過 | [v3 核對 2026-10-13] PrisonerOfWar.isPowExem |  |
| **POW-03** | M5 | 勸降成功率與判定（CHR/LUK/Loyalty/道具） | logic | 1.5 | ✅ 已驗收 | POW-01 | Persuade_Rate 公式測試覆蓋上下界，擲骰可注入 | PrisonerOfWar.persuadeRate；規格書 doc_spec_0499（戰後俘虜勸降機率模型與招募城市兵源扣減規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0499 落地，勸降成功率 1%~95% 精算公式與傭兵豁免確立 |
| **POW-04** | M5 | 招募消耗（黃金+城市兵源，依稀有度）與不足提示 | logic | 1.5 | ✅ 已驗收 | POW-01, GOV-03 | R/SR/SSR 消耗與資源不足時顯示『城市兵源不足』 | PrisonerOfWar 招募檢查黃金與城市；規格書 doc_spec_0499（戰後俘虜勸降機率模型與招募城市兵源扣減規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0499 落地，R/SR/SSR 招募扣減黃金與城市兵源雙資產矩陣確立 |
| **POW-05** | M5 | 四選一處置 UI（含成功率/消耗/回報預覽與字串） | ui | 4 | 🟢 已接線 | POW-03, POW-04 | 戰後彈窗顯示四選項，點選後寫回結果並更新資源 | [v3 核對 2026-10-13] PrisonerPopupController |  |
| **POW-06** | M9 | 監獄系統：關押、每季情報/資源產出、格數與擴容 | logic | 3 | 🟢 已接線 | POW-01, GOV-05 | 關押後每季產出 Intel/Resource，超格被拒，擴容生效 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端；規格書 doc_spec_0506（大牢監獄格數容量擴展與每季情報寶物產出規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0506 落地，基礎 3 格每季 1000 金擴充至多 10 格，季度結算產出情報與隨機寶物機制確立 |
| **POW-07** | M9 | 放走回報：名聲與 5% 未來來投 | logic | 1.5 | 🟢 已接線 | POW-01 | 放走增加 Fame，隨後季度以 5% 觸發來投事件 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端；規格書 doc_spec_0507（戰俘放走名聲回報與每季五趴未來來投演算法規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0507 落地，義釋依品質階梯發放名聲獎勵，每季 5% 獨立擲骰主動投靠機制確立 |
| **POW-08** | M7 | 虎符沒收與死亡回歸君主規則（投降才易主、放走帶走） | logic | 2 | 🟢 已接線 | POW-01 | 勸降/招募成功才轉移虎符，死亡自動回原君主 | PrisonerOfWar／TigerTallyHoldings 虎符轉移與勸降不轉；規格書 doc_spec_0508（戰敗武將虎符沒收歸屬與義釋帶走規則規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0508 落地，招降確立虎符易主、處決/陣亡虎符歸還主公、義釋由武將原件帶走規則確立 |
| **POW-09** | M9 | 延伸分支：結義金蘭卡加成、傳家寶掉落、傳道/頓悟、高齡轉教官 | logic | 3 | ✅ 已驗收 | POW-05, POW-06 | 各分支觸發條件與結果測試通過 | core/systems/PowExtendedBranches.ts 四項延伸分支（PROG-2-1937）；規格書 doc_spec_0529（戰後俘虜處置四項延伸分支與高齡轉教官判定規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0529 落地，金蘭卡加成、60歲高齡轉教官、季度傳家寶與義釋頓悟四分支演算法確立（未開始→已驗收） |
| **POW-10** | M11 | 俘虜 Server 監獄表與劇本文案 | server | 1.5 | ⚪ 未開始 | POW-06 | Prison 表往返一致、字串 key 完整 | 無 | [v17.2 更正 2026-11-07] 依賴伺服器／外部：Ser |
| **TRN-01** | M9 | 賽季週期管理（14 天、培育/競賽相位、自動輪轉） | server | 2.5 | 🟢 已接線 | - | 伺服器依時間自動切換 PREPARATION/COMPETITION/ENDED，單元測試覆蓋邊界 | core/systems/TournamentSeason.ts 14 天相位；規格書 doc_spec_0509（名將挑戰賽賽季週期雙相位輪轉與段位軟重置規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0509 落地，14 天雙相位輪轉、六階段位門檻與階梯式軟重置公式確立 |
| **TRN-02** | M9 | 賽季/場地/BOSS 配置資料與公告（地形、天氣、ruleset、weakness_tags） | data | 2 | 🟢 已接線 | TRN-01 | 賽季表可載入，公告包含地形天氣 BOSS 弱點 | core/systems/TournamentLocal.ts 每季輪替杯賽；規格書 doc_spec_0510（名將挑戰賽杯賽場地屬性輪替與季節BOSS弱點標籤規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0510 落地，五大史實杯賽模除輪替、五大弱點標籤與 1.5 倍加成確立 |
| **TRN-03** | M9 | 報名鏡像快照 TournamentTeamSnapshot（凍結、鎖定、每日重登錄、1 次緊急替換） | server | 3 | 🟢 已接線 | TRN-01 | 首次參戰後鎖定，競賽期僅 1 次替換，伺服器只讀快照 | core/systems/TournamentLocal.ts 首次參戰凍結鏡像快照；規格書 doc_spec_0511（名將挑戰賽陣容鏡像快照凍結與替換配額狀態機規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0511 落地，隊伍深拷貝不可變隔離、培育期每日 1 次與競賽期整季 1 次緊急替換狀態機確立 |
| **TRN-04** | M9 | 非同步對戰配對（總戰力 ±15%） | server | 2 | 🟢 已接線 | TRN-03 | 配對只落在範圍內，無對手時有 fallback | core/systems/TournamentLocal.ts 對手戰力在我方 ±15%；規格書 doc_spec_0512（名將挑戰賽非同步對戰配對與假人回退演算法規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0512 落地，總戰力 ±15% 精確區間、對手積分動態估算與確定性史實假人生成機制確立 |
| **TRN-05** | M7 | 伺服器端戰鬥模擬引擎（基於快照跑 5x8 棋盤） | server | 5 | ⚪ 未開始 | TRN-03 | 同快照同種子結果可重現，與客戶端戰場結果一致性測試通過 | 無 | [v17.2 更正 2026-11-07] 待裁決：需伺服端非同步模 |
| **TRN-06** | M9 | 賽制：五戰三勝、決賽單場、隨機地形 ±5% 波動 | logic | 2.5 | 🟢 已接線 | TRN-04, TRN-05 | 晉級/淘汰判定與 best_of 設定測試通過 | core/systems/TournamentLocal.ts 五戰三勝、決賽單場；規格書 doc_spec_0513（名將挑戰賽淘汰賽制五戰三勝與決賽單場地形波動規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0513 落地，初複準五戰三勝、決賽單場驟死與單局 ±5% 地形戰力波動狀態機確立 |
| **TRN-07** | M9 | ELO 積分與六段位、賽季 soft reset rollover | logic | 2 | 🟢 已接線 | TRN-06 | calculateEloChange、段位邊界與 rollover 規則測試通過 | core/systems/TournamentLocal.ts ELO（K=32）與六段位；規格書 doc_spec_0515（名將挑戰賽ELO積分計算模型與段位動態升降規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0515 落地，K=32 標準勝率期望曲線、非負保底與無鎖段實時升降演算法確立 |
| **TRN-08** | M8 | 報名與參戰次數（免費 1 次/日、額外 30 精元、上限 5 次） | logic | 1.5 | 🟢 已接線 | TRN-03 | 扣精元與次數計數、超限被拒 | core/systems/TournamentLocal.ts 每日免費 1 次；規格書 doc_spec_0514（名將挑戰賽參戰次數計數器與精元購買扣款規格書） | [v17.3 核對 2026-11-07] 規格書 doc_spec_0514 落地，每日首戰免費、額外每場 30 精元、每日 5 次總上限與原子扣款機制確立 |
