---
task_id: ATM-GOV-0241
title: Event-derived replay lifecycle receipt contract
status: planned
owner: atm-core
priority: P0
milestone: ATM-3.1-R2
depends_on:
  - ATM-GOV-0239
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/replay/**
  - packages/core/src/telemetry/parallel-replay/**
  - packages/cli/src/commands/broker/replay/**
  - schemas/atm.parallel-replay-evidence.v1.schema.json
  - tests/e2e/atm-3-real-parallel-replay.test.ts
  - tests/e2e/atm-3-parallel-replay-faults.test.ts
deliverables:
  - packages/core/src/broker/replay/lifecycle-receipts.ts
  - packages/core/src/telemetry/parallel-replay/index.ts
  - schemas/atm.parallel-replay-evidence.v1.schema.json
  - tests/e2e/atm-3-parallel-replay-faults.test.ts
validators:
  - node --strip-types tests/e2e/atm-3-parallel-replay-faults.test.ts
  - node --strip-types tests/e2e/atm-3-real-parallel-replay.test.ts
  - npm run typecheck
errorCodes: []
evidence:
  required: event-derived-lifecycle-contract-receipts
rollback:
  strategy: revert-commit
  notes: "Revert schema and consumers together; unknown receipt versions remain inconclusive."
atomizationImpact:
  ownerAtomOrMap: atm.broker.parallel-replay
  mapUpdates: []
  extractionCandidates:
    - atom: atm.replay.lifecycle-receipt-validator
      pattern: Contract Module
      source: packages/core/src/broker/replay/lifecycle-receipts.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0241 Event-derived replay lifecycle receipt contract

## Intent

Define the generic receipt-to-observation contract for claim, bounded intent,
ticket, adapter decision, mutation batch, compose, serializability, steward
apply, shared delivery, queue/revalidation fallback, wakeup, close, admission,
post-compose semantic validation, and correctness counters. Text labels are
display projections only and cannot create evidence semantics.

## Acceptance

- [ ] Every accepted lifecycle step references a successful command or canonical event receipt with task, actor, generation, digest, and time window.
- [ ] Every semantic receipt binds command purpose, task/card, actor, ticket generation, shared surface, digest, and time window; unrelated successful commands do not count.
- [ ] Admission is derived from canonical ticket state; caller-provided `parallel` cannot override `not-required`, missing, or contradictory decisions. A deliberate non-empty intersection with `not-required` is scenario-invalid and fails under `INV-ATM-008`.
- [ ] Same-file intent evidence includes atom/content anchors or bounded source ranges, adapter identity/decision, selected and queued request ids, compose batch membership, legal-order/permutation serializability proof, steward before/after hashes, and shared-commit member attribution.
- [ ] Post-compose validation evidence binds the exact candidate-output digest, validator references and sealed selection source, executable/argv/cwd, runner/build digest, timestamps, exit status, and derived result. Serializability is necessary but cannot substitute for semantic validation.
- [ ] Semantic validation occurs after candidate composition and before any canonical write. Failed, unavailable, unresolved, or unexecuted required validation is observable as fail/inconclusive and authorizes zero canonical writes.
- [ ] The contract distinguishes `compose-selected`, `revalidation-required`, and `queued`; a safe same-file compose may have `waitedMs = 0`, while `waitedMs`, wakeup, queue residency, and starvation are required only when canonical events show a queue transition.
- [ ] Missing intent detail, a path-only file lock result, worker direct-write, detached-worktree isolation, or shared output without steward attribution fails closed under `INV-ATM-010`.
- [ ] Correctness counters default to unavailable/inconclusive, never zero, when required observations are absent.
- [ ] Receipt schema is workload-neutral and rejects unrelated commands that merely match a generic command shape.
- [ ] Producer labels are outside the trust boundary: canonical events and command receipts are the authority consumed by independent closure readers.

## Evidence and rollback

Focused tests must prove malformed, unrelated, label-only, and contradictory
receipts fail closed. Roll back by reverting schema and consumers together;
unknown receipt versions remain inconclusive.

## Atomization impact

- owner atom/map: `atm.broker.parallel-replay`
- extraction candidate: `lifecycle-receipts.ts` owns parsing and semantic validation; orchestration stays outside core.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:07:55.604Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0241-event-derived-replay-lifecycle-receipt-contract.task.md","contentDigest":"sha256:3c0f4f2ad547e25ceb35aa28dfbbe474dafb7d046a745b9455c0bae4eb555e12"} -->
