---
doc_id: doc_index_1005
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-25
created_by_agent: codex
last_updated: 2026-05-25
---

# ATM Agent-First 可操作性任務索引

Related plan: ../ATM Agent-First 可操作性優化計畫書.md

| Task ID | Title | Milestone | Status | Depends | Surface | Routed Existing Work |
|---|---|---|---|---|---|---|
| [TASK-AAO-0000](./TASK-AAO-0000-doc-finalize-bridge-index.task.md) | AAO 文件區初始化與 ASA 橋接索引 | M0 | done | none | 3KLife docs | — |
| [TASK-AAO-0001](./TASK-AAO-0001-report-overlap-matrix-routing.task.md) | 報告問題 overlap matrix 與任務路由裁決 | M1 | open | TASK-AAO-0000 | docs / analysis | TASK-ATD-0023, TASK-ATD-0032 |
| [TASK-AAO-0002](./TASK-AAO-0002-cli-spec-runner-ssot-drift-guard.task.md) | CLI command spec / runner SSOT drift guard | M1 | open | TASK-AAO-0001, TASK-ASA-0009 | CLI surface | — |
| [TASK-AAO-0003](./TASK-AAO-0003-next-decisiontrail-json-contract.task.md) | `next` decisionTrail JSON contract | M1 | open | TASK-AAO-0001, TASK-ASA-0009 | CLI JSON | — |
| [TASK-AAO-0004](./TASK-AAO-0004-validator-failure-envelope-normalization.task.md) | validator failure envelope 標準化 | M2 | open | TASK-AAO-0001, TASK-ASA-0010 | validators | — |
| [TASK-AAO-0005](./TASK-AAO-0005-cli-context-slimming-wave1.task.md) | CLI 巨型檔案 context slimming wave 1 | M2 | open | TASK-AAO-0002, TASK-AAO-0003, TASK-ASA-0009 | `tasks.ts`, `next.ts` | — |
| [TASK-AAO-0006](./TASK-AAO-0006-docs-schema-command-drift-guard.task.md) | docs / schema / command drift guard | M3 | open | TASK-AAO-0002, TASK-AAO-0004, TASK-ASA-0010, TASK-ASA-0014 | docs / schema | — |
| [TASK-AAO-0007](./TASK-AAO-0007-onefile-size-startup-budget.task.md) | onefile size / startup budget | M3 | open | TASK-AAO-0001, TASK-ASA-0014, TASK-ATD-0025, TASK-ATD-0032 | release / onefile | TASK-ATD-0025, TASK-ATD-0032 |
| [TASK-AAO-0008](./TASK-AAO-0008-roadmap-backwrite-bridge-closure.task.md) | AAO roadmap backwrite 與 ASA bridge closure | M4 | open | TASK-AAO-0005, TASK-AAO-0006, TASK-AAO-0007 | docs / bridge | TASK-ASA-0001~0016 |

## Bridge Notes

- `TASK-ATD-0023` 已承接 `any` debt budget；AAO 只在路由矩陣引用，不重複開卡。
- `TASK-ATD-0025` 已承接 release parity gate；AAO 的 onefile 預算需建立在 parity gate 之上。
- `TASK-ATD-0032` 已承接 root-drop sandbox E2E；AAO 不再建立第二套 release sandbox 任務。
- `TASK-ASA-*` 仍然是自我原子化主線；AAO 只處理 Agent-First operability follow-up。

