---
task_id: ATM-GOV-0273
title: Target planning and runner closeback boundary split
status: planned
owner: unassigned
priority: P1
depends_on:
  - ATM-GOV-0271
  - ATM-GOV-0272
causalGraph:
  causalDependencies:
    - ATM-GOV-0271
    - ATM-GOV-0272
  startConditions:
    - Close saga exposes legal lanes and public attestation recovery exists.
  softRelations:
    - ATM-BUG-2026-07-30-278
    - ATM-BUG-2026-07-30-280
    - ATM-BUG-2026-07-29-258
    - ATM-BUG-2026-07-29-266
  changedPublicSeams:
    - atm.targetClosure.v1
    - atm.planningCloseback.v1
    - atm.runnerPublicationBoundary.v1
  causalImpactEdges:
    - target-close-idempotency
    - planning-closeback-isolation
    - runner-publication-isolation
  parallelFrontierInputs:
    - Plan 3.1 target close / planning closeback / runner publication coupling reports
  validatorReferences:
    - node --strip-types tests/cli/taskflow-cross-authority-closeback-saga.test.ts
    - node --strip-types tests/cli/runner-publication-disposition-gate.test.ts
    - node --strip-types packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts
    - npm run typecheck
  phaseOwner: closeback-boundaries
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3-2.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow/cross-authority-closeback.ts
  - packages/cli/src/commands/taskflow/closeback-orchestration.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/tasks/planning-mirror-close-diagnostics.ts
  - packages/cli/src/commands/internal-release/publication.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - tests/cli/taskflow-cross-authority-closeback-saga.test.ts
  - tests/cli/runner-publication-disposition-gate.test.ts
  - packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts
deliverables:
  - packages/cli/src/commands/taskflow/cross-authority-closeback.ts
  - packages/cli/src/commands/taskflow/closeback-orchestration.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/tasks/planning-mirror-close-diagnostics.ts
  - packages/cli/src/commands/internal-release/publication.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - tests/cli/taskflow-cross-authority-closeback-saga.test.ts
  - tests/cli/runner-publication-disposition-gate.test.ts
  - packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts
validators:
  - node --strip-types tests/cli/taskflow-cross-authority-closeback-saga.test.ts
  - node --strip-types tests/cli/runner-publication-disposition-gate.test.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert closeback facades and adapters together; cross-repo close must remain fail-closed if boundaries disagree.
atomizationImpact:
  ownerAtomOrMap: atm.closeback-boundary-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.target-closure-facade
      pattern: Boundary Facade
      source: packages/cli/src/commands/taskflow/closeback-orchestration.ts
      disposition: extract
      inlineReason: null
    - atom: atm.runner-publication-boundary
      pattern: Boundary Facade
      source: packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0273 Target planning and runner closeback boundary split

## Intent

Split target closure, planning closeback, and runner publication into replaceable
deep-module boundaries that can dry-run, write, explain, recover, and retry
independently while still being coordinated by the close saga.

## Deep-module contract

Public interfaces:

```ts
closeTargetLedger(...)
closePlanningMirror(...)
publishRunnerBoundary(...)
```

Adapters:

- cross-authority `taskflow close` adapter.
- runner publication/internal-release adapter.

Deletion test: deleting these facades would force taskflow close, planning
mirror diagnostics, commit bundle assembly, and runner publication to know each
other's internal state and recovery rules.

Dependency classes:

- in-process: target ledger writer, close event writer, bundle assembly.
- local-substitutable: planning repo worktree and runner release mirror.
- remote-owned: protected remote branch and pushed planning commit.

## Acceptance

- [ ] Target close, planning closeback, and runner publication each have
      independent dry-run/write/explain/recover results.
- [ ] Planning closeback drift cannot cause a misleading target-ledger
      reconcile transition that leaves `stale-import` unchanged.
- [ ] Runner publication cannot force unrelated close validation reruns.
- [ ] The saga composes the three boundaries without hiding partial completion.
- [ ] Re-running each boundary is idempotent and evidence-backed.
