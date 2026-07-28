---
task_id: ATM-GOV-0165
title: Scope runner staleness close gate to non-code tasks
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0150
  - ATM-GOV-0154
  - ATM-GOV-0159
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow/implementation.ts
  - tests/cli/taskflow-stale-runner-lane.test.ts
  - docs/governance/command-surface.md
  - docs/governance/error-code-registry.json
deliverables:
  - packages/cli/src/commands/taskflow/implementation.ts
  - tests/cli/taskflow-stale-runner-lane.test.ts
validators:
  - node --strip-types tests/cli/taskflow-stale-runner-lane.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-close-runner-staleness-gate
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.taskflow-runner-staleness-scope-classifier
      pattern: Policy Object
      source: packages/cli/src/commands/taskflow/implementation.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-18T08:00:05.339Z"
completed_by_agent: "atm-core"
closedAt: "2026-07-18T08:00:05.339Z"
closedByActor: "atm-core"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T08-00-04-575Z-close-12f4f5d373a3"
lastTransitionAt: "2026-07-18T08:00:05.339Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2b97cfebf8b22978fab58ca260460ccf12216885"
---

# ATM-GOV-0165 - Scope Runner Staleness Close Gate To Non-Code Tasks

## Context

Dogfood for `ATM-GOV-0156` showed that the taskflow close preflight currently
treats runner staleness as a global blocker. That is safe, but too broad:
ledger-only, docs-only, evidence-only, and planning closeback tasks do not alter
framework build inputs and should not wait for runner-sync stewardship.

This card refines close preflight only. It must not weaken runner-sync admission
for actual release/build writes.

This card implements the highest parallel governance principle: Tier 0 reads
and Tier 1 private ledger/evidence/planning writes must not queue behind
unrelated lanes. Only Tier 2 shared build/release/git-index surfaces justify
broker/steward serialization, and the gate must name the concrete intersection.

## Required Behavior

- Add a taskflow close/pre-close scope classifier that compares the task's
  claimed files, direction lock files, scope paths, and deliverables against the
  shared `scopeClass` classifier from `ATM-GOV-0159`.
- Treat at least these paths as build inputs:
  - `packages/**`
  - `scripts/**`
  - `templates/**`
  - `schemas/**`
  - `atomic_workbench/**`
  - `package.json`
  - `package-lock.json`
  - `tsconfig.json`
  - `tsconfig.build.json`
- If `scopeClass` contains only `docs` and/or `ledger`, skip runner staleness
  close blockers and expose `runnerGateDecision: "skipped-non-code"` in
  taskflow evidence.
- If `scopeClass` contains `code`, preserve the existing runner-sync steward
  blocker chain and expose `runnerGateDecision: "required"`.
- Include the code/build-input intersection list in evidence when the runner
  gate is required.
- Do not block Tier 0 reads or Tier 1 private ledger/evidence/planning closeback
  merely because another lane has active work.
- Do not skip other close blockers such as stale validators, active claim
  ownership, out-of-scope delivery, or dirty close-owned files.

## Acceptance Criteria

- A task whose scope is only `.atm/history/**`, evidence, docs, or planning
  mirror paths can run taskflow pre-close without receiving
  `ATM_TASKFLOW_PRECLOSE_STALE_RUNNER` solely because the frozen runner is stale.
- A task whose scope includes `packages/**`, `scripts/**`, or other build-input
  paths still receives the existing runner-sync blocker when the runner is
  stale.
- Taskflow evidence includes `runnerGateDecision` and, for required gates,
  `runnerGateIntersectingFiles`.
- Any required runner gate identifies the Tier 2 shared surface that requires
  serialization.
- The change does not mutate release artifacts or enqueue runner-sync work.

## Validation

Run:

```shell
node --strip-types tests/cli/taskflow-stale-runner-lane.test.ts
npm run typecheck
npm run validate:cli
```

## Rollback

Revert the implementation and test commit. The previous conservative behavior
will return, which may reduce parallelism but preserves release safety.
