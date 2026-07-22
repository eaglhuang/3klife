---
task_id: ATM-GOV-0243
title: Matched AB BA governed workload benchmark
status: planned
owner: atm-performance
priority: P0
milestone: ATM-3.1-R3
depends_on:
  - ATM-GOV-0240
  - ATM-GOV-0241
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/run-paired-ab-v4.ts
  - scripts/paired-ab-v4-cell-workload.ts
  - tests/performance/atm-3-paired-queue-compose.test.ts
  - artifacts/generated/atm-ab-v4/**
  - docs/reports/atm-2-1-paired-ab-v4.md
deliverables:
  - scripts/run-paired-ab-v4.ts
  - scripts/paired-ab-v4-cell-workload.ts
  - tests/performance/atm-3-paired-queue-compose.test.ts
  - artifacts/generated/atm-ab-v4/summary.json
  - artifacts/generated/atm-ab-v4/cells.json
  - docs/reports/atm-2-1-paired-ab-v4.md
validators:
  - node --strip-types tests/performance/atm-3-paired-queue-compose.test.ts
  - node --strip-types scripts/run-paired-ab-v4.ts --mode command-backed
  - node --strip-types scripts/run-paired-ab-v4.ts --mode validate
  - npm run typecheck
errorCodes: []
evidence:
  required: matched-ab-ba-command-event-receipts
rollback:
  strategy: revert-commit-and-trip-queue-only
  notes: "Retain invalidated benchmark artifacts as non-closure history."
atomizationImpact:
  ownerAtomOrMap: atm.performance.paired-ab
  mapUpdates: []
  extractionCandidates:
    - atom: atm.performance.governed-workload
      pattern: Workload Adapter
      source: scripts/paired-ab-v4-cell-workload.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0243 Matched AB BA governed workload benchmark

## Intent

Replace arm-specific sleep timing with a governed workload that exercises ATM
claim, broker admission, queue-only policy, isolated proposal/compose, and
shared delivery. Run matched AB/BA on the same sealed base, configuration,
runner digest, and build.

## Acceptance

- [ ] Queue-only and compose-first arms use identical workload manifests; only policy mode and execution order differ.
- [ ] Queue-only is produced by the policy CLI trip/reset path, not by another build or a label.
- [ ] AB and BA each have at least three valid repeats per accepted comparison cell.
- [ ] Makespan, active throughput, production cost, correctness, queue residency, and starvation derive from the same command/event receipts.
- [ ] Arm-specific delay constants, fixed cost ratios, cosmetic scale/contention fields, and prefilled zero counters cannot influence the verdict.
- [ ] Missing pairs, receipt loss, build drift, or insufficient samples return `inconclusive`.

## Evidence and rollback

Seal workload manifest, base/build/runner digests, randomized order, per-command
timing, resource usage, event counters, and matched-pair identity. Roll back by
reverting the benchmark change and tripping queue-only; retain invalidated
results as non-closure historical artifacts.

## Atomization impact

- owner atom/map: `atm.performance.paired-ab`
- scripts remain adapters; workload and verdict rules must be reusable data-driven contracts.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:07:59.096Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0243-matched-ab-ba-governed-workload-benchmark.task.md","contentDigest":"sha256:93c8488a3fabc28eeafb99d9c9778156e599ca49d9e9db12ff7588eaad6d0e13"} -->
