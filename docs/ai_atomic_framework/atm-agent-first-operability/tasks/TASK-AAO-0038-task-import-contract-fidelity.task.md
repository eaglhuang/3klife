---
doc_id: doc_task_aao_0038
task_id: TASK-AAO-0038
title: "Task import contract fidelity"
status: done
owner: atm-core
priority: P0
milestone: M13
depends_on:
  - "TASK-AAO-0012"
  - "TASK-AAO-0025"
  - "TASK-AAO-0034"
  - "TASK-AAO-0036"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/task-intent.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/task-intent.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:prompt-scoped-next"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert import fidelity changes; imported ledgers return to previous reduced projection behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing human task-card authoring format beyond the existing contract"
  - "Making planning paths writable target files"
nonGoals:
  - "Building a second task registry"
  - "Replacing Markdown task cards with a new storage model"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
---
# TASK-AAO-0038 — Task import contract fidelity

## Goal

`tasks import` 從 Markdown task card 或 plan 匯入時，必須完整保留治理會用到的機器欄位，不可以只留下簡化版 title/status/dependencies/deliverables。

## Why

實戰中完整 scope 和 closure 權限在 3KLife task card 裡，但匯入 target repo 後被降階，導致 `next --claim` 產生過窄 direction lock、pre-commit 看不懂 staged files 其實是合法交付物。

## Implementation Contract

- Import ledger 必須保留或等價投影：`scopePaths`、`allowed_files` legacy alias、`deliverables`、`validators`、`target_repo`、`planning_repo`、`closure_authority`、`planningMirrorPaths`、`planningReadOnlyPaths`、`outOfScope`、`nonGoals`、`evidence`、`rollback`、`atomizationImpact`。
- `allowed_files` 匯入時轉成 `scopePaths`，但保留 lineage/diagnostic，避免舊卡直接失效。
- `next --claim` 的 target allowed files 必須優先吃 import 後的 target work 欄位，而不是重新從 prose 猜。
- Import dry-run 必須顯示欄位是否被保留與任何降階 warning。
- 不得把 planning repo path 混入 target `allowedFiles`，除非 task 明確是 planning/mirror/import 類型。

## Deliverables

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/task-intent.ts`
- `packages/cli/src/commands/task-direction.ts`
- `packages/cli/src/commands/command-specs/tasks.spec.ts`
- `scripts/validate-prompt-scoped-next.ts`
- `scripts/validate-task-ledger-governance.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `npm run validate:prompt-scoped-next`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`

## Acceptance Criteria

- 從 3KLife AAO task card dry-run import 後，輸出含完整 machine fields，不再只剩簡化欄位。
- Ledger JSON 中可找到 `target_repo`、`closure_authority`、`scopePaths`、`deliverables`、`validators`、`planningMirrorPaths` 或等價欄位。
- `next --claim` 對含 artifact deliverables 的 task 產生完整 direction lock。
- Planning path 只出現在 planning/read-only 欄位，不進 target allowed files。
- Regression test 覆蓋 legacy `allowed_files` alias。


<!-- AAO-feedback-0038-initial-allowedfiles -->
## Feedback Reinforcement Acceptance

- Initial `taskDirectionLock.allowedFiles` must include all target-repo `deliverables` from the task card plus standard governance paths for that task.
- Deliverables already declared in task frontmatter must not require a second scope amendment during `next --claim`.
- Import must preserve enough machine fields for `next --claim` to construct this lock without reading planning prose as writable target scope.
<!-- /AAO-feedback-0038-initial-allowedfiles -->

<!-- AAO-feedback-0038-utf8-planpath-fidelity -->
## Bug Reinforcement Acceptance: UTF-8 Plan Path Fidelity

- `tasks import`, `next --prompt`, and `next --claim` must preserve UTF-8 task-card and plan paths, including Traditional Chinese filenames and spaces.
- Required commands must never contain mojibake or replacement placeholders such as `????????` when the source path is a valid UTF-8 path.
- Regression evidence must cover a cross-repo planning path with Chinese characters, spaces, and a target-repo ledger import.
- If a path cannot be resolved, ATM must return a path-resolution diagnostic with the original raw path and normalized candidate paths, not a corrupted command.
<!-- /AAO-feedback-0038-utf8-planpath-fidelity -->

## Rollback

Revert this task commit. Existing imported tasks may need re-import if they were produced by the new fidelity projection.

## Atomization Impact

- Owner atom/map: `atm.task-ledger-governance-map`
- Map updates: `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

這張卡修的是「匯入不要失真」。它不改 AAO 卡片格式，只讓 ATM 更忠實地吃既有格式。
