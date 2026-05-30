---
doc_id: doc_other_1452
id: "TASK-AAO-0097"
title: "tasks.ts wave 3-B file-I/O helpers split"
owner: "GitHubCopilot"
priority: "P1"
status: "in-progress"
type: "refactor"
phase: "M2"
created: "2026-05-30"
created_by_agent: "GitHubCopilot"
started_at: "2026-05-30T20:50:12+08:00"
started_by_agent: "antigravity-gemini-3.5-flash"
related_cards: []
depends: ["TASK-AAO-0096"]
notes: "2026-05-30 | 狀態: in-progress | 驗證: pending | 變更: 開卡完成，準備 Phase 1 移出實作 | 阻塞: 無"
---

# TASK-AAO-0097 tasks.ts wave 3-B file-I/O helpers split

## 摘要
延續 wave 3 切片飛輪。0096 LegacyRoutePlan 標記 37 個 safeFirstAtoms。本卡（3-B）切出 file-I/O cluster 7 個函數至新檔 packages/cli/src/commands/tasks/task-file-io-helpers.ts，原 tasks.ts re-export 維持向後相容。

所有 7 個函數均為 plan 認定 safeFirstAtoms (riskLevel: low / behavior: atomize / callerDemand: 0)，拆分零安全風險。

## 驗證條件
- npm run typecheck
- npm run validate:cli
- npm run validate:git-head-evidence
- node atm.mjs hook pre-commit --json → ok:true
- node atm.mjs atomize score → score ≥ 95、grade A（不退步）
- 新 test 全綠

## 交付物
- packages/cli/src/commands/tasks.ts (移出 7 函數、留 re-export)
- packages/cli/src/commands/tasks/task-file-io-helpers.ts (新建)
- tests/unit/task-file-io-helpers.unit.test.ts (新建測試)
- atomic_workbench/atomization-coverage/path-to-atom-map.json (新 atom 登記)

## 相關聯任務卡
- depends_on=[TASK-AAO-0096]

## 備註
- 2026-05-30 | 狀態: in-progress | 驗證: pending | 變更: 開卡完成，準備 Phase 1 移出實作 | 阻塞: 無

