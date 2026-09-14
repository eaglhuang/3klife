---
task_id: TASK-PRF-0104
title: Run 30-run millisecond gate latency benchmark
status: planned
owner: unassigned
priority: P2
depends_on: []
causalGraph:
  causalDependencies:
    - TASK-PRF-0102
    - TASK-PRF-0103
  startConditions:
    - TASK-PRF-0102 telemetry instrumentation is available
    - TASK-PRF-0103 doctor fast path is committed
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/atm-command-gate-latency-score.md
  - scripts/plan-performance-report-v4.ts
  - tests/cli/command-gate-latency-score.test.ts
  - tests/cli/gate-telemetry-observed-chain.test.ts
deliverables:
  - 30 paired before/after samples per mandatory gate, with run order, exit result, retry/failure state, and wall duration in milliseconds
  - existing latency score report updated with p50, p95, cumulative wait, coverage, and ranked hotspots; unknown remains unknown, never zero
  - external-reproducible benchmark receipt under the approved sink, excluding secrets and raw runtime evidence from Git history
validators:
  - node --strip-types tests/cli/command-gate-latency-score.test.ts
  - node --strip-types tests/cli/gate-telemetry-observed-chain.test.ts
  - npm run typecheck -- --pretty false
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0104 Run 30-run millisecond gate latency benchmark

## Intent

Measure the cost that every adopter must pay at mandatory ATM commands and gates,
then use the measured milliseconds to choose the next optimization. Preserve the
multi-AI parallel work model; this card changes measurement and evidence only and
must not add a daemon, database, command family, or governance checkpoint.

The benchmark compares the same fixed task through the pre-0103 path and the
post-0103 doctor fast path. It must run in AB/BA order with warm-up separated from
measured samples and retain failures, retries, and blocked runs rather than
silently dropping them.

## Acceptance

- [ ] At least 30 valid measured samples exist for each compared condition and
      each mandatory gate; every sample has a monotonic duration in milliseconds.
- [ ] Report ranks hotspots by frequency-weighted cumulative mandatory wait, then
      p95 and p50. Any p50 or p95 at least 1,000 ms is a hotspot; investigate the
      highest p95 first, with a 5,000 ms diagnostic priority.
- [ ] Post-0103 doctor fast path lowers fixed-task mandatory-wait p50 by at least
      20% with no more than 10% p95 regression. If the threshold is not met, mark
      the optimization inconclusive or failed; do not manufacture a PASS.
- [ ] A/A noise control and AB/BA ordering are present, and receipts are rerunnable
      from a clean checkout using only documented commands and approved sink paths.
- [ ] No raw runtime evidence, credentials, or machine-local absolute paths enter
      Git history; no new telemetry service or ATM command is introduced.
- [ ] All listed validators pass, and the task remains open if frozen runner-sync
      is stale rather than bypassing that release gate.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T18:42:51.797Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0104-run-30-run-millisecond-gate-latency-benchmark.task.md","contentDigest":"sha256:dc073ed3cb83302662257aa333dc9ae0f221fdaf5e8ddfb400648e848aeaa6e9"} -->
