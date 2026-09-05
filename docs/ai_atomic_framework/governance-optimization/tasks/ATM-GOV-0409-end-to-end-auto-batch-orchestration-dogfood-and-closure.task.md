---
task_id: ATM-GOV-0409
title: End-to-end auto-batch orchestration dogfood and closure
status: done
owner: atm-governance
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/batch/plan-executor.ts
  - packages/cli/src/commands/batch/implementation.ts
  - packages/cli/src/commands/batch/deliver-and-close-forwarding.ts
  - packages/cli/src/commands/batch/runner-recovery-forwarding.ts
  - tests/cli/plan-level-executor-live-loop.test.ts
  - tests/cli/managed-plan-executor.test.ts
  - tests/cli/batch-deliver-and-close-forwarding.test.ts
  - tests/cli/batch-checkpoint-runner-sync-recovery.test.ts
  - docs/reports/captain-parallel-ledger-analysis.md
deliverables:
  - packages/cli/src/commands/batch/plan-executor.ts
  - packages/cli/src/commands/batch/implementation.ts
  - packages/cli/src/commands/batch/deliver-and-close-forwarding.ts
  - packages/cli/src/commands/batch/runner-recovery-forwarding.ts
  - tests/cli/plan-level-executor-live-loop.test.ts
  - tests/cli/managed-plan-executor.test.ts
  - docs/reports/captain-parallel-ledger-analysis.md
validators:
  - node --strip-types tests/cli/plan-level-executor-live-loop.test.ts
  - node --strip-types tests/cli/managed-plan-executor.test.ts
  - node --strip-types tests/cli/batch-deliver-and-close-forwarding.test.ts
  - node --strip-types tests/cli/batch-checkpoint-runner-sync-recovery.test.ts
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-05T09:27:54.586Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-05T09:27:54.586Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-05T09-27-54-586Z-close-cabe7d05694c"
lastTransitionAt: "2026-09-05T09:27:54.586Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6c51ccf74870ec8d929ec0e333d99a59c9c01759"
---

# ATM-GOV-0409 End-to-end auto-batch orchestration dogfood and closure

## Intent

Turn the existing plan selector and resumable decision surface into a governed
end-to-end orchestration loop over the declared phases. The loop must preserve
Coordinator ownership of task lifecycle and Git writes, route shared writes via
Broker, checkpoint after real delivery, and emit command-backed performance
evidence. This is the follow-up for `ATM-BUG-2026-07-19-002` and must not be
closed by changing only `.atm` records or by replaying an earlier close.

## Required Work

- Implement or complete one resumable command path that can execute a bounded
  plan through selection, worker delivery, validator execution, generated-write
  routing, checkpoint, closeback, push, and report emission.
- Preserve explicit stop/retry semantics: a failed phase records its durable
  position and recovery command; rerun resumes from that position without
  duplicating delivery or bypassing Broker.
- Dogfood the same bounded plan twice: serial control and auto-batch treatment.
  Record raw phase timestamps, queue residency, retries, manual interventions,
  and final delivery/closeback outcomes. Do not use synthetic timing or self-
  adjudicated success.
- Keep the report honest when either run is incomplete; `inconclusive` is a
  valid result and is not a validator failure.

## Acceptance

- [ ] The loop executes the declared phases from one governed entry path and
      resumes after an injected phase failure without duplicate effects.
- [ ] Shared writes, checkpoint, closeback, and push remain Coordinator/Broker
      owned; workers cannot self-close or write Git.
- [ ] Serial and auto-batch dogfood runs each have command-backed raw evidence,
      with no manual per-card lifecycle choreography except explicit owner stop.
- [ ] Performance report includes wall-clock phase timings, queue residency,
      retries, manual interventions, and a truthful terminal verdict.
- [ ] All listed validators pass on the delivered source and evidence.
- [ ] Deliverables and validators are filled before import or implementation.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-05T08:57:40.407Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0409-end-to-end-auto-batch-orchestration-dogfood-and-closure.task.md","contentDigest":"sha256:1289662a1f426f336903879253c68ab4653c524ff0fc8fb3eb4233e53fd621a5"} -->
