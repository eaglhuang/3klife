# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.5 血統家族培育（8/9）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.5 血統家族培育（8/9）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.5 5. 血統、家族與培育傳承 (Bloodline, Family & Nurture) · 第 8/9 段

> 續上段（表頭重複）。工作包 ORAC-06 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **ORAC-06** | M9 | 名士解鎖（占卜次數/劇情進度） | logic | 1 | 🟢 已接線 | ORAC-01, ORAC-04 | 累計占卜達標解鎖龐統等名士，未解鎖顯示 UI_ORACLE_LOCKED | [v16.8 更正 2026-10-28] 名士解鎖由 GameSession.isSageUnlocked 與 SageDivination.ts 提供，SageOracleController、LobbyScene 呼叫；鎖定提示改語系鍵（#1239/#1249），協調者確認 |  |
| **ORAC-07** | M9 | 矛盾預言提示（兩名士意見相左，待 5 歲驗證） | ui | 1 | 🟢 已接線 | ORAC-05 | 同一對父母多次占卜結果衝突時顯示 UI_ORACLE_CONFLICT | 無 | 未開始→已接線；v16.9 協調線回報：SageOracleController 已有意見相左提示；LobbyScene 掛載 |
| **ORAC-08** | M10 | 祖輩顯靈台詞（命中祖先標籤觸發補充台詞） | content | 2 | 🟡 純邏輯 | ORAC-02 | 命中特定祖先標籤時附加顯靈台詞，且不改變準確率 | AncestorApparitionLines.ts（PROG-2-1967 #1871） | [v17.7 更正 2026-11-07] 未開始→純邏輯；已做、待接結緣 UI |
| **ORAC-09** | M10 | 名士台詞/批語模板（各名士風格、含左慈含糊） | content | 2 | ⚪ 未開始 | ORAC-01 | 各名士至少 5 組模板，覆蓋色系傾向與關鍵詞 | 無 |  |
| **ORAC-10** | M9 | 準確率單元測試（固定種子） | test | 1 | 🟡 純邏輯 | ORAC-02 | 三個規格示例以 unit test 通過 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（純邏輯）；待 QA／實機驗收 |  |
| **DUP-01** | M8 | 重複卡彈窗 UI 契約落地（抽卡重複卡彈窗：兩個分流按鈕與預覽） | ui | 3 | 🟡 純邏輯 | SAME-03 | 重複抽卡彈窗顯示『復生重練/血脈灌注』並能回傳選擇 | 規格見 doc_spec_0649；DuplicateRoutingChoice 復生重練(新UID)與血脈灌注(等級+1)雙向選擇彈窗契約 | [v18.34 核對 2026-11-08] 規格 doc_spec_0649 定案；重複卡分流彈窗UI契約定案 |
| **DUP-02** | M9 | 英靈卡詳情頁（顯示血脈等級、英靈濃度、灌注入口） | ui | 3 | 🟢 已接線 | SAME-05 | 英靈卡詳情可顯示 Bloodline_Level 並接受灌注 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **DUP-03** | M9 | 虎符升階 UI（接收血脈灌注提升層級/特種軍隊強度） | ui | 3 | 📄 僅資料 | SAME-05 | 虎符詳情顯示 Linked_Tally_Level 並隨灌注更新 | 規格見 doc_spec_0651；TigerTallyUpgradeComposite 虎符1~10級灌注升階演算法與特種軍隊強度克制晉升規格 | [v18.35 核對 2026-11-08] 規格 doc_spec_0651 定案；虎符升階介面與特種軍隊強度晉升確立 |
| **DUP-04** | M10 | 命鏡升階/覺醒頁灌注銜接 | ui | 2 | 🟡 純邏輯 | SAME-05 | 命鏡升階頁可顯示並觸發灌注結果 | 規格見 doc_spec_0650；MirrorAwakeningComposite 命鏡戰魂濃度進度條與重複卡灌注銜接演出契約 | [v18.35 核對 2026-11-08] 規格 doc_spec_0650 定案；命鏡升階覺醒介面與灌注銜接定案 |
| **DUP-05** | M8 | 重複卡分流與轉蛋系統接線（抽到重複卡進入分流而非碎片） | logic | 2 | 🟡 純邏輯 | SAME-06 | LocalGachaService 偵測重複後導向分流流程 | LocalGachaService + GameSession.addGenerals 已回報 duplicates（/tmp/integ/assets/scripts/core/managers/GameSession.ts，pr_only）；尚未導向分流 |  |
| **STORY-01** | M10 | 歷史趣聞/血脈傳聞欄位 schema（historicalAnecdote、bloodlineRumor、storyStripCells） | data | 1 | ✅ 已驗收 | - | GeneralConfig 含兩層敘事欄位與 6 格 strip 型別 | assets/scripts/core/models/GeneralUnit.ts（historicalAnecdote/bloodlineRumor/storyStripCells）；assets/resources/data/generals.json 235 筆皆含 6 格 strip；assets/resources/data/master/generals-stories.json |  |
| **STORY-02** | M10 | 日常人物頁 6 格 story strip 顯示 | ui | 2 | 🟢 已接線 | STORY-01 | 人物頁顯示 origin/faction/role/awakening/bloodline/future 六格 | assets/scripts/ui/components/GeneralDetailOverviewMapper.ts（storyStripCells 映射）；tools_node/gen-general-content-states.js |  |
| **STORY-03** | M10 | 首批文案池（趙雲/甄姬/孫尚香/關羽/諸葛亮）品質與完成度 | content | 3 | 📄 僅資料 | STORY-01 | 五人 historicalAnecdote/bloodlineRumor 無 '???' 且六格符合前段歷史後段血脈 | 規格見 doc_spec_0652；五大核心名將歷史趣聞與血脈傳聞敘事文案標準契約（無???與六格strip標準） | [v18.35 核對 2026-11-08] 規格 doc_spec_0652 定案；五大名將歷史趣聞與血脈傳聞文案標準定案 |
| **STORY-04** | M10 | 命鏡/覺醒頁 5 格命運帶資料與顯示 | ui | 3 | 🟢 已接線 | STORY-01 | 命鏡頁顯示 5 格命運帶並與 6 格 strip 有明確映射 | 無；血脈命鏡過場載入規格相關 UI 未見實作 | 未開始→已接線；MirrorFateStrip 接 LobbyScene |
| **STORY-05** | M0 | 敘事分層與內容品質檢核工具（中段必有命運介入） | tool | 2 | 🟡 純邏輯 | STORY-01 | 驗證腳本檢查格數、前後段分層與缺漏 '???' 並納入閘門 | tools_node/validate-generals-data.js、tools_node/audit-core-generals-quality.js（檢核欄位完整度，未檢中段命運介入） |  |
| **VIT-01** | M1 | 精力資料模型（Vitality_Current/Max、Recovery、Is_Pregnant、Pregnancy_Remaining、Red_Gene_Level）與存檔 | data | 1 | ✅ 已驗收 | - | GeneralConfig 含 vitality/maxVitality/待產欄位並可存檔往返 | [v5 核對 2026-10-14] 精力資料模型存讀往返測試（01578ada，tests/P0RoundTrip.test.ts）；VitalityCap 既有呼叫端 |  |
| **VIT-02** | M1 | 精力消耗規則（戰鬥-30/結緣男-50女-100/培育-20） | logic | 2 | ✅ 已驗收 | VIT-01 | 各行動扣除對應精力，不足時拒絕並顯示 UI_VIT_EXHAUSTED | BattleRoster.ts；BreedingSystem.ts；規格書 doc_spec_0580（男女精力消耗差異待產凍結與紅因子上限精算規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0580 落地，戰鬥-30/培育-20與結緣男-50女-100非對稱精力消耗確立 |
| **VIT-03** | M1 | 每季自然回復（Base20+紅因子×5，老年×0.6）與待產凍結 | logic | 2 | ✅ 已驗收 | VIT-01, LIFE-02 | 每季推進時依公式回復，待產中不回復，不超過上限 | BattleRoster.ts；規格書 doc_spec_0580（男女精力消耗差異待產凍結與紅因子上限精算規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0580 落地，每季Base20+紅因子×5回補、老年0.60折減與待產期3季零回復凍結確立 |
| **VIT-04** | M1 | 精力上限公式（100+紅因子×20，近親×0.7） | logic | 1 | ✅ 已驗收 | VIT-01 | Vitality_Max 依紅因子與近親折算 | VitalityCap.ts；規格書 doc_spec_0580（男女精力消耗差異待產凍結與紅因子上限精算規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0580 落地，(100+紅因子×20)×近親0.70精算公式與上限200極限確立 |
| **VIT-05** | M8 | 補元散道具（+50/+100，不超過上限） | logic | 1 | ✅ 已驗收 | VIT-01 | 使用補元散回復精力且封頂，測試通過 | [v8 核對 2026-10-15] 補元散回復純函式（f669c947）、精力已滿拒絕並扣背包道具（7a5cdac6）、存檔寫入與背包使用流程（f46e3d50）；VitalityPill 2 處呼叫端與測試 |  |
| **VIT-06** | M1 | 精力 UI（精力條綠→黃→紅、消耗提示、待產剩餘季數） | ui | 2 | 🟢 已接線 | VIT-01 | 精力條隨比例變色並顯示 UI_VIT_BAR/UI_PREGNANCY_LOCK | [v3 核對 2026-10-13] PROG-2-0074 精力 UI（d4be8a0 / 67d872e）：LifeVitalityPresenter 精力條分段 |  |
| **VIT-07** | M3 | 大器晚成偵測（精力極低線索） | logic | 1 | ✅ 已驗收 | VIT-01, FATE-04 | 精力低於門檻時出現大器線索文案 | [v5 核對 2026-10-14] 精力極低大器晚成線索（749db278，PROG-2-0316）；LateBloomClue 接線，tests/LateBloomClue.test.ts 通過 |  |
| **VIT-08** | M8 | 月卡精力+20%、待產縮短道具（商業化） | logic | 2 | 🟢 已接線 | VIT-03 | 月卡狀態使回復×1.2，待產縮短道具減少剩餘季數 | assets/scripts/core/systems/MonthlyCard.ts MONTHLY_CARD_VITALITY_RECOVERY_MULTIPLIER=1.2，GameSession／BattleRoster 套用；tests/MonthlyCardVitality.test.ts。待產縮短道具未做 | [v17.0 更正 2026-11-07] 未開始→已接線（前半）；月卡期間每季精力回復×1.2 已入庫（PROG-2-1919，#1835），待產縮短道具仍未做 |
| **VIT-09** | M10 | 精力劇本字串與提示（精疲力竭/補元散/待產/大器線索） | content | 1 | ✅ 已驗收 | - | 字串 Key 進 i18n | [v12 核對 2026-10-20] 精力劇本字串進語系表（a439069c，PROG-2-0728，#566）；VitalityScriptTexts 由 VitalityPillController、NurtureFlowController、BondingSetupController 呼叫，測試存在 |  |
| **REC-01** | M5 | 戰績資料模型 BattleRecord（Win/Lose/Kill/Damage/Guardian/Milestones）與存檔欄位 | data | 1 | ✅ 已驗收 | - | GeneralConfig 或獨立 Record 含五欄位並納入存檔 | [v3 核對 2026-10-13] BattleRecordStats.ts（BattlePerformance/BattleRecordLike）＋ BattlePerformanceTracker 結算寫回；tests/BattleRecordStats.test.ts 通過 |  |
| **REC-02** | M5 | 戰鬥結算寫入（勝敗、擊殺、傷害、承傷+治療） | logic | 3 | 🟢 已接線 | REC-01 | 戰鬥結束時對出戰武將累加欄位，單元測試涵蓋勝/敗/撤退 | [master fb02ff9 重估] BattleRoster 結算回寫（PROG-2-0033 settle results back） |  |
