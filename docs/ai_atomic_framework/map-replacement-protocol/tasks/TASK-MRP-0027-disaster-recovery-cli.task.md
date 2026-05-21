---
doc_id: doc_other_0168
task_id: TASK-MRP-0027
title: Disaster Recovery & Atom Reload CLI（災難恢復與原子重載工具）
milestone: M27
status: done
started_at: 2026-05-21T03:15:00Z
started_by_agent: ClaudeCode_haiku-4.5
completed_at: 2026-05-21T03:45:00Z
blocked_by: [TASK-MRP-0018, TASK-MRP-0021, TASK-MRP-0026]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
lastTransitionId: 2026-05-21T10-29-44-349Z-migrate-legacy-ledger-fcd5cdf82da8
lastTransitionAt: 2026-05-21T10:29:44.349Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.349Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:6ff7a40a54e8a051afdff96cbffbfb572c13762fad2c5b7cff18e9ae80fad3ab
---

# TASK-MRP-0027 — Disaster Recovery & Atom Reload CLI（災難恢復與原子重載工具）

## 目標

當 Rescue Police（M26）發現 ATM 內部狀態損壞時，使用者需要一個可靠的工具把 ATM 拉回健康狀態，**不需要手動編輯 `.atm/` 內部 JSON**。

本卡提供「核武級災難恢復套件」，最關鍵的能力：**從 `vendor/atoms/` capsule 與 evidence 歷史檔案，重新加載整個 ATM 內部狀態**。

---

## 設計哲學

ATM 的所有內部狀態（registry / lineage / cache）都應該是**可從 source-of-truth 重建的衍生資料**：

| 衍生資料 | source-of-truth |
|---------|----------------|
| `atomic-registry.json` | atom source 檔案 + map.spec.json |
| `capsule-registry.json` | `vendor/atoms/*.json` capsule 檔案 |
| `map-registry.json` | `vendor/maps/*.json` + capsule registry |
| `lineage-log.json` | `.atm/history/evidence/*.json` |
| `.atm-guide-cache/` | 永遠可丟棄（純效能 cache） |
| `binding-schema-registry.json` | map.spec.json 的 edges[] 反推 |

只要 source-of-truth 還在，就**永遠可以重建所有衍生資料**。這是 ATM 容災的根本不變項。

---

## CLI 設計

### 1. 診斷（read-only，安全）

```bash
node atm.mjs rescue diagnose --json
# → {
#     "healthScore": 0.85,
#     "criticalFindings": [...],   ← 來自 Rescue Police（M26）
#     "recommendedActions": [
#       "node atm.mjs rescue rebuild-registry --dry-run",
#       "node atm.mjs rescue reload-atoms"
#     ],
#     "recoverableData": {
#       "atomsFromCapsule": 23,
#       "mapsFromVendor": 1,
#       "lineageFromEvidence": 5
#     }
#   }
```

### 2. 重建 Capsule Registry（從 vendor/atoms/）

```bash
# Dry-run 先看會發生什麼
node atm.mjs rescue rebuild-registry --dry-run --json

# 實際執行（會備份原 registry 到 .atm/rescue-backup/）
node atm.mjs rescue rebuild-registry --confirm --json
# → {
#     "backedUpTo": ".atm/rescue-backup/capsule-registry.20260521-103045.json",
#     "rebuiltEntries": 23,
#     "orphanedCapsules": [...],   ← vendor/ 有但 registry 缺
#     "missingCapsules": [...]     ← registry 指向但 vendor/ 缺
#   }
```

### 3. 重新加載所有原子（核心功能）

```bash
# 從 vendor/atoms/ 完整重建 atom registry + 載回所有 atom source
node atm.mjs rescue reload-atoms --confirm --json
# → 解壓縮每個 capsule，寫回對應 source 路徑
#   並重建 atomic-registry.json
```

### 4. 重建 Map Registry

