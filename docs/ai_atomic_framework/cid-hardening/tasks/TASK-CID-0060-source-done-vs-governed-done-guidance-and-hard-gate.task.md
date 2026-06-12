---
doc_id: doc_cid_0060
task_id: TASK-CID-0060
title: "Source done vs governed done guidance and hard gate"
status: done
completed_at: "2026-06-12T20:05:00+08:00"
completed_by_agent: "008"
owner: atm-core
priority: P0
milestone: M11
depends_on:
  - "TASK-CID-0047"
  - "TASK-CID-0048"
  - "TASK-CID-0049"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-abnormal-release-forensics-report.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/closeout-signaling.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/atm.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-cli.ts"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/closeout-signaling.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/atm.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if the new signaling blocks legitimate closeout recovery flows or emits misleading next-step commands."
atomizationImpact:
  ownerAtomOrMap: "atm.closeout-signaling-gap-map"
  mapUpdates: []
outOfScope:
  - "Rewriting planning repo workflow outside ATM CLI surfaces"
  - "Mailbox transport or thread automation redesign"
  - "Historical repair of already imported legacy task history"
nonGoals:
  - "Do not treat source delivery success as equivalent to governed closeout success."
  - "Do not weaken dependency admission just to reduce warning noise."
---

# TASK-CID-0060 - Source done vs governed done guidance and hard gate

## Goal

Fix the ATM product gap where a worker can reasonably believe a task is complete because source changes landed and validators passed, while the framework still lacks a trusted governed closeout chain.

## Problem

Recent CID hardening work showed a repeated failure mode:

- source deliverables existed;
- validators were green;
- planning task cards and mailbox dispatches were reported as done;
- but target-repo task history still lacked trusted governed closeout provenance.

The current CLI often surfaces this as `ambiguous-manual-review` or `incomplete-closeout` without strongly distinguishing:

1. source delivery is complete, and
2. governed closeout is incomplete.

That makes workers miss the required closeout recovery step and makes downstream claim failures feel surprising instead of guided.

## Required Behavior

- ATM must explicitly distinguish `source-done / governance-incomplete` from generic ambiguous residue.
- When a dependency task is blocked only because closeout provenance is incomplete, `next` and `tasks claim` must emit a direct, actionable recovery command instead of a vague blocker.
- `tasks finalize diagnose` and `tasks status --residue` must explain which proof segment is missing:
  - missing closure packet
  - missing close transition metadata
  - imported-as-done without governed closeout
  - planning mirror or mailbox done without target-repo closeout truth
- If ATM can prove source delivery exists but governed closeout does not, it must fail closed with a strong message that says the task is not yet trusted done.
- CLI help and regression fixtures must teach the difference between:
  - source delivered
  - governably closed
  - complete-but-unfinalized
  - ambiguous manual review

## Acceptance Signals

- A worker who finishes source changes but misses the closeout chain should receive a deterministic next step, not a vague quiet state.
- A downstream claim blocked by upstream closeout should name the upstream task and the exact recovery path.
- Regression coverage must prove the framework no longer collapses `source done != governed done` into a misleadingly quiet state.

## Validation

```powershell
npm run typecheck
npm run validate:cli
git diff --check
```

## Report Back

Report the new residue or blocker wording, the exact recovery command(s) ATM now emits, the regression cases added, validator results, and commit SHA.

## Worker Report

- worker: 008
- task: TASK-CID-0060
- status: done
- target_repo_delivery_commit: `1057a12633da4b8533bb6d7fee40bf835658562a`
- target_repo_closeout_commit: `145360d2e704a988c62d29706786d2a24e910425`
- scope_completed:
  - New residue bucket `source-done-governance-incomplete` for live-ledger `done` without trusted closeout provenance.
  - Shared module `packages/cli/src/commands/tasks/closeout-signaling.ts` (`verifyCloseoutProvenance`, `assessCloseoutProvenanceGap`, dependency blocker recovery commands).
  - `tasks claim` / `next --claim` emit actionable recovery (`tasks reconcile` for import→done, `tasks repair-closure` for manual-done).
  - `tasks status --residue` / `tasks finalize diagnose` list missing proof segments instead of collapsing to `ambiguous-manual-review`.
  - In-process CLI projection reset (`applyOutputProjectionFlagsFromArgv`) so `validate-cli` `--fields` tests do not leak into later assertions.
- recovery_commands:
  - import→done without governed closeout: `node atm.mjs tasks reconcile --task <id> --actor <actor> --delivery-commit <sha> --json`
  - manual-done without provenance: `node atm.mjs tasks repair-closure --task <id> --actor <actor> --json`
  - residue diagnosis: `node atm.mjs tasks status --task <id> --residue --json`
- regression_added:
  - `scripts/validate-cli.ts` Test 5.1b: import→done without provenance buckets as `source-done-governance-incomplete` and recommends `tasks reconcile`.
  - Test 5.1 updated: manual-done dependency blocker recommends `tasks repair-closure` (not vague `finalize diagnose`).
- validators_green:
  - `npm run typecheck` — PASS
  - `npm run validate:cli` — PASS (includes Test 5.1b)
  - `git diff --check` — PASS
- coordination:
  - Not mixed with TASK-CID-0055 delivery; 0055 remains blocked on missing TASK-CID-0051/0052 target ledgers.
- mailbox_report: `AI-Atomic-Framework/.atm-temp/captain-dispatch-mailbox/agents/008/reports/P0-CIDSIGNAL-008-S2-TASK-CID-0060--008-to-captain--20260612-200500TPE.report.md`
