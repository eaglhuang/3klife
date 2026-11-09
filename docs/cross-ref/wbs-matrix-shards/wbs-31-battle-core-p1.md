# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.1 戰鬥核心（1/7）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.1 戰鬥核心（1/7）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.1 1. 戰鬥核心系統 (Battle Core) · 第 1/7 段

> 涵蓋兵種虎符、武將奧義、守軍戰力、督軍技能、關卡進程、戰法連鎖、場景機制、戰場部署、適性影響與戰術 AI。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **TRP-01** | M7 | 七大基礎兵種數值與特性定義（騎/步/弓/盾/槍/水/機械） | data | 2 | 🟢 已接線 | - | 七大兵種攻防、移動、射程與剋制規則定案 | 已由 doc_spec_0317 確立七大基礎兵種、五角剋制(×1.3/×0.8)與機械近戰受剋(×1.5)單一標準 | [v17.3 更正 2026-11-07] 僅資料→已接線；規格 doc_spec_0317 定案 |
| **TRP-02** | M7 | 五角兵種剋制與機械被近戰剋制傷害倍率 | logic | 2 | ✅ 已驗收 | TRP-01 | 單元測試覆蓋 5 組剋制 ×1.3、反向 ×0.8、近戰剋機械 ×1.5 | [v6 核對 2026-10-14] 兵種剋制表改為規格五角、機械被近戰 ×1.5（4fa7790c，PROG-2-0341）；反向被剋 ×0.8（d24c6b90，PROG-2-0340）；FormulaSystem 與戰場接線 |  |
| **TRP-03** | M5 | 武將兵種適性指揮效率（S1.2~D0.8）套用至部隊攻防 | logic | 1 | ✅ 已驗收 | TRP-01 | 部隊攻防 = 基礎 × APTITUDE_MOD[適性]，測試覆蓋 S~D | [v3 核對 2026-10-13] BattleAptitude.ts 接入 BattleCombatResolver.getUnitAptitude；tests/BattleAptitude.test.ts 含「S 平原騎兵比 D 更痛」戰場回歸 |  |
| **TRP-04** | M7 | 特殊兵種資料表（17 通用 + 17 專屬共 34 營）含戰法/Skin/血脈欄位 | data | 3 | 🟢 已接線 | TRP-01 | TroopDef 34 營資料規格、1500固定兵力與無冷卻規則定案 | 已由 doc_spec_0317 定案 17 通用營 + 17 專屬營編制、1500固定兵力、無冷卻與戰法映射管線 | [v17.3 更正 2026-11-07] 僅資料→已接線；規格 doc_spec_0317 定案 |
| **TRP-05** | M8 | 虎符資料模型與背包（TigerTally/PlayerTallyCollection/Server 表） | data | 3 | 📄 僅資料 | TRP-04 | TigerTally 型別、本機存檔結構與 server DDL 落地並可序列化 | assets/scripts/shared/TallyCardContract.ts 僅為卡面 UI 契約（TallyCardData），無 Quality/Star/Equipped_General_UID 等欄位 |  |
| **TRP-06** | M4 | TigerTallyScore 品質映射（0.7 戰績+0.3 傳承；R/SR/SSR/UR 門檻） | logic | 1 | ✅ 已驗收 | TRP-05 | 純函式測試：分數 39/40/65/85 邊界對應品質 | [v4 核對 2026-10-13] TigerTallyScore 品質映射（既有）；陣亡分數權重暫定於 TallyDeathSettlement.ts（PROG-2-0236）；戰績分來源仍為暫定 |  |
| **TRP-07** | M4 | 虎符三進路產出（死亡結算/招降移交/封賞結算） | logic | 4 | ✅ 已驗收 | TRP-05, TRP-06 | 死亡結算產卡、招降隔季移交、勝無退路君主獲封賞各有整合測試 | [master fb02ff9 重估] tests/TigerTally.test.ts、LegacyTally.test.ts（run-cli 通過） |  |
| **TRP-08** | M5 | 虎符裝備/卸下/轉交與唯一持有、君主沒收、陣亡退回君主 | logic | 3 | ✅ 已驗收 | TRP-05 | 一將一符、一符一將、死亡自動退君主、沒收觸發降忠，單元測試通過 | [v4 核對 2026-10-13] TigerTallyHoldings.ts（一符一將、陣亡退回君主、沒收）接 GameSession/LegacyService（PROG-2-0233/0235/0236/0239）；tests/TigerTallyHoldings.test.ts、TigerTally.test.ts 通過 |  |
| **TRP-09** | M5 | 虎符拔除/換上忠誠度與反洗機制（每季1次、連續×1.5、轉蛋名將鎖100） | logic | 2 | ✅ 已驗收 | TRP-08 | 依品質增減忠誠、clamp 0~100、連續兩季×1.5，忠誠<30拒命/<10叛變機率可測 | [v4 核對 2026-10-13] TigerTallyLoyalty 接 GameSession 與存檔（PROG-2-0218）；BattleController.ts 忠誠<30 每回合拒令（PROG-2-0219）；tests/TigerTallyLoyalty.test.ts、TigerTallyWiring.test.ts 通過；換上/拔除 UI 未核對 |  |
| **TRP-10** | M7 | 虎符星級養成 1~3★ 戰鬥經驗升星（含品質封頂與 +8%/★） | logic | 2 | 🟢 已接線 | TRP-05 | 累積 100/350 經驗自動升 2/3★；R 封頂 3★；星級倍率 1.08~1.40 | [v7 核對 2026-10-14] TigerTallyStar 接卡片實例星級與戰鬥經驗（06a3b38a、ccc4a29f，PROG-2-0571），4 處呼叫端；升星 UI 未核對 | [v17.3 規格整併 2026-11-08] 規範於 doc_spec_0597《虎符一至五星經驗升星與精華突破狀態機規格書》 |
| **TRP-11** | M8 | 4~5★ 虎符精華突破（成功率80/50、保底符、UR+10%、失敗扣材料） | logic | 2 | 🟢 已接線 | TRP-10 | 突破扣金幣與精華、成功率與失敗規則經測試，保底符 100% | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 | [v17.3 規格整併 2026-11-08] 規範於 doc_spec_0597《虎符一至五星經驗升星與精華突破狀態機規格書》 |
| **TRP-12** | M7 | 虎符糧草消耗表與戰場召喚扣糧/扣投入兵力/糧不足8折 | logic | 3 | 🟢 已接線 | TRP-05 | 召喚虎符部隊同時扣糧草（品質×星級查表）與出征軍勢兵力；季末糧<50 次場8折 | [v6 核對 2026-10-14] 虎符糧不足 8 折接線（e4f8a267，PROG-2-0331）；糧草消耗表既有 | [v17.3 規格整併 2026-11-08] 規範於 doc_spec_0598《虎符戰場召喚糧草消耗矩陣與軍勢兵力扣減規格書》 |
| **TRP-13** | M7 | 虎符適性乘數（地形S~D、家族共鳴+8%、史實羈絆+5%、性別+6%） | logic | 2 | ✅ 已驗收 | TRP-05 | getTallyAffinityMod 測試覆蓋地形/家族/性別組合 | [v6 核對 2026-10-14] 虎符適性乘數接上戰場管線（7e3a73b0）與出陣 UI 帶入參數（f5762a7d）；TallyDeployAffinity 1 處呼叫端、測試通過 |  |
| **TRP-14** | M7 | Set 羈絆（五虎將/江東十二虎臣/曹魏五謀）判定與攻防加成 | logic | 2 | 🟢 已接線 | TRP-04, TRP-12 | getActiveSets 以在場虎符部隊（含好友）判定，同 Set 不疊加，BattleController 套用加成 | [v7 核對 2026-10-14] TigerTallySetBonus 接戰場 BattleCombatResolver（915a50b5，PROG-2-0574）；陣容面板 UI 未核對 |  |
| **TRP-15** | M7 | 虎符特殊戰法執行（34 條兵種專屬戰法接 BattleSkill 管線） | logic | 5 | 🟢 已接線 | TRP-04 | 每條虎符戰法對應 battleSkillId 並有 smoke 測試 | battle/skills/adapters/TigerTallyTacticAdapter.ts 經 BattleSkillDispatcher 接進戰鬥；core/config/TigerTallySpecTactics.ts；PROG-2-0928（#831） | [v17.2 更正 2026-11-07] 純邏輯→已接線；34 條戰法對照已進 BattleSkill 管線 |
| **TRP-16** | M10 | 虎符卡面 UI：名錄、詳情、卡片顯示投入兵力/糧耗/星級倍率 | ui | 4 | 🟢 已接線 | TRP-04 | EliteTroopCodex 34 筆可瀏覽；卡面 287x142 尺寸與四大核心標籤規範齊備 | 規格見 doc_spec_0355；assets/scripts/ui/components/EliteTroopCodexComposite.ts、TigerTallyComposite.ts | [v18.5 核對 2026-11-07] 規格 doc_spec_0355 定案 |
| **TRP-17** | M10 | troops_*.png 八張部隊卡圖量產與 fallback 規則 | content | 2 | 🟢 已接線 | - | assets/resources/ui/tiger-tally/card-art/ 缺圖時秒級退回 troops.png 零破圖 | 規格見 doc_spec_0355；TallyCardArtLoader 動態降級備援協定定案 | [v18.5 核對 2026-11-07] 規格 doc_spec_0355 定案 |
| **TRP-18** | M10 | 英靈插卡演出（祖紋亮起→靈獸虛影→英靈面→軍勢進場）與血脈紋樣一致性 | ui | 4 | 🟢 已接線 | TRP-16 | 插卡流程四段演出可播放，旗紋/兵牌/卡面共用同一 Sigil_Pattern_ID | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（純邏輯）；待 QA／實機驗收 | 純邏輯→已接線；#1320 TallyInsertTarget 接 CharacterDs3AptitudeChild；演出部分未逐項核對 |
| **TRP-19** | M10 | 兵種/虎符 UI 字串與劇本文案（G/H 節 Key 落地） | content | 1 | 🟢 已接線 | - | UI_TALLY_*、UI_TROOP_* 等 Key 進入 i18n 且畫面引用，四語系安全回退 | 規格見 doc_spec_0342；34 營名稱、描述、戰法與虎符面板 key 命名契約定案 | [v18.1 更正 2026-11-07] 純邏輯→已接線；規格 doc_spec_0342 定案 |
| **TRP-20** | M9 | 虎符名錄圖鑑（P2）與委任AI虎符出展策略（依智力，細節歸 doc_spec_0040） | logic | 3 | 🟢 已接線 | TRP-12 | 圖鑑記錄已獲虎符四態轉換；委任模式依智力(≥75)/糧草決定出展時機 | 規格見 doc_spec_0346；EliteTroopCodex 圖鑑狀態機與委任 AI 出展調配模型定案 | [v18.2 更正 2026-11-07] 未開始→已接線；規格 doc_spec_0346 定案 |
| **ULT-01** | M7 | 奧義母表 ultimate-definitions.json（13 名將×5 槽=65 條）與 ultimateSlots 對齊 | data | 2 | ✅ 已驗收 | - | 65 條皆有 id/templateId/slot/scalingStat/inheritanceGeneId，schema 驗證通過 | assets/resources/data/master/ultimate-definitions.json 共 65 條；tools_node/generate-ultimate-definitions.js；tools_node/validate-generals-data.js |  |
