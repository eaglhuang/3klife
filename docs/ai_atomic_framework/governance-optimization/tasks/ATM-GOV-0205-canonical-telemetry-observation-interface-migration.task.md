---
task_id: ATM-GOV-0205
title: Canonical telemetry observation interface migration
status: planned
owner: unassigned
priority: P0
depends_on:
  - ATM-GOV-0196
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV governance-optimization plan with a cross-cutting telemetry interface migration required by Plan 2.0 instrumentation dogfood and ATM-BUG-2026-07-20-207.
scopePaths:
  - packages/core/src/telemetry/**
  - packages/core/src/test-runner/**
  - packages/core/src/broker/**
  - packages/cli/src/commands/evidence/**
  - packages/cli/src/commands/framework-development/**
  - scripts/run-validators.ts
  - scripts/run-validators/**
  - scripts/run-sealed-runner-build.ts
  - scripts/runner-sync-incremental-build.ts
  - scripts/validate-telemetry-observation-interface.ts
  - tests/cli/telemetry-observation-interface-migration.test.ts
deliverables:
  - packages/core/src/telemetry/**
  - packages/cli/src/commands/evidence/**
  - packages/cli/src/commands/framework-development/**
  - scripts/validate-telemetry-observation-interface.ts
  - tests/cli/telemetry-observation-interface-migration.test.ts
validators:
  - node --strip-types tests/cli/telemetry-observation-interface-migration.test.ts
  - node --strip-types scripts/validate-telemetry-observation-interface.ts --mode validate
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the migration commit and keep the pre-migration observation inventory as evidence; do not delete raw runtime telemetry, and do not rewrite historical evidence bundles by hand.
atomizationImpact:
  ownerAtomOrMap: atm.telemetry-observation-interface-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.telemetry-observation-contract
      pattern: Shared Interface Contract
      source: packages/core/src/telemetry/
      disposition: extract
      inlineReason: null
    - atom: atm.command-run-observation-normalizer
      pattern: Normalizer Adapter
      source: packages/cli/src/commands/evidence/
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0205 Canonical telemetry observation interface migration

## Intent

Plan 2.0 instrumentation must not grow separate timing, correlation, digest,
and storage-policy shapes in each command. This card establishes the canonical
ATM-wide telemetry observation interface as the shared contract for gate
telemetry, evidence command runs, validator lifecycle observations, runner-sync
build timing, incremental build timing, broker decision/outcome observations,
and future plan-executor phase observations.

Domain-specific telemetry may extend the base contract, but common observation
fields must flow through one interface and one normalization layer.

## Problem Signal

- ATM-BUG-2026-07-20-207 found that `evidence run` persisted command proof
  without validator duration/timing fields, making heavy validators weak for
  later analysis.
- A first repair introduced a shared timing/correlation contract for new
  evidence command-run timing, but runner, validator lifecycle, test-runner,
  broker, and incremental-build timing still contain older local `durationMs`,
  `startedAt`, `finishedAt`, `elapsed`, or latency-shaped fields.
- This foundation should run immediately after 0196, before 0197/0200/0201
  start producing larger telemetry datasets, so later cards collect comparable
  observations from the beginning instead of migrating heterogeneous samples.
- Plan 2.0 M3/M4 depends on comparable observed data. If timing/correlation
  semantics differ per subsystem, 0202 rollout analysis can only produce
  fragile joins or `inconclusive` verdicts.

## Required Contract

- Define or finalize a canonical observation base in `packages/core/src/telemetry/**`
  with reusable timing, correlation, source, digest, cache, runner, and storage
  boundary fields.
- Provide adapters or normalizers so domain-specific records can extend the
  base contract without duplicating local duration parsing or correlation
  semantics.
- Migrate gate telemetry, evidence command runs, validator lifecycle,
  runner-sync/sealed build receipts, incremental build timing, broker
  decision/outcome timing, and test-runner timing producers to the shared
  contract or an adapter-backed canonical shape.
- Preserve raw log/detail boundaries: raw timing traces, stdout/stderr, session
  traces, and high-frequency counters remain under gitignored runtime; tracked
  Git artifacts keep compact digest/timing/correlation summaries only.
- Do not rewrite old historical evidence bundles by hand. Backward
  compatibility must be handled by readers and normalizers.

## Data-Driven Decision Contract

- Producer: all ATM governance telemetry producers that emit timing,
  correlation, cache, runner, queue wait, or digest fields.
- Consumer: 0202 paired A/B v4 analyzer, 0200 validator tiering, 0201 runner
  incremental dogfood, future plan executor reports, and task closeout evidence
  checks.
- Opening input: consume the sealed coverage/readback summary from 0196. If
  0197/0200/0201 have not run yet, treat their producer inventories as planned
  downstream consumers rather than missing evidence; the purpose of this card is
  to give those later cards the shared interface before they collect data.
- Missing-data semantics: a subsystem not yet migrated must report
  `sourceAvailability: partial` or an explicit observation-interface gap; it
  must not fabricate duration, queue wait, or cache hit status.
- Stop rule: if the inventory finds multiple incompatible persisted schemas
  that cannot be migrated compatibly without breaking existing evidence readers,
  pause and propose a schema-version migration plan before implementation.

## Acceptance

- [ ] A repository-wide inventory lists every ATM timing/correlation producer
      and classifies it as `canonical`, `adapter-backed`, `legacy-readable`, or
      `not-yet-migrated`.
- [ ] `packages/core/src/telemetry/**` exports the canonical observation
      contract and normalizers used by migrated producers.
- [ ] Evidence command runs, validator lifecycle, runner-sync build receipts,
      incremental build receipts, and broker timing/queue observations either
      directly extend the canonical contract or pass through an adapter that
      produces the canonical shape.
- [ ] Readers remain backward-compatible with historical records that lack
      timing fields; compatibility is explicit and test-covered.
- [ ] Raw logs/traces remain gitignored runtime data; tracked evidence stores
      only compact timing/correlation/digest summaries.
- [ ] A focused validator proves no migrated producer defines private
      duration/correlation parsing when the shared normalizer should be used.
- [ ] A dogfood evidence run records at least one validator command, one cached
      command reuse, and one runner/build timing sample through the canonical
      interface.

## Rollback

Revert the migration commit and restore previous producer-specific fields. Keep
the observation inventory and failing compatibility cases as evidence for a
smaller follow-up migration. Do not delete runtime telemetry or rewrite tracked
historical evidence by hand.
