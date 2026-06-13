---
task_id: TASK-CID-0069
doc_id: doc_cid_0069
title: "Taskflow close normal lane end-to-end dogfood hardening"
status: done
started_at: "2026-06-13T15:25:15+08:00"
completed_at: "2026-06-13T15:36:59+08:00"
started_by_agent: "captain"
completed_by_agent: "captain"
target_delivery_commit: "6ed0f263ff0c4663fa9f026359eb13c2a78b0ca3"
target_evidence_commit: "6dff940708106bd2153afabcc855dd04685ac109"
target_close_commit: "1b643dc158a75a53cf009c08900e4b5798647ffa"
owner: atm-core
priority: P0
milestone: M14
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0063"
  - "TASK-CID-0068"
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if taskflow close starts bypassing close gates, misrouting stale-import residue, or committing without bundle isolation."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-open-close-operator-surface-map"
  mapUpdates:
    - "packages/cli/src/commands/taskflow.ts"
    - "packages/cli/src/commands/taskflow/close-orchestration.ts"
outOfScope:
  - "Changing emergency lane authorization policy"
  - "Broad TASK-CID-0062 module extraction"
  - "Cleaning unrelated historical untracked .atm residue"
  - "Changing backend tasks close/reconcile/import/repair-closure semantics except through taskflow orchestration"
nonGoals:
  - "Do not make direct tasks close/reconcile/import the normal workaround."
  - "Do not require planning cards to be manually edited after a successful taskflow close."
---

# TASK-CID-0069 - Taskflow close normal lane end-to-end dogfood hardening

## Goal

Fix the taskflow close dogfood gap exposed during TASK-CID-0068: a normal target-repo task with a live ledger in `running`, a planning card still in `planned`, and a valid historical delivery commit must be closable through `taskflow close --write`, not forced back to direct `tasks close` backend usage.

## Required Work

- Teach `taskflow close` to treat `liveLedger.status in running/review/ready` plus planning frontmatter `planned/in_progress/running` as `normal-close` when the operator supplies a valid historical delivery commit or when write mode can delegate to `tasks close`.
- Preserve fail-closed behavior for true ambiguous residue, stale-import, interrupted-close, and source-done-governance-incomplete cases.
- Ensure the taskflow close write path delegates to `tasks close` internally, then builds the governed dual-repo bundle from the backend result.
- Ensure planning repo closeback is part of the same taskflow close flow: planning card status/metadata must be updated or staged through the governed bundle, not left as stale-import for manual repair.
- Preserve TASK-CID-0068 index isolation: taskflow close must still fail closed if target or planning indexes contain unrelated staged files.
- Add regression coverage that reproduces the 0068 dogfood shape: running target ledger, planned planning card, delivery commit already made, then `taskflow close --write` completes target + planning bundle without direct backend operator commands.

## Acceptance Criteria

- `taskflow close --dry-run --task <running-task> --historical-delivery <sha>` reports `normal-close`, not `ambiguous-manual-review`, when the task is in the normal in-progress close lane.
- `taskflow close --write --task <running-task> --historical-delivery <sha>` runs the backend close and returns `atm.taskflowGovernedCommitBundle.v1`.
- `taskflow close --write` auto-commits target and planning repos by default when the bundle is isolated.
- After write close, `tasks status --task <id> --residue` reports `no-residue`.
- Canonical validator evidence names used by close gates remain satisfied in the dogfood flow.
- Existing residue closeback routes still route to their prior backends.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report:

- the exact normal-lane classification rule;
- how planning card closeback is included in taskflow close;
- whether direct backend close was eliminated for the 0068-style dogfood flow;
- validator results;
- any remaining taskflow close gaps found while dogfooding.
