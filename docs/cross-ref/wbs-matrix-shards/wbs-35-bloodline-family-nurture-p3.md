# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.5 血統家族培育（3/9）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.5 血統家族培育（3/9）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.5 5. 血統、家族與培育傳承 (Bloodline, Family & Nurture) · 第 3/9 段

> 續上段（表頭重複）。工作包 FBR-06 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
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
| **LUK-01** | M2 | LUK 屬性資料（Stats.luk、LUK_Max、前期隱藏旗標） | data | 1 | 🟢 已接線 | - | 武將資料含 luk 與 Is_Visible，LUK_Max 由紫因子計算 | LuckVisibility 被 GeneralDetailOverviewMapper、GeneralDetailStatsChild 匯入；PROG-2-0705 | [v17.2 更正 2026-11-07] 純邏輯→已接線 |
| **LUK-02** | M2 | 天命波動公式並接入 EP | logic | 2 | 🟢 已接線 | LUK-01 | EP 加入 LUK×Random(-0.5,1.5) 並可注入隨機源測試 | [v7 核對 2026-10-14] 天命波動接入子嗣 EP（e23c7741，PROG-2-0511）；小區間修正（79648675） |  |
| **LUK-03** | M2 | 紫色因子定義與 LUK 上限（50+等級×10） | logic | 2 | 🟢 已接線 | LUK-01 | 紫因子 ★5 時 LUK_Max=100 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **LUK-04** | M2 | Phase 3（Lv46+）紫色因子可見性解鎖 | logic | 1 | 🟢 已接線 | LUK-03 | Lv46 前顯示『???（Lv46 解鎖）』，達到後顯示 | [v14 核對 2026-10-21] Phase 3 紫色可見性接到六角圖（2bcd8638，PROG-2-0883，#663）；GameSession、FactorHexGraphic、LobbyScene 有改動，GameSessionVisibleFactorColors.test.ts 存在；六角圖 UI 實機未核對 |  |
| **LUK-05** | M3 | LUK 對事件觸發率、覺醒速度與繼承率的修正 | logic | 3 | 🟢 已接線 | LUK-01 | 三個公式在培育/覺醒/繼承處被呼叫並有單元測試 | [v16 核對 2026-10-21] 覺醒速度與繼承率 LUK 修正（PROG-2-0509、PROG-2-0510，已 done，改既有配種與培育路徑，各 4 條新測）；繼承率文字衝突的 PM 裁決見 0509 紀錄，UI 未核對 |  |
