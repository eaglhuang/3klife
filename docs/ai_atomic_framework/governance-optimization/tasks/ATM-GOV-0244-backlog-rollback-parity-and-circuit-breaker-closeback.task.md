---
task_id: ATM-GOV-0244
title: Backlog rollback parity and circuit-breaker closeback
status: planned
owner: atm-governance
priority: P0
milestone: ATM-3.1-R4
depends_on:
  - ATM-GOV-0242
  - ATM-GOV-0243
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/broker/parallel-admission/final-verdict.ts
  - packages/cli/src/commands/broker/parallel-admission/closure-observation.ts
  - tests/cli/parallel-admission-circuit-breaker.test.ts
  - docs/governance/atm-bug-and-optimization-backlog.items/**
  - docs/governance/atm-bug-and-optimization-backlog.md
  - artifacts/generated/atm-plan3-closeback/**
deliverables:
  - packages/cli/src/commands/broker/parallel-admission/final-verdict.ts
  - packages/cli/src/commands/broker/parallel-admission/closure-observation.ts
  - tests/cli/parallel-admission-circuit-breaker.test.ts
  - artifacts/generated/atm-plan3-closeback/summary.json
  - docs/governance/atm-bug-and-optimization-backlog.md
validators:
  - node --strip-types tests/cli/parallel-admission-circuit-breaker.test.ts
  - node --strip-types scripts/diagnose-plan3-evidence-closure.ts --json
  - node atm.mjs doctor --json
  - npm run typecheck
errorCodes: []
evidence:
  required: closeback-parity-rollback-breaker-receipts
rollback:
  strategy: revert-commit-and-trip-queue-only
  notes: "Any failed closeback gate leaves the controller tripped."
atomizationImpact:
  ownerAtomOrMap: atm.broker.parallel-admission-policy
  mapUpdates: []
  extractionCandidates:
    - atom: atm.parallel-admission.closure-observation
      pattern: Adapter
      source: packages/cli/src/commands/broker/parallel-admission/closure-observation.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0244 Backlog rollback parity and circuit-breaker closeback

## Intent

Reconcile every Plan 3 backlog item and prove rollback, source/frozen/release
parity, healthy circuit-breaker behavior, injected trip, queue-only residency,
and passing-digest reset through command-backed evidence.

## Acceptance

- [ ] Every item named in the Plan 3.1 full-backlog disposition matrix has a canonical terminal disposition with command-backed evidence or a named owner card and explicit non-blocking rationale; open status alone neither forces duplicate implementation nor permits silent omission.
- [ ] ATM-BUG-213 and 219/227/237 consume 0262/0263 evidence; 214/215/217/218 retain their existing 0218/ERR/SKL owners and are not duplicated in GOV.
- [ ] ATM-BUG-222 remains fixed and ATM-BUG-223 remains resolved under focused regressions.
- [ ] Source, frozen onefile, package dist, and release/adopter projections produce equivalent closure observations.
- [ ] The aggregate parity matrix verifies every safety/governance runtime card's pre-existing attributable parity receipt and shared build lineage; it cannot retroactively convert a source-only closed card into valid completion.
- [ ] Rollback drill restores the prior safe state without direct runtime JSON edits and is exactly-once on retry.
- [ ] Healthy replay records zero unexpected trips and zero queue-only residency; injected failure trips queue-only and reset requires a newer passing digest.
- [ ] Open blockers are discovered from canonical backlog state, not supplied as an empty caller list.
- [ ] The closeback summary records `inserted`, `absorbed-by-existing-card`, `external-owner`, `deferred-with-reason`, and `terminal` counts, plus any item lacking a unique consumer.

## Evidence and rollback

Produce a closeback matrix with item id, source/frozen disposition, validator,
receipt digest, owner, and terminal state. A failed parity, rollback, or breaker
drill leaves the controller tripped to queue-only.

## Atomization impact

- owner atom/map: `atm.broker.parallel-admission-policy`
- extraction candidate: backlog/parity readers remain adapters; policy evaluation consumes normalized observations.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:08:01.004Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0244-backlog-rollback-parity-and-circuit-breaker-closeback.task.md","contentDigest":"sha256:363fc5e5286ad11d6c3238e66927669eb4c6f21277aea8e6ccda83862745f9e5"} -->
