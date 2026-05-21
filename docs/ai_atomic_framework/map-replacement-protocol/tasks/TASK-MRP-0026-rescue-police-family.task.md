---
doc_id: doc_other_0167
task_id: TASK-MRP-0026
title: Rescue Police Family（救援警察家族）
milestone: M26
status: planned
blocked_by: [TASK-MRP-0018, TASK-MRP-0021]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0026 — Rescue Police Family（救援警察家族）

## 目標

ATM 既有警察家族（dedup / polymorph / quality / demand 等）監控**代碼**的健康。但隨著 v2 引入 Daemon（M22）、Guide Cache（M24）、Capsule Registry（M18/M21）等新狀態，**ATM 自身的內部狀態**也可能損壞。

**Rescue Police**：一個專門監控 **ATM 自身內部一致性**的警察家族。在每次 ATM 啟動、每次 mutation 前、daemon heartbeat 時觸發，發現 ATM 內部腐壞時立即阻擋一切 mutation，並指引使用 Disaster Recovery 工具（M27）。

---

## 為什麼需要這個警察家族

| 既有警察 | Rescue Police |
|---------|--------------|
| 管「使用者代碼」是否符合規範 | 管「ATM 自身運行狀態」是否健康 |
| 發現問題 → 提示使用者修代碼 | 發現問題 → 阻擋 mutation，指引 rescue CLI |
| 失靈最多影響一次提交 | **失靈會讓整個 ATM 治理失效**，AI 開始亂飄 |

---

## ATM 健康不變項（INV-RESCUE-*）

| ID | 不變項 | 失敗症狀 |
|----|--------|---------|
| INV-RESCUE-001 | `atomic-registry.json` 中所有 atom_id 對應 source 檔案存在 | atom 被刪除但 registry 仍指向 → AI 載入找不到 atom |
| INV-RESCUE-002 | `capsule-registry.json` 每個 CID 可解壓縮 | capsule 損壞 → 共享原子無法重建 |
| INV-RESCUE-003 | `map-registry.json` 每個 map:cid 的 memberAtomCids 都存在 | Map Merkle tree 斷裂 |
| INV-RESCUE-004 | 每個 `lineage-log.json` timestamp 嚴格單調遞增 | 時序紊亂 → progression policy 誤判 |
| INV-RESCUE-005 | `binding-schema-registry.json` 所有 entry 是合法 JSON Schema | edge contract 測試會誤過 |
| INV-RESCUE-006 | `.atm/runtime/policy.json` 通過 schema 驗證 | policy 損壞 → 治理規則全部失效 |
| INV-RESCUE-007 | `vendor/atoms/` 與 capsule registry 雙向一致 | 孤兒 capsule 或孤兒 registry entry |
| INV-RESCUE-008 | `.atm-guide-cache/` 沒有指向已不存在的 git commit | cache 中毒 → AI 用過時資訊決策 |
| INV-RESCUE-009 | daemon PID 檔指向的 process 確實是 ATM daemon | 孤兒 PID → daemon double-start |
| INV-RESCUE-010 | 所有 evidence JSON 通過對應 schema | evidence 已 closed 但實際無效 |

---

## Finding 結構

```json
{
  "policeFamily": "rescue",
  "trigger": "atm-internal-state-corruption",
  "scope": "atm-internal",
  "severity": "blocker",
  "action": "block-all-mutations",
  "invariantId": "INV-RESCUE-002",
  "affectedFile": "vendor/atoms/zQmXG7f.json",
  "recoveryHint": "node atm.mjs rescue rebuild-registry --json",
  "rollbackInstructions": "TASK-MRP-0027 災難恢復工具",
  "readModel": "atm-internal://capsule-registry-snapshot/<hash>",
  "evidenceRefs": [...]
}
```

**關鍵**：Rescue Police 的 finding **永遠是 blocker，且 directApplyAllowed=false**。發現腐壞後，所有 mutation 指令（apply / merge / close 等）一律拒絕，直到 rescue CLI 修復後才解鎖。

---

## 觸發時機

| 時機 | 檢查強度 |
|------|---------|
| 每次 `node atm.mjs` 啟動 | 快速檢查（檔案存在 + JSON 可解析） |
| 每次 mutation 前（apply、close、merge） | 完整檢查（所有 INV-RESCUE-*） |
| Daemon heartbeat（M22）| 增量檢查（只看上次後改動的檔案） |
| 手動 `node atm.mjs rescue diagnose --json` | 強制完整檢查 + 產出診斷報告 |

---

## CLI 設計

```bash
# 手動觸發完整檢查
node atm.mjs rescue police --json
# → 列出所有 finding，每個指向對應 recovery 指令

# 列出最近 rescue 事件
node atm.mjs rescue police --log --tail 20 --json
```

---

## 前置依賴

- TASK-MRP-0018（Capsule Registry，要監控）
- TASK-MRP-0021（Map Registry，要監控）

## 輸入

- `.atm/runtime/policy.json`、`atomic-registry.json`、`capsule-registry.json`、`map-registry.json`、`binding-schema-registry.json`
- `vendor/atoms/`、`vendor/maps/`、`.atm-guide-cache/`、`.atm/daemon/`
- 所有 `lineage-log.json`、`evidence/*.json`

## 輸出

1. `node atm.mjs rescue police --json` CLI
2. `rescue-report.json`（schema: `atm.rescuePoliceReport`）
3. 整合到 `core-police-gate-runner`（APF-0015）作為新 family

## 驗收條件

- [ ] 10 個 INV-RESCUE-* 都有對應 fixture（positive + negative）
- [ ] 任一 INV 失敗 → block-all-mutations 立即生效
- [ ] `recoveryHint` 指向具體 rescue CLI 指令
- [ ] 不變項全通過時，rescue police 不阻擋任何指令（無誤報）
- [ ] 整合進 core police gate runner，啟動時自動跑
- [ ] daemon 啟動時必須通過 rescue police 才允許開始監控

## 影響檔案

- `packages/core/src/police/rescue-family.ts`（新增）
- `packages/core/src/police/invariants/rescue/*.ts`（10 個 INV 各一個檔案）
- `packages/core/src/cli/rescue.ts`（新增 `rescue police` subcommand）
- `schemas/reports/rescue-police-report.schema.json`（新增）
- `tests/police/rescue-family.test.ts`（新增）

## 回滾策略（本卡功能回滾）

移除 `rescue-family.ts` 與 10 個 invariant 檔案；CLI subcommand 移除；core police gate runner 不再呼叫 rescue family。ATM 回到「不檢查自身健康」狀態（不推薦，但功能上完全可運作）。

## Checklist

- [ ] 10 個 INV-RESCUE-* 個別實作
- [ ] Finding shape 定義
- [ ] 觸發時機整合（啟動 / mutation 前 / daemon heartbeat）
- [ ] `rescue police` CLI
- [ ] `rescue-report.json` schema
- [ ] fixture 全套（10 INV × 2 case）
- [ ] core police gate runner 整合
- [ ] CHANGELOG 補記
