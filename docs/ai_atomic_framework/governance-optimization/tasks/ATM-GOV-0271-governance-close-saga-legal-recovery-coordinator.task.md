---
task_id: ATM-GOV-0271
title: Governance close saga legal recovery coordinator
status: planned
owner: unassigned
priority: P1
depends_on:
  - ATM-GOV-0270
causalGraph:
  causalDependencies:
    - ATM-GOV-0270
  startConditions:
    - Evidence freshness can distinguish missing, stale, and fresh validator receipts.
  softRelations:
    - ATM-BUG-2026-07-30-277
    - ATM-BUG-2026-07-30-280
  changedPublicSeams:
    - atm.closeSagaPlan.v1
    - atm.legalRecoveryLane.v1
  causalImpactEdges:
    - close-recovery-lane
    - runner-sync-prepush-evidence-cycle-break
    - broker-ticket-not-refusal
  parallelFrontierInputs:
    - Plan 3.1 circular blocker reports involving runner-sync, pre-push, evidence, and close
  validatorReferences:
    - node --strip-types tests/cli/taskflow-close-saga-plan-parity.test.ts
    - node --strip-types tests/cli/taskflow-cross-authority-closeback-saga.test.ts
    - npm run typecheck
  phaseOwner: close-saga
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3-2.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/broker-gate.ts
  - packages/cli/src/commands/taskflow/branch-commit-queue-gate.ts
  - packages/cli/src/commands/taskflow/runner-selection-evidence.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/hook/pre-push.ts
  - tests/cli/taskflow-close-saga-plan-parity.test.ts
  - tests/cli/taskflow-cross-authority-closeback-saga.test.ts
deliverables:
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/broker-gate.ts
  - packages/cli/src/commands/taskflow/branch-commit-queue-gate.ts
  - packages/cli/src/commands/taskflow/runner-selection-evidence.ts
  - tests/cli/taskflow-close-saga-plan-parity.test.ts
  - tests/cli/taskflow-cross-authority-closeback-saga.test.ts
validators:
  - node --strip-types tests/cli/taskflow-close-saga-plan-parity.test.ts
  - node --strip-types tests/cli/taskflow-cross-authority-closeback-saga.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert saga planning and consumers together; blockers must remain fail-closed if no legal lane exists.
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-close-saga
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.close-saga-coordinator
      pattern: Saga Coordinator
      source: packages/cli/src/commands/taskflow/close-orchestration.ts
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0271 Governance close saga legal recovery coordinator

## Intent

Break circular dependencies among runner-sync, pre-push, evidence, and close by
making closeout a visible saga with ordered phases and legal recovery lanes.

## Deep-module contract

Public interface:

```ts
planCloseSaga({
  taskId,
  deliveryCommit,
  planningRepo,
  targetRepo
})
```

Adapters:

- `taskflow pre-close/close` adapter for phase and blocker reporting.
- runner-sync / pre-push adapter for shared-write recovery lanes.

Deletion test: deleting this module would scatter blocker ordering and recovery
commands across taskflow, broker, runner-sync, pre-push, and evidence callers.

Dependency classes:

- in-process: close preflight, evidence freshness, task status projection.
- local-substitutable: branch queue and runner-sync status providers.
- remote-owned: remote push readiness and planning repo closeback.

## Acceptance

- [ ] Each close blocker maps to `execute-now`, `queue`, `recover`, `wait`, or
      `human-required`; no naked refusal is returned for shared-write gates.
- [ ] The saga detects cycles among runner-sync, pre-push, evidence, and close
      and emits the next legal recovery lane.
- [ ] Existing taskflow close JSON exposes phase, blocker owner, recovery lane,
      and forbidden actions.
- [ ] Emergency lanes are explicit and auditable; ordinary close does not depend
      on hidden commands.
- [ ] No specific historical Plan3.1 task id or actor is encoded.
