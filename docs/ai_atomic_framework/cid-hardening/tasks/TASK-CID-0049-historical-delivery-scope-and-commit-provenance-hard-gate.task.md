---
doc_id: doc_cid_0049
task_id: TASK-CID-0049
title: "Historical-delivery scope and commit provenance hard gate"
status: done
completed_at: "2026-06-12T20:30:00+08:00"
completed_by_agent: "008"
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
  notes: "Revert if legitimate historical-delivery closeback can no longer prove task-specific deliverables."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-historical-delivery-provenance-map"
  mapUpdates: []
outOfScope:
  - "General task close lifecycle state-machine hardening"
  - "Mailbox dependency bridge"
  - "Planning mirror status sync"
nonGoals:
  - "Do not allow broad commits, mixed-task commits, or generic git-head evidence to replace task-specific delivery proof."
---

# TASK-CID-0049 - Historical-delivery scope and commit provenance hard gate

## Goal

Harden `tasks close --historical-delivery` and `tasks reconcile --delivery-commit` so historical closeback cannot accept a broad, stale, unrelated, or mixed-task commit as proof for a specific task.

## Problem

The TASK-CID-0047 forensics report found that TASK-CID-0042 had a formal closure packet, but the packet's `changedFiles` list included files outside the task's declared deliverables / scope. That makes historical delivery useful, but too permissive if it cannot distinguish "this task's delivery" from "a nearby commit with many other changes".

## Required Behavior

- Historical delivery must prove at least one real non-`.atm` deliverable for the target task.
- Historical delivery must reject commits whose changed files do not overlap the task's declared deliverables / scope.
- Historical delivery must flag or reject commits with substantial out-of-scope source changes unless those files are explicitly allowed as release artifacts or declared runner outputs.
- Closure packets must record which changed files are task-matched, which are governance files, and which are out-of-scope / waived.
- If out-of-scope files are present, the command must fail closed or require an explicit waiver field / option with captain-readable evidence.
- `tasks reconcile` must follow the same historical-delivery proof rules as `tasks close`.

## Coordination Rule

TASK-CID-0048 may also touch `packages/cli/src/commands/tasks.ts`. Start with read-only analysis if TASK-CID-0048 is still in progress. Before writing, confirm the latest `main` contains TASK-CID-0048 or that your edit area does not overlap.

## Regression Coverage

Add focused coverage proving:

- A historical commit with no task deliverable overlap is rejected.
- A historical commit with one task deliverable plus unrelated source files is rejected or requires explicit waiver.
- A historical commit with task deliverables plus allowed release artifacts still passes.
- `tasks close` and `tasks reconcile` enforce the same rule.

## Validation

Run:

```powershell
npm run typecheck
npm run validate:cli
git diff --check
```

## Report Back

Report the exact historical-delivery acceptance rule, rejection examples, waiver behavior if added, validators run, and whether TASK-CID-0042 would still pass or require a repair waiver under the new rule.

## Worker Report

- worker: 008
- task: TASK-CID-0049
- status: done
- target_repo_delivery_commit: `1bc75f770d5fe142a92ae2d23b4d50e66e9eed78`
- shared_commit_note: TASK-CID-0049 source delivery shares AAF commit `1bc75f77` with TASK-CID-0048 because both P0 cards modified `packages/cli/src/commands/tasks.ts` (and related CLI surfaces); the implementations were merged into one governed commit rather than split into two competing `tasks.ts` edits.
- scope_completed:
  - Historical-delivery scope and commit provenance hard gate for `tasks close --historical-delivery` and `tasks reconcile --delivery-commit`.
  - Closure packets record `historicalDeliveryProvenance` (`atm.historicalDeliveryProvenance.v1`) with task-matched, governance, allowed runner output, and out-of-scope / waived buckets.
- evidence_0049_specific:
  - `categorizeHistoricalCommitFiles()`, `inspectHistoricalDelivery()`, `buildHistoricalDeliveryProvenance()` in `packages/cli/src/commands/tasks.ts`
  - `--waiver-out-of-scope-delivery` (+ required `--reason`) on close and reconcile via `packages/cli/src/commands/tasks/task-option-parsers.ts`; documented in `packages/cli/src/commands/command-specs/tasks.spec.ts`
  - `scripts/validate-cli.ts` Test 5.2 historical-delivery regression: no-overlap reject, mixed commit reject, waiver accept, declared release artifact allowed
- evidence_0048_not_claimed_here:
  - Close lifecycle state-machine hard gate (`planned` / unclaimed / no-session blocks) and closure metadata requirements belong to TASK-CID-0048 in the same commit; see TASK-CID-0048 planning mirror for that slice.
- validators_green:
  - `npm run typecheck` — PASS
  - `npm run validate:cli` — PASS (includes Test 5.2)
  - `git diff --check` — PASS
- task_cid_0042_under_new_rule: delivery commit `803ffc33` still passes (`scoped-deliverable-files-present`); mixed unrelated-source commits would reject without captain waiver.
- mailbox_report: `AI-Atomic-Framework/.atm-temp/captain-dispatch-mailbox/agents/008/reports/P0-CIDHARD-008-S1-TASK-CID-0049--008-to-captain--20260612-202500TPE.report.md`
