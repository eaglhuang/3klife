---
doc_id: doc_aao_0149
task_id: TASK-AAO-0149
title: "taskflow close resilience: rollback must not contradict a landed close commit, and auto-evidence must bound its waits"
status: done
owner: atm-core
priority: P1
milestone: RFT-M5
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/tasks/close-orchestrator.ts"
  - "packages/cli/src/commands/tasks/close-helpers/close-artifact-staging.ts"
  - "packages/cli/src/commands/tasks/close-helpers/task-transition-writer.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/tasks/__tests__/"
validators:
  - "npm run typecheck"
  - "npm run validate:taskflow-close-atomicity"
  - "npm run validate:cli"
  - "git diff --check"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/tasks/close-orchestrator.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if close-window staged-index lock semantics or closure packet contract change for the normal (non-failure) close path."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-atomic-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Redesigning the closure packet schema"
  - "Auto-repair of ambiguous residue without human confirmation"
nonGoals:
  - "Do not remove the rollback path; make it consistent with what actually landed"
completed_at: "2026-07-07T08:32:03.380Z"
completed_by_agent: "codex"
closedAt: "2026-07-07T08:32:03.380Z"
closedByActor: "codex"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-07T08-32-03-380Z-close-0cc8793ce7b0"
lastTransitionAt: "2026-07-07T08:32:03.380Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3616cf3299134a8a1c4b2e82d7664ffd769d2b79"
---

# TASK-AAO-0149 — taskflow close rollback and auto-evidence resilience

## Incident A (2026-07-06, TASK-RFT-0015 close)

`taskflow close --write` created and committed a complete close bundle
(commit 816a63da9: closure packet + close transition + task done), then a
post-commit step failed and the rollback path restored the WORKTREE ledger to
`running` while the close commit remained at HEAD. Result: HEAD said done,
worktree said running, `tasks finalize diagnose` returned
`ambiguous-manual-review`, and a human had to decide which side was truth.

Required behavior: once the close commit exists, rollback must roll FORWARD
(keep worktree consistent with the landed commit and surface the failed
post-commit step as a follow-up action) or physically revert the commit —
never leave HEAD and worktree contradicting each other. Add a regression test
in validate:taskflow-close-atomicity covering "post-commit step fails after
close commit landed".

## Incident B (2026-07-03/06, same close)

`taskflow close --auto-evidence` re-ran declared validators with no overall
deadline and no per-step liveness check. Combined with the (since fixed)
validator fixture self-spawn storm, the close pipeline sat wedged for 60-100
minutes spawning `atm.mjs --version` probes that queued forever, and the only
signal was a silent hang. Required behavior:

- Per-validator timeout (configurable, sane default) with a clear
  ATM_TASKFLOW_AUTO_EVIDENCE_TIMEOUT finding naming the stuck validator.
- Overall auto-evidence budget; on breach, abort cleanly, release the
  close-window lock, and report which validators completed vs remain.
- Version/stale-runner probes inside evidence runs must reuse a cached result
  instead of spawning a fresh `atm.mjs --version` per step.

## Acceptance

- Simulated post-commit failure leaves ledger consistent with HEAD (roll-forward)
  and emits a follow-up command.
- Simulated hung validator gets killed at its timeout and close aborts with the
  lock released and an actionable report.
