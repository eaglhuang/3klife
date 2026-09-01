---
task_id: ATM-GOV-0269
title: Validation plan observability and resumable standard gate
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - Plan 3.1 completion audit is green and Plan 3.2 is registered under GOV.
  softRelations:
    - ATM-BUG-2026-07-30-275
    - ATM-BUG-2026-07-30-276
  changedPublicSeams:
    - atm.validationPlanOrchestrator.v1
    - atm.validatorRunProgress.v1
  causalImpactEdges:
    - validate-standard-timeout-observability
    - validator-run-resume
    - close-gate-tiering
  parallelFrontierInputs:
    - measured typecheck / validate:cli / validate:git-head / pre-push / doctor / validate:standard timings from Plan 3.1 dogfood
  validatorReferences:
    - node --strip-types tests/cli/validator-run-resume-and-status.test.ts
    - node --strip-types tests/cli/run-validators-final-600.test.ts
    - npm run typecheck
  phaseOwner: validation-plan
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3-2.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/run-validators.ts
  - scripts/run-validators/implementation.ts
  - scripts/lib/validator-harness.ts
  - scripts/lib/validator-envelope.ts
  - scripts/validators.config.json
  - packages/cli/src/commands/validate.ts
  - packages/cli/src/commands/command-specs/validate.spec.ts
  - tests/cli/validator-run-resume-and-status.test.ts
  - tests/cli/run-validators-final-600.test.ts
deliverables:
  - scripts/run-validators.ts
  - scripts/run-validators/implementation.ts
  - scripts/lib/validator-harness.ts
  - scripts/lib/validator-envelope.ts
  - packages/cli/src/commands/validate.ts
  - packages/cli/src/commands/command-specs/validate.spec.ts
  - tests/cli/validator-run-resume-and-status.test.ts
  - tests/cli/run-validators-final-600.test.ts
validators:
  - node --strip-types tests/cli/validator-run-resume-and-status.test.ts
  - node --strip-types tests/cli/run-validators-final-600.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert validator orchestrator, CLI surface, and tests together; retained validator-run artifacts are diagnostic and must not be the source of truth.
atomizationImpact:
  ownerAtomOrMap: atm.validation-governance
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.validation-plan-orchestrator
      pattern: Deep Module / Orchestrator
      source: scripts/run-validators/implementation.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-30T21:38:18.823Z"
completed_by_agent: "codex-skl-captain"
closedAt: "2026-07-30T21:38:18.823Z"
closedByActor: "codex-skl-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-30T21-38-18-823Z-close-95d3485f0cc1"
lastTransitionAt: "2026-07-30T21:38:18.823Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0b5f5bab7"
---

# ATM-GOV-0269 Validation plan observability and resumable standard gate

## Intent

Turn `validate:standard -- --json` from one opaque heavyweight command into a
resumable validation plan with sub-validator progress, per-step timeout policy,
partial terminal summaries, and stable run ids.

## Deep-module contract

Public interface:

```ts
runValidationPlan({
  planId,
  validators,
  timeoutPolicy,
  resumeFromRunId,
  outputMode
})
```

Adapters:

- `scripts/run-validators.ts` standard/quick/full runner adapter.
- `node atm.mjs validate ...` CLI adapter.

Deletion test: deleting the module would force timeout, progress, resume,
partial summary, and validator tier policy back into every validator caller.

Dependency classes:

- in-process: validator harness, envelope writer, config loader.
- local-substitutable: filesystem validator-run store.
- true-external: subprocess execution and OS timers.

## Acceptance

- [ ] Each child validator has stable id, command identity, started/finished
      timestamps, duration, exit code, timeout verdict, and artifact pointers.
- [ ] Timeout writes a terminal partial summary with total/pass/fail/pending/
      running counts and the resume command.
- [ ] Resume skips already-passed child validators when command identity and
      content fingerprints still match.
- [ ] `validate:standard -- --json` is observable without waiting for process
      completion.
- [ ] The implementation contains no task-id, actor-id, date, local-path, or
      Plan3.1-specific control-flow exception.