```bash
node atm.mjs rescue rebuild-maps --confirm --json
# → 從 vendor/maps/ + capsule registry 重建 map-registry.json
#   驗證 Merkle tree（所有 memberAtomCids 存在）
```

### 5. 從 evidence 重建 lineage-log

```bash
node atm.mjs rescue replay-lineage --map ATM-MAP-0001 --confirm --json
# → 掃描 .atm/history/evidence/*.json
#   依 timestamp 排序，重建 lineage-log.json
#   保留原始 lineage-log 為 .atm/rescue-backup/
```

### 6. 清除可拋棄狀態

```bash
node atm.mjs rescue clear-cache --confirm --json
# → 清空 .atm-guide-cache/、.atm-cache/、.atm/daemon/notifications.jsonl
```

### 7. 核武選項：Factory Reset

```bash
# 危險指令，需要 --confirm 與 --i-understand-this-deletes-state
node atm.mjs rescue factory-reset --confirm --i-understand-this-deletes-state --json
# → 備份整個 .atm/ 與 vendor/
# → 從 vendor/ 重建一切，丟棄所有 cache / daemon state / lineage 衍生資料
# → 保留：vendor/、所有 source 檔案、所有 evidence
# → 丟棄：所有 registry / lineage / cache / daemon
# → 之後重新跑：node atm.mjs rescue reload-atoms + rebuild-maps + replay-lineage
```

---

## 救援工作流（典型情境）

### 情境 A：Daemon 寫亂了 capsule registry

```
1. node atm.mjs next --json     → Rescue Police 報 INV-RESCUE-002 失敗
2. node atm.mjs rescue diagnose --json
3. node atm.mjs rescue rebuild-registry --dry-run
4. node atm.mjs rescue rebuild-registry --confirm
5. node atm.mjs next --json     → 恢復正常
```

### 情境 B：Guide Cache 被污染導致 AI 漂移

```
1. node atm.mjs rescue clear-cache --confirm
2. （cache 重建，下次 candidates rank 自動重算）
```

### 情境 C：誤刪 atom source 檔案

```
1. node atm.mjs rescue diagnose          → INV-RESCUE-001 失敗
2. node atm.mjs rescue reload-atoms --confirm   ← 從 capsule 解壓縮復原
3. node atm.mjs next                              → 恢復
```

### 情境 D：整個 .atm/ 被誤刪（最壞情況）

```
1. （只要 vendor/ 和 source 還在）
2. node atm.mjs rescue factory-reset --confirm --i-understand-this-deletes-state
3. node atm.mjs rescue reload-atoms --confirm
4. node atm.mjs rescue rebuild-maps --confirm
5. node atm.mjs rescue replay-lineage --map <每個 map> --confirm
6. ATM 完全恢復
```

---

## 不變項保證

| 不變項 | 保證方式 |
|--------|---------|
| 所有 rescue 指令必須 dry-run 可用 | 每個指令必加 `--dry-run` |
| 所有破壞性指令必須備份 | 自動寫入 `.atm/rescue-backup/<指令>.<timestamp>.json` |
| factory-reset 需雙重確認 | `--confirm` + `--i-understand-this-deletes-state` 兩個 flag 都缺一不可 |
| Rescue 工具自己不能觸發 Rescue Police 阻擋 | rescue subcommand 有特殊 bypass，不受 INV-RESCUE-* 阻擋 |
| 救援不破壞 evidence 與 source | factory-reset 也只清 derived state，**不動 source 與 evidence** |

---

## 前置依賴

- TASK-MRP-0018（Capsule Registry，主要救援目標）
- TASK-MRP-0021（Map Registry，次要救援目標）
- TASK-MRP-0026（Rescue Police，觸發救援的偵測層）

## 輸入

- `vendor/atoms/*.json`（atom capsule）
- `vendor/maps/*.json`（map capsule）
- `.atm/history/evidence/*.json`（重建 lineage 的素材）
- atom source 檔案（重建 atomic-registry 的素材）

