<!-- 分片：cross-ref-進度 / spec-audit-officer -->
# 規格逐條比對：官職系統.md (doc_spec_0014)

> 入口：[cross-ref-進度.md](../cross-ref-進度.md)｜比對卡 PROG-2-1619（2026-10-29）

## 結論

E 段 7 項邏輯皆有程式；本次補上 E-2「戰功」經驗來源。仍缺：E-2「治理」「聯盟參與」兩種來源（規格無數值）、將階 General_Rank 的晉升途徑（欄位存在但無任何升階邏輯）、晉升動畫（畫面）。

| 規格條目 | 規格要點 | 程式（符號） | 測試 | 判定 |
|---|---|---|---|:-:|
| E-1／F-2 階位表 | 5 階、100／260／520／920 EXP | `OfficerState`、`OfficerDisplay.OFFICER_TIER_TITLES`、`RankProgressText` | OfficerTierTable、OfficerTiersData | ✅ |
| E-2／F-1 經驗：任務 | 難度基礎 × 軍事 1.1 × 成功 1.0／失敗 0.4 | `OfficerState.calcOfficerExpGain`、`GameSession.settleHallMission` | OfficerState、OfficerPromotionE2E | ✅ |
| E-2 經驗：戰功 | 戰功累積官職經驗 | `GameSession.recordBattle` → `BATTLE_MERIT_OFFICER_TASK`（一般軍事任務：勝 19／敗 7，暫定） | OfficerBattleMerit | ✅（PROG-2-1619） |
| E-2 經驗：治理／聯盟 | 治理、聯盟參與累積 | 無 | — | ❌ 規格無數值 |
| E-3 雙牆任務解鎖 | 階位決定難度與欄位數 | `OfficerSnapshot` QUEST_CAP_BY_TIER／QUEST_COLUMNS_BY_TIER（欄位數暫定） | OfficerPermissions | ✅ |
| E-4 世界沙盤 | 郡守 S1、州牧 S2、霸府重臣 S3 | `OfficerSnapshot` SANDTABLE_BY_TIER、`GameSession.sandtableStage` | OfficerSnapshot | ✅ |
| E-5 聯盟／外交權限 | 州牧聯盟文書、霸府重臣反霸權會盟 | `OfficerUnlocks.allianceDocs`／`antiHegemonySummit`、`OfficerPermissionText` | OfficerPermissionText | ✅ |
| E-6 晉升提示與獎勵 | 升官動畫、文本、一次性獎勵 | `OfficerPromoted` 事件、`HallMissionSettlement`（晉升獎勵 PROG-2-1197） | OfficerPromotionE2E | 🟡 動畫未做 |
| E-7／F-3 天下大亂保留 | 官職與解鎖歷史不倒退 | `applyEraShiftToOfficerState` | OfficerHallYearsE2E | ✅ |
| 覆寫裁定 將階／名聲 | General_Rank／General_Fame 提高帶兵上限 | `GeneralUnit.generalRank／generalFame`、`computeCommandCapacity` | — | 🟡 無升階途徑 |
