---
task_id: TASK-AAO-0099
title: "MRP batch-3 leaf extraction（3× throughput pilot）"
status: in_progress
priority: high
created_at: 2026-05-30T22:30:47+08:00
created_by_agent: antigravity-gemini-3.5-flash
started_at: 2026-05-30T22:30:47+08:00
started_by_agent: antigravity-gemini-3.5-flash
closure_authority: target_repo
depends_on:
  - TASK-AAO-0098
scopePaths:
  - .atm/history/reports/candidates/
  - .atm/history/reports/
  - packages/cli/src/commands/**（依 candidates rank 動態決定）
deliverables:
  - "candidates rank 4 報告（ranking + source-inventory + police-family + guidance-drift-police）"
  - "3 個 leaf 函數從 top candidate 抽取至 helper module(s)"
  - "per-leaf smoke evidence 各 2 份（共 6 份 logs）"
  - "per-leaf rollback-ready patch 各 1 份（共 3 份）"
  - "per-leaf rollback-proof JSON 各 1 份（共 3 份）"
  - "per-leaf actual-patch-evidence JSON 各 1 份（共 3 份）"
  - "batch-level envelope JSON（含 3 leaf 彙整 + batch rollback proof）"
  - "3 個 leaf 各自單元測試"
validators:
  - "node atm.mjs hook pre-commit --json → ok:true"
  - "node atm.mjs atomize score → ≥95/A 不退步"
  - "npm run typecheck → exit 0"
  - "3 leaf helper 模組抽取且 re-export 無破壞"
  - "3 leaf 單元測試全數通過"
  - "batch-level envelope JSON 與 3 組 evidence 完整備齊"
atomizationImpact: "MRP 批次 leaf extraction 吞吐量試驗，探索 3x 併行 leaf 萃取之治理邊界"
outOfScope:
  - "完整 v2-r2 map workflow（lane transitions）— 留 Window 3"
  - "手切其他 cluster"
nonGoals:
  - "一次抽超過 3 個 leaves"
  - "達到 dogfood 96+"
notes: "2026-05-30 | 狀態: in-progress | 驗證: pending | 變更: 開卡完成 (Phase 0) | 阻塞: 無"
---

# TASK-AAO-0099 MRP batch-3 leaf extraction（3× throughput pilot）

## 摘要
MRP batch-3 leaf extraction 吞吐量試驗，探索 3x 併行 leaf 萃取之治理邊界。依 `atm candidates rank` 排序選定 top 1 檔案，從中萃取 3 個 pure leaf 函數至個別獨立的 helper 模組。

## 驗證條件
- `node atm.mjs hook pre-commit --json` → `ok:true`
- `node atm.mjs atomize score` → `≥95/A 不退步`
- `npm run typecheck` → `exit 0`
- 3 leaf helper 模組抽取且 re-export 無破壞
- 3 leaf 單元測試全數通過
- batch-level envelope JSON 與 3 組 evidence 完整備齊

## 交付物
- candidates rank 4 報告（ranking + source-inventory + police-family + guidance-drift-police）
- 3 個 leaf 函數從 top candidate 抽取至 helper module(s)
- per-leaf smoke evidence 各 2 份（共 6 份 logs）
- per-leaf rollback-ready patch 各 1 份（共 3 份）
- per-leaf rollback-proof JSON 各 1 份（共 3 份）
- per-leaf actual-patch-evidence JSON 各 1 份（共 3 份）
- batch-level envelope JSON（含 3 leaf 彙整 + batch rollback proof）
- 3 個 leaf 各自單元測試

## 相關聯任務卡
- depends_on: [TASK-AAO-0098]

## 備註
- 2026-05-30 | 狀態: in-progress | 驗證: pending | 變更: 開卡完成 (Phase 0) | 阻塞: 無