## 輸出

1. `node atm.mjs rescue diagnose/rebuild-registry/reload-atoms/rebuild-maps/replay-lineage/clear-cache/factory-reset` CLI
2. `.atm/rescue-backup/<指令>.<timestamp>.json`（自動備份）
3. `schemas/reports/rescue-diagnose-report.schema.json`（新增）
4. `docs/ai_atomic_framework/map-replacement-protocol/disaster-recovery-runbook.md`（runbook 新增）

## 驗收條件

- [ ] `rescue diagnose` 不修改任何檔案（read-only）
- [ ] 每個破壞性指令在執行前自動備份到 `.atm/rescue-backup/`
- [ ] `rescue reload-atoms` 從 capsule 完整還原所有 atom source 檔案
- [ ] `rescue rebuild-registry` 後 Rescue Police 全綠
- [ ] `rescue replay-lineage` 後 lineage-log timestamp 嚴格單調
- [ ] `factory-reset` 缺任一 confirm flag → 拒絕執行
- [ ] `factory-reset` 後 source 與 evidence 完全未動
- [ ] 救援指令本身有 fixture：4 種情境（A/B/C/D）至少各一個 e2e 測試
- [ ] runbook 涵蓋 4 種情境的完整操作步驟

## 影響檔案

- `packages/core/src/rescue/disaster-recovery.ts`（新增）
- `packages/core/src/rescue/registry-rebuilder.ts`（新增）
- `packages/core/src/rescue/atom-reloader.ts`（新增）
- `packages/core/src/rescue/lineage-replayer.ts`（新增）
- `packages/core/src/cli/rescue.ts`（已在 M26 建立，新增 subcommands）
- `schemas/reports/rescue-diagnose-report.schema.json`（新增）
- `docs/ai_atomic_framework/map-replacement-protocol/disaster-recovery-runbook.md`（新增）
- `tests/rescue/disaster-recovery.test.ts`（新增）

## 回滾策略（本卡功能回滾）

移除 `rescue/` 目錄與 CLI subcommand；如果使用者已用本工具修復過 ATM，修復結果不受影響（已寫入的 registry / lineage 仍有效）。回滾僅移除「再次救援的能力」，不破壞既有救援成果。

`.atm/rescue-backup/` 目錄保留，作為歷史備份。

## 2026-05-21 v2-r2 審查補充

- 所有 mutating rescue command 預設 `--dry-run`；實際修復必須加 `--confirm`。
- 修復前需備份 `.atm/`、registry、lineage projection 與 cache manifest 到 `.atm/rescue-backup/<timestamp>/`。
- `factory-reset` 必須需要長確認字串，不可被 M23 `atm do` 自動觸發。
- Recovery report 必須可附到 task evidence，包含 repairedFiles、backupPath、sourceOfTruthUsed、remainingFindings。

新增驗收：
- [ ] mutating command 無 `--confirm` 時只 dry-run
- [ ] 修復前自動建立 backup 且 report 指向 backupPath
- [ ] factory-reset 需要長確認字串
- [ ] recovery report 可被 M25/M23 evidence flow 驗證

## Checklist

- [ ] `rescue diagnose`（read-only 健康診斷）
- [ ] `rescue rebuild-registry`（capsule registry 重建）
- [ ] `rescue reload-atoms`（從 capsule 還原 atom source）
- [ ] `rescue rebuild-maps`（map registry 重建）
- [ ] `rescue replay-lineage`（lineage-log 從 evidence 重建）
- [ ] `rescue clear-cache`（清除衍生 cache）
- [ ] `rescue factory-reset`（核武選項，雙重 confirm）
- [ ] 自動備份機制（`.atm/rescue-backup/`）
- [ ] dry-run 全指令支援
- [ ] disaster-recovery-runbook.md 文件
- [ ] 4 種典型情境 e2e 測試
- [ ] CHANGELOG 補記
