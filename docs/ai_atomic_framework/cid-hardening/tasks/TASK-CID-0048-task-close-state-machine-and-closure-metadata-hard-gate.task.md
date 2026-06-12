---
doc_id: doc_cid_0048
task_id: TASK-CID-0048
title: "Task close state machine and closure metadata hard gate"
status: done
started_at: "2026-06-12T18:18:00+08:00"
started_by_agent: "007"
completed_at: "2026-06-12T18:25:00+08:00"
owner: atm-core
priority: P0
milestone: M6
depends_on:
  - "TASK-CID-0046"
  - "TASK-CID-0047"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-abnormal-release-forensics-report.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-cli.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-cli.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert this gate if it blocks legitimate governed closeout flows that carry an active claim and valid closure metadata."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-close-checkpoint-gate-map"
  mapUpdates: []
outOfScope:
  - "Historical-delivery commit diff scope enforcement"
  - "Mailbox dependency bridge"
  - "Planning mirror status sync"
nonGoals:
  - "Do not permit a plain status write or manual close event to become trusted closeout provenance."
---

# TASK-CID-0048 - Task close state machine and closure metadata hard gate

## Goal

Harden `tasks close` so ATM cannot turn a task into trusted `done` state unless the task passed a real close checkpoint.

## Problem

The TASK-CID-0047 forensics report found that the CID hardening chain allowed task state to move into apparently complete states without a trustworthy closeout path. The sharpest example is TASK-CID-0041: it had a `close` transition from `planned` to `done`, but no closure metadata and no closure packet.

## Required Behavior

- `tasks close --status done` must fail closed when the task is not in a valid closeable lifecycle state.
- A task cannot close from `planned`, plain imported, or unclaimed state into trusted `done`.
- Closing as `done` must require an active or properly released closeout claim context that ATM can tie to a session / actor / lease.
- The close transition event must include `closure.schemaId = "atm.taskClosureTransition.v1"` when status becomes `done` or `verified`.
- If the task cannot produce closure metadata, it must close as `blocked` / `review`, or return an actionable error with a required command.
- Manual ledger edits or synthetic close events must not satisfy closeout provenance.

## Regression Coverage

Add focused coverage proving:

- A task in `planned` cannot be closed directly to `done`.
- A task with no active claim cannot become trusted `done`.
- A close event without `closure` metadata is not accepted as provenance by later dependency checks.
- A valid governed close still works for the existing close path.

## Validation

Run:

```powershell
npm run typecheck
npm run validate:cli
git diff --check
```

## Report Back

Report the exact blocking error code(s), regression cases added, validators run, and whether any existing task close flow needed an intentional exception.
