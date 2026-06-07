---
doc_id: doc_task_aao_0039
task_id: TASK-AAO-0039
title: "Planning-only ledger audit boundary"
status: done
owner: atm-core
priority: P0
milestone: M13
depends_on:
  - "TASK-AAO-0025"
  - "TASK-AAO-0038"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/next.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/next.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/validate-prompt-scoped-next.ts"
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
  notes: "Revert planning-only audit boundary logic and restore prior audit strictness."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Allowing target-repo work to bypass closure evidence"
  - "Treating broken target tasks as planning-only without explicit metadata"
nonGoals:
  - "Deleting planning tasks from source planning repo"
  - "Lowering audit requirements for framework source tasks"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
---
# TASK-AAO-0039 — Planning-only ledger audit boundary

## Goal

讓 ATM 分清楚 planning-only 任務和 target-repo implementation 任務。Planning repo 的 `done` 任務不應該因為被匯入 target repo 就變成全域 audit blocker。

## Why

`TASK-AAO-0000` 這種規劃初始化卡，本質上由 3KLife planning repo 關閉，不是 AI-Atomic-Framework 的 source work。它如果以 `done` target ledger 形式出現在 target repo，又缺 target closure metadata，就會把所有 commit 擋住。

## Implementation Contract

- Task ledger/audit 判斷需看 `planning_repo`、`target_repo`、`closure_authority`、`planningOnly` 或等價 metadata。
- `closure_authority: planning_repo` 或 `target_repo` 不等於目前 repo 的 task，不能以 target closure 缺失硬擋目前 repo commit；最多 warning，並給出 planning sync/import 建議。
- Target-repo tasks 仍維持嚴格 closure/evidence/audit。
- `tasks audit`/hook finding 要清楚標出 task 是 planning-only、external-planning，還是 target-authority。
- 不允許 AI 靠手改 metadata 把 target task 偽裝成 planning-only；import lineage 必須可追蹤。

## Deliverables

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/hook.ts`
- `packages/cli/src/commands/next.ts`
- `scripts/validate-task-ledger-governance.ts`
- `scripts/validate-prompt-scoped-next.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `npm run validate:prompt-scoped-next`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`

## Acceptance Criteria

- 匯入 `TASK-AAO-0000` 這類 planning-only done card 不會阻塞 AI-Atomic-Framework pre-commit。
- target-repo `done` task 若缺 closure packet 仍會被擋。
- Audit output 對 planning-only task 回 warning + required sync/import action，而不是 target closure error。
- Regression test 覆蓋 planning authority 與 target authority 的差異。

## Rollback

Revert this task commit. If external planning metadata was added to fixtures, remove or update those fixtures.

## Atomization Impact

- Owner atom/map: `atm.task-ledger-governance-map`
- Map updates: `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

這張卡不是放寬 target repo，而是避免把 planning repo 的歷史工作誤當 target repo 壞帳。
