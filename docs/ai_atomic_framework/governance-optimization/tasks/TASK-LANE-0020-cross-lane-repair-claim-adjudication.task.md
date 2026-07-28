---
task_id: TASK-LANE-0020
title: Adjudicate cross-lane repair-claim on TASK-CODEX-0204
status: done
owner: atm-lane-session
priority: P0
depends_on:
  - TASK-LANE-0018
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/lane-session-repair-claim-adjudication.md
  - docs/governance/atm-bug-and-optimization-backlog.md
  - docs/governance/atm-bug-and-optimization-backlog.items/**
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/tasks/__tests__/lifecycle-state.test.ts
  - .atm/history/evidence/TASK-LANE-0020.*
  - .atm/history/task-events/TASK-LANE-0020/**
  - .atm/history/tasks/TASK-LANE-0020.json
deliverables:
  - docs/reports/lane-session-repair-claim-adjudication.md
  - docs/governance/atm-bug-and-optimization-backlog.md
  - docs/governance/atm-bug-and-optimization-backlog.items/**
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/tasks/__tests__/lifecycle-state.test.ts
validators:
  - node --strip-types tests/cli/cli-result-contract.test.ts
  - node --strip-types packages/cli/src/commands/tasks/__tests__/lifecycle-state.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-claim-lifecycle-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.cross-lane-repair-claim-adjudication
      pattern: Incident Adjudication Report
      source: docs/reports/lane-session-repair-claim-adjudication.md
      disposition: inline
      inlineReason: The report is the durable human-readable adjudication artifact for this specific dogfood event.
    - atom: atm.repair-claim-lane-ownership-guard
      pattern: Claim Ownership Guard
      source: packages/cli/src/commands/tasks/claim-orchestrator.ts
      disposition: follow-up-card
      inlineReason: null
completed_at: "2026-07-17T08:21:45.374Z"
completed_by_agent: "codex-lane-0020"
closedAt: "2026-07-17T08:21:45.374Z"
closedByActor: "codex-lane-0020"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-17T08-21-45-256Z-close-00bc7008914f"
lastTransitionAt: "2026-07-17T08:21:45.374Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0c9de529bb57d91944b3832d5b55b616acf779d0"
---

# TASK-LANE-0020 - Cross-Lane Repair-Claim Adjudication

## Context

The first real Lane Session dogfood wave also surfaced a possible negative
sample. At `2026-07-16T16:52:32Z`, `codex-lane-0011` emitted a `repair-claim`
event against `TASK-CODEX-0204`, a task owned by another active lane. The event
appears to move `TASK-CODEX-0204` from `running` back to `ready` near the edge
of the original owner heartbeat window.

This must be adjudicated before the parallel dogfood evidence is treated as
fully clean. The outcome may be either a valid orphan repair or a cross-lane
interference incident.

## Required Behavior

- Reconstruct the relevant timeline from `.atm/history/task-events/**`,
  `.atm/history/tasks/TASK-CODEX-0204.json`, lane session records, and git log.
- Decide whether the `repair-claim` satisfied the orphan/stale-owner repair
  rules that were active at the time.
- Write a durable adjudication report at
  `docs/reports/lane-session-repair-claim-adjudication.md`.
- If the repair was unsafe or ambiguous, record the issue in the ATM bug and
  optimization backlog and require a lane ownership guard for future
  repair-claim behavior.
- If the repair was valid, record the evidence and rationale so future analyzer
  runs do not treat it as an unresolved accident.

## Acceptance Criteria

- The report includes exact timestamps, actors, tasks, lane ids when available,
  event ids, and the final adjudication: `valid-orphan-repair`,
  `cross-lane-interference`, or `ambiguous-needs-guard`.
- The report explicitly states whether `TASK-CODEX-0204` was still protected by
  a fresh heartbeat or lane ownership at the time of repair.
- Unsafe or ambiguous adjudication creates or updates an ATM backlog item with
  a concrete guard requirement for repair-claim ownership checks.
- If code changes are needed for the guard, they are implemented in the same
  task only when the scoped files are sufficient; otherwise this card creates a
  follow-up task and documents why.
- No source planning cards are created in the ATM target repo; target receives
  only imported `.atm/history/**` ledger state for this card.

## Validation

Run:

```shell
node --strip-types tests/cli/cli-result-contract.test.ts
node --strip-types packages/cli/src/commands/tasks/__tests__/lifecycle-state.test.ts
npm run typecheck
npm run validate:cli
```
