# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.5 血統家族培育（5/9）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.5 血統家族培育（5/9）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.5 5. 血統、家族與培育傳承 (Bloodline, Family & Nurture) · 第 5/9 段

> 續上段（表頭重複）。工作包 MENT-11 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **MENT-11** | M3 | 血統/教學邊界檢查（Role_Boundary=TeachingOnly，教官效果不得回寫因子/祖先矩陣/受孕率） | test | 1 | ✅ 已驗收 | MENT-01 | 自動化測試證明教官加成不修改 Genes、Ancestors_JSON 與受孕率 | [v13 核對 2026-10-20] 教學邊界執行期檢查接入培育（5e26144d，PROG-2-0870，#611）；MentorBoundary 由 NurtureService 呼叫，MentorBoundaryGuard 測試存在 |  |
| **MENT-12** | M9 | 師友羈絆（羈絆對表、Min_Friendship、回合 12 前一次判定、四類效果） | logic | 3 | ✅ 已驗收 | MENT-04 | 羈絆對同場且友情達標時觸發一次羈絆事件並套用效果，五組預設羈絆資料可載入 | MentorSynergy.ts；規格書 doc_spec_0566（師友同場羈絆對聯動與名將傳道令一生一次奧義規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0566 落地，五組歷史羈絆對、第12回合前一次性判定與四類特權效果確立 |
| **MENT-13** | M10 | 教官卡詳情頁三頁籤（支援效果/培育事件/小插曲）與星等鎖頭 | ui | 3 | 🟢 已接線 | MENT-06 | 頁籤切換顯示正確資料，未達星等的事件顯示鎖頭 | [v9 核對 2026-10-15] MentorCardTabs 三頁籤 3 處呼叫端與測試，MentorCardDetailController 接詳情入口（#421）；星等鎖頭與小插曲未核對 |  |
| **MENT-14** | M9 | 好友借用教官（每日 1 張、快照複製、結義點數回饋、當下星等） | server | 3 | ✅ 已驗收 | MENT-09 | 借用流程產生 Borrow 記錄並以快照進入培育，原主不受影響 | NpcFriendMentor.ts；GameSession.ts；規格書 doc_spec_0569（好友教官每日借用快照與戰場戰法來源轉換規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0569 落地，每日限借1張、快照複製隔離與好友50結義點回饋確立 |
| **MENT-15** | M9 | 名將傳道（Legendary_Mentoring：傳道令、一生一次、100% 傳奧義） | logic | 2 | ✅ 已驗收 | MENT-03, LIFE-06 | 死亡名將英靈卡可消耗傳道令對培育子嗣傳授專屬奧義一次，第二次被拒 | LegendaryMentoring.ts；GameSession.ts；規格書 doc_spec_0566（師友同場羈絆對聯動與名將傳道令一生一次奧義規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0566 落地，傳道令消耗、100%奧義傳承與學員英靈一生一次雙向防呆確立 |
| **MENT-16** | M7 | 戰場端 Mentor 戰法來源轉換（SkillSourceType.Mentor） | logic | 1 | ✅ 已驗收 | - | 以 awakened 戰法槽建立 Mentor 來源技能請求，型別為 SkillSourceType.Mentor | MentorTacticAdapter.ts；規格書 doc_spec_0569（好友教官每日借用快照與戰場戰法來源轉換規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0569 落地，SkillSourceType.Mentor列舉適配與1.10倍師門傷害加成確立 |
| **FATE-01** | M3 | 職能資料模型（Primary_Class/Sub_Class/Fate_Recommend/Fate_Defied/Growth_Modifier）與存檔欄位 | data | 1 | ✅ 已驗收 | - | GeneralConfig 與存檔含職能欄位並可往返序列化 | [v5 核對 2026-10-14] 職能資料模型存讀往返測試（01578ada，tests/P0RoundTrip.test.ts）；Unveiling 既有呼叫端 |  |
| **FATE-02** | M3 | 5 歲宿命推薦演算法（藍色因子 STR/POW vs INT/POL） | logic | 1 | 🟢 已接線 | FATE-01 | 給定藍色因子輸入，輸出武官/文官建議，邊界等值有明確規則，測試通過 | [master fb02ff9 重估] Unveiling.ts FateRecommendation、classifyFactorLeaning |  |
| **FATE-03** | M3 | 接受/抗命選擇與成長率懲罰（×0.8） | logic | 1 | 🟢 已接線 | FATE-02 | 抗命後 Growth_Modifier=0.8，順應天命=1.0，並寫入存檔 | [master fb02ff9 重估] Unveiling.ts FATE_DEFY_GROWTH_MODIFIER |  |
| **FATE-04** | M3 | 大器晚成機制（25 歲後成長率×1.5，觸發條件待定） | logic | 2 | 🟢 已接線 | FATE-03, LIFE-02 | 規則釐清後，抗命武將在 25 歲依機率轉為 ×1.5 並提示名士批語 | [master fb02ff9 重估] Unveiling.ts LATE_BLOOMER_AGE/GROWTH |  |
| **FATE-05** | M3 | 5 歲宿命分流 UI（天命揭曉、接受/抗命按鈕、職能標籤 武🔴/文🔵/雙🟡） | ui | 3 | 🟢 已接線 | FATE-02, FATE-03 | 開獎畫面顯示宿命建議與兩個選項，標籤色正確，UCUF 驗證通過 | [master fb02ff9 重估] Unveiling 揭曉 UI（PROG-2-0034 unveiling screen） |  |
| **FATE-06** | M4 | 20 歲轉職（轉職令消耗、追加副職、副職能力×0.6） | logic | 2 | ✅ 已驗收 | FATE-01 | 滿 20 歲且持有轉職令才能追加副職，副職能力=主職×0.6，扣令一枚 | JobChange.ts；tests/JobChange.test.ts 通過；規格書 doc_spec_0567（武將二十歲成人禮轉職與退役職能分流產物模型規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0567 落地，滿20歲成人禮副職追加、轉職令消耗與能力0.60折減確立 |
| **FATE-07** | M6 | 轉職 UI 與轉職令道具 | ui | 2 | 🟢 已接線 | FATE-06 | 20 歲成人禮畫面可選副職並顯示 UI_JOB_CHANGE 文案 | [v4 核對 2026-10-13] JobChangeController.ts 轉職選單畫面接大廳與場景（PROG-2-0227）；轉職令道具 UI 細節未逐項核對 |  |
| **FATE-08** | M4 | 退役分流（武→虎符/戰技教官；文→竹簡/智識教官；雙職能→全能教官） | logic | 3 | 🟢 已接線 | FATE-01, LIFE-06, MENT-01 | 退役時依職能產出對應產物與教官類型，雙職能產出兩者 | [v6 核對 2026-10-14] 退役流程接上教官分流（09379f1a）與主職 fallback、竹簡產物（a92f0005）；分流規則測試未逐一核對 |  |
| **FATE-09** | M10 | 因子色彩對應職能視覺化（卡片） | ui | 2 | 🟢 已接線 | FATE-05 | 武將卡片上藍/粉/紅/綠/金/紫/白/銀因子色彩與職能標籤對應視覺契約定案 | 已由 doc_spec_0321 定案七曜因子色彩與七大職能標籤映射單一標準與卡片渲染契約 | [v17.4 更正 2026-11-07] 未開始→已接線；規格 doc_spec_0321 定案 |
| **FATE-10** | M7 | 特種兵虎符規則落地（糧草消耗 Q62、Set 羈絆冷卻-10% Q64，不設冷卻 Q61） | logic | 3 | 🟢 已接線 | - | 依 Q61~Q64 裁決實作召喚扣糧與 Set 羈絆加成；歸屬釐清後交由兵種虎符規格 | [v8 核對 2026-10-15] 特種兵虎符回歸測試（39374999，FATE-10）；規則引用見 BattlePowerRating；糧草 Q62 與 Set 冷卻 Q64 未逐項核對 |  |
| **FATE-11** | M10 | 宿命與轉職劇本文案（5 段台詞+6 字串 Key）進 i18n | content | 1 | 🟢 已接線 | - | 文案 Key 全部進入 i18n 表並可於畫面顯示 | [v12 核對 2026-10-20] 轉職與宿命文案進語系表（8b251e8b，PROG-2-0734，#586）；工作包已更正為 5 段台詞（依規格 §G，PM 2026-10-20） |  |
| **LIFE-01** | M1 | 壽命上限計算（65+紅因子×3+隨機 -5~+10） | logic | 1 | ✅ 已驗收 | - | resolveMaxLifespan 以 id 決定性產生 60~75，紅因子每級 +3，測試通過 | GeneralAging.ts resolveMaxLifespan；規格書 doc_spec_0568（武將每季增齡生老病死狀態機與壽命超齡死亡率精算規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0568 落地，65歲基準+紅因子×3+確定性種子偏移計算確立 |
| **LIFE-02** | M1 | 每季增齡與年齡階段判定（幼兒/少年/青年/壯年/老年/超齡）及能力修正係數 | logic | 2 | ✅ 已驗收 | LIFE-01 | 每季+0.25 歲；Phase 與能力修正（×0.6/1.0/1.1/0.8/0.5）依表計算，測試通過 | GeneralAging.ts resolveAgePhase；規格書 doc_spec_0568（武將每季增齡生老病死狀態機與壽命超齡死亡率精算規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0568 落地，每季+0.25歲與六階段能力修正係數確立 |
| **LIFE-03** | M1 | 退役候選判定（65 歲事件，一次性） | logic | 1 | ✅ 已驗收 | LIFE-02 | 跨過 65 歲時只發一次 reached-retirement-age 事件 | GeneralAging.ts reached-retirement-age；規格書 doc_spec_0568（武將每季增齡生老病死狀態機與壽命超齡死亡率精算規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0568 落地，65歲門檻跨越一次性全域事件廣播確立 |
| **LIFE-04** | M1 | 死亡判定（超齡死亡率 min(0.8, Over_Age×0.1)，死者不再增齡） | logic | 1 | ✅ 已驗收 | LIFE-02 | 超齡且擲骰小於死亡率則 status=dead；死者不再增齡，測試通過 | GeneralAging.ts deathChancePerSeason；規格書 doc_spec_0568（武將每季增齡生老病死狀態機與壽命超齡死亡率精算規格書） | [v17.3 核對 2026-11-08] 規格書 doc_spec_0568 落地，超齡每季死亡率min(0.8, OverAge×0.1)與凍結死者增齡確立 |
| **LIFE-05** | M1 | 壽命 UI（年齡/壽命進度條、階段標籤、死亡通知） | ui | 2 | 🟢 已接線 | LIFE-02 | 武將詳情顯示 UI_AGE_DISPLAY/UI_LIFESPAN_BAR/階段名稱 | [v3 核對 2026-10-13] PROG-2-0074 壽命 UI（d4be8a0）：年齡/壽命進度與階段，CharacterDs3StatsChild / GeneralDetailBasicsChild |  |
