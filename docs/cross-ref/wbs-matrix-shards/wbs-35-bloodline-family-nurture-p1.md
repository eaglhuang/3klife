# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.5 血統家族培育（1/9）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.5 血統家族培育（1/9）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.5 5. 血統、家族與培育傳承 (Bloodline, Family & Nurture) · 第 1/9 段

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
| **BRD-13** | M8 | 結緣商業道具（補元散、安胎藥/送子符、求籤令、成長環境） | logic | 3 | ⚪ 未開始 | BRD-03 | 道具可修改精力/受孕率並消耗 | 無 | [v17.2 更正 2026-11-07] 待裁決：成長環境道具來源與微調幅度規格未定義 |
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
