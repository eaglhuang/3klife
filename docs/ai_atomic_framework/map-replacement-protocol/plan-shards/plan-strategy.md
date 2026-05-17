<!-- doc_id: doc_other_0149 -->
# 拆解大型功能優化原子map計畫書 — 成功標準與策略分析（§11–§14）

> 這是 `拆解大型功能優化原子map計畫書.md` 的「成功標準與策略分析（§11–§14）」分片。完整索引見 `docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md`。

## 11. 成功標準

完成後，ATM 應能回答：

1. 這個大型功能由哪個 map 代表？
2. map 的入口 atom 是誰？
3. 每個 member atom 在 map 中的 role 是什麼？
4. 每條 edge 是 data-flow、control-flow、validation 還是 side-effect？
5. 哪些 legacy URI 被這個 map 替代？
6. 哪個 report 證明 map 與 legacy 行為等價？
7. 修改某個 member atom 會影響哪些 maps？
8. canary/active/retired 的 upgrade gate 需要哪些 evidence？
9. rollback proof 或 retirement proof 在哪裡？
10. Agent 下一步應該跑哪些 deterministic checks？

## 12. 風險與避免方式

### 12.1 Map 變成文件而非治理物件

避免方式：replacement map 必須有 integration report、equivalence report 與 upgrade proposal gate。

### 12.2 Schema 變更破壞現有 0.1.0 map

避免方式：使用 specVersion 0.2.0 與 migration strategy，不直接改壞 0.1.0 validator。

### 12.3 Hash 邊界混亂

避免方式：結構欄位、語義欄位、rollout 狀態與 evidence refs 分層管理。

### 12.4 過早做 runtime engine

避免方式：MVP 只支援 documented/delegated execution，不承諾 orchestrated runtime。

### 12.5 Legacy 太早退役

避免方式：active 前需要 equivalence evidence，retired 前需要 rollback proof 或 retirement proof。

## 13. 最終建議

ATM 下一步應優先完成 Atom Map Replacement Protocol，而不是新增抽象層級。這能把 map 從「atoms 的關係圖」升級成「新功能與 legacy 大功能的正式替代表面」。

本計畫最重要的落點是：大型功能拆解後，治理中心不是單一 atom，也不是散落的 task，而是 canonical atomic map。Map 必須帶著角色、邊語義、legacy URI、equivalence evidence、rollout mode、propagation impact 與 rollback proof，才能真正接管原本的大功能。

## 14. 目標 A / B 的可達成性重新分析

本章把使用者明訂的兩個目標單獨拆出，逐點對映到 ATM 現況、缺口、與本計畫要交付的最小機制。目的是把「Map 接管大功能」從口號變成可驗證的 deterministic checklist。

### 14.1 目標 A：拆解後不是孤立 atom，而是由 atom 串成 map 接管大功能

目標原文：「新功能或 legacy 大功能被拆解後，不是變成一堆孤立 atom，而是由 atom 串成 map，讓 map 接管並取代原本的大功能。」

要可達成必須同時滿足三件事：

1. **拆解產物有強制 map 入口**：任何來自大功能的拆解流程，輸出的不只是 atoms，而是一份 `decomposition-plan`，且該 plan 必須能直接 instantiate 成一個 canonical map（`atomic_workbench/maps/<mapId>/`）。
2. **Map 必須宣告替代目標**：map 在 spec 階段就要記錄 `replacement.legacyUris[]`，否則它只是「atoms 的關係圖」，不是「替代表面」。
3. **沒有替代證據前，不准接管**：缺 equivalence / propagation / rollback evidence 時，replacement mode 不可超過 `draft`；upgrade proposal 在 `propose.ts` 應直接 block。

對映到本計畫的具體交付：

| 目標 A 子條件 | 由哪個機制保證 | 對應里程碑 | 對應任務卡 |
|---|---|---|---|
| 大功能拆解→ map 入口 | `create-map --spec` + `decomposition-plan` schema + `create-map --from-plan` | M7 / M9 | TASK-MRP-0007 / 0009 |
| Map 宣告替代目標 | Schema 0.2.0 `replacement.legacyUris[]` | M2 | TASK-MRP-0002 |
| 沒證據不准接管 | `upgrade/propose.ts` evidence gate + active evidence closure | M5 / M10 | TASK-MRP-0005 / 0010 |

達成判斷：以一個示範大功能（建議 `legacy://samples/checkout-mini`）走完「plan → map → integration → equivalence → shadow→canary→active」全流程，且 active gate 真的在沒 equivalence 時被拒絕一次，即視為目標 A 達成。

### 14.2 目標 B：map 從「atoms 的關係圖」升級為「正式替代表面」

目標原文：「從『map 是 atoms 的關係圖』升級成『map 是新功能 / legacy 大功能的正式替代表面』。」

「替代表面」必須同時具備四個語義承載點：

1. **結構語義**：每個 member 有 `role`，每條 edge 有 `edgeKind`，否則 map 只是無語意連線。
2. **替代契約**：`replacement.legacyUris`、`replacement.mode`、`replacement.evidenceRefs` 表達「這個 map 要替代誰、處於哪一段 rollout、有哪些證據」。
3. **可驗證等價**：必須有 `map-equivalence-report` 證明 map 與 legacy 在 fixture 集上行為等價；已知差異要明列 `knownDivergences`。
4. **退場安全**：到 `legacy-retired` 必須有 `rollback-proof` 或 retirement proof，且 caller 已清空。

對映到本計畫的具體交付：

| 目標 B 子條件 | 由哪個機制保證 | 對應里程碑 | 對應任務卡 |
|---|---|---|---|
| 結構語義 | Schema 0.2.0：`members[].role` + `edges[].edgeKind` | M2 | TASK-MRP-0002 |
| 替代契約 | Schema 0.2.0：`replacement.*` 區塊 + mapHash 邊界 | M2 | TASK-MRP-0002 |
| 可驗證等價 | `map-equivalence-report.schema.json` + `test --map --equivalence-fixtures` | M3 / M4 | TASK-MRP-0003 / 0004 |
| 退場安全 | upgrade / lane gate 對 `active → legacy-retired` 要求 rollback-proof 或 retirement-proof | M5 / M10 | TASK-MRP-0005 / 0010 |

達成判斷：對示範 map 執行 `upgrade --target map`，proposal 必須能在 JSON 輸出中同時引用 `map-equivalence` 與 `rollback-proof` input kind，且 rollout lane 的 lineage 能還原 `draft → shadow → canary → active → legacy-retired` 五段轉移歷史。

### 14.3 風險再校準

1. **被誤判為「文件層計畫」**：避免方式 = 每個里程碑都必須交付可執行 deterministic check，而非僅 markdown。
2. **Atoms 已先落地，但沒有對應 map**：避免方式 = 在 `decomposition-plan` 進入時，若未指定 `mapId` 或 `replacement.legacyUris`，CLI 應 hard-fail。
3. **Equivalence fixture 寫不出**：避免方式 = MVP 階段允許 `knownDivergences[]`，但必須走 review-advisory；不可靜默忽略。
4. **rollout lane 與 registry status 被混用**：避免方式 = registry status 改變不得自動改 `replacement.mode`，反向亦然；兩者由獨立 transition validator 管理。
