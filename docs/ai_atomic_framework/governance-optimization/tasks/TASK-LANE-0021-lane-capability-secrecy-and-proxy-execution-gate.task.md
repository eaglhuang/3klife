---
task_id: TASK-LANE-0021
title: Lane capability secrecy and proxy execution gate
status: done
owner: atm-lane-session
priority: P0
depends_on:
  - TASK-LANE-0017
  - TASK-LANE-0020
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/lane-session/**
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/taskflow/close/**
  - packages/cli/src/commands/git-governance/**
  - packages/cli/src/commands/framework-development/temp-claim.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/core/src/team-runtime/permission-broker.ts
  - packages/core/src/broker/**
  - tests/cli/lane-capability-secrecy-and-proxy-execution.test.ts
  - tests/cli/borrowed-actor-authority-hard-gate.test.ts
deliverables:
  - packages/cli/src/commands/lane-session/**
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/taskflow/close/**
  - packages/cli/src/commands/git-governance/**
  - packages/cli/src/commands/framework-development/temp-claim.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/core/src/team-runtime/permission-broker.ts
  - packages/core/src/broker/**
  - tests/cli/lane-capability-secrecy-and-proxy-execution.test.ts
  - tests/cli/borrowed-actor-authority-hard-gate.test.ts
validators:
  - node --strip-types tests/cli/lane-capability-secrecy-and-proxy-execution.test.ts
  - node --strip-types tests/cli/borrowed-actor-authority-hard-gate.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Restore legacy actor-string authority only if proxy/takeover gates over-block valid owner lanes.
atomizationImpact:
  ownerAtomOrMap: atm.lane-session-authority
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.lane-capability-secrecy
      pattern: Capability Boundary
      source: packages/cli/src/commands/lane-session/**
      disposition: extract
    - atom: atm.borrowed-actor-execution-gate
      pattern: Policy Object
      source: packages/cli/src/commands/taskflow/close/**
      disposition: extract
outOfScope:
  - Rewriting the seven-layer broker admission model.
  - Adding task-specific actor or ticket exceptions.
  - Making captains owner lanes by default.
nonGoals:
  - Do not remove human-readable actor ids from diagnostics.
  - Do not expose replayable lease, ticket, or lane capability keys in ordinary reports.
backlogLinks:
  - ATM-BUG-2026-07-24-239
completed_at: "2026-07-24T16:00:31.901Z"
completed_by_agent: "claude-003-plan31-captain"
closedAt: "2026-07-24T16:00:31.901Z"
closedByActor: "claude-003-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-24T16-00-31-901Z-close-b2dddaf866b6"
lastTransitionAt: "2026-07-24T16:00:31.901Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "8e0666e6b867603975ff137c1657e4a457da3d17"
---

# TASK-LANE-0021 - Lane Capability Secrecy and Proxy Execution Gate

## Context

Plan 3.1 dogfood exposed a lane-boundary failure: a captain process could run
another worker actor's close/write and post-close release hygiene by passing the
worker `--actor` value and by reading reusable lane/ticket details from reports.
This violates the Lane rollout intent. Actor id is attribution, not authority.

## Intent

Bind close/write, governed commit, framework temp claim, runner-sync ticket use,
and push admission to the executing lane capability. A non-owner captain may
approve, monitor, and arbitrate, but may not mutate a worker-owned active task
unless a governed proxy/takeover receipt explicitly delegates that command.

## Acceptance

- [ ] Passing `--actor <other-worker>` from a different active lane is rejected
      for taskflow close/write, governed commit, framework-mode, runner-sync,
      and push unless a valid proxy/takeover receipt is supplied.
- [ ] Owner lane execution remains allowed when actor metadata has drifted but
      the lane capability matches the live claim or adopted lane.
- [ ] Human/captain approvals create non-replayable proxy/takeover receipts that
      name approver, executor lane, owner lane, task, command class, reason, TTL,
      and exact delegated surfaces.
- [ ] Ordinary CLI JSON, status reports, dispatch summaries, and worker reports
      redact reusable lease/ticket/lane capability keys. They may show task id,
      actor id, lane fingerprint, ticket fingerprint, state, queue verdict, and
      recovery class.
- [ ] A non-owner cannot learn a replayable ticket key through normal status,
      broker, runner-sync, taskflow, or framework-mode report output.
- [ ] Regression tests replay the 2026-07-24 Plan captain overreach without
      task-specific control flow: borrowed actor close/write and release publish
      must fail closed; approved proxy execution must pass and write an audit
      artifact.
- [ ] Diagnostics distinguish `owner-lane`, `approved-proxy`,
      `adopted-owner-lane`, `redacted-capability`, and
      `borrowed-actor-blocked`.
- [ ] The fix is generalized under INV-ATM-009. Production code may not
      special-case Plan3.1, 0263, `claude-002`, `codex-plan31`, dates, or local
      paths.

## Validation

Run:

```shell
node --strip-types tests/cli/lane-capability-secrecy-and-proxy-execution.test.ts
node --strip-types tests/cli/borrowed-actor-authority-hard-gate.test.ts
npm run typecheck
npm run validate:cli
```
