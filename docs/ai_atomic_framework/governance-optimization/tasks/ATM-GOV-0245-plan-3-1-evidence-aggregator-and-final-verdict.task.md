---
task_id: ATM-GOV-0245
title: Plan 3.1 evidence aggregator and final verdict
status: planned
owner: atm-governance
priority: P0
milestone: ATM-3.1-R5
depends_on:
  - ATM-GOV-0244
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/broker/replay/final-closure-reader.ts
  - packages/cli/src/commands/broker/replay-actions.ts
  - packages/cli/src/commands/broker/parallel-admission/final-verdict.ts
  - tests/cli/atm-3-final-closure.test.ts
  - tests/cli/plan3-evidence-closure-diagnostic.test.ts
  - docs/governance/atm-3-replay-evidence.md
  - artifacts/generated/atm-plan3-final/**
deliverables:
  - packages/cli/src/commands/broker/replay/final-closure-reader.ts
  - packages/cli/src/commands/broker/replay-actions.ts
  - tests/cli/atm-3-final-closure.test.ts
  - artifacts/generated/atm-plan3-final/verdict.json
  - docs/governance/atm-3-replay-evidence.md
validators:
  - node --strip-types tests/cli/atm-3-final-closure.test.ts
  - node --strip-types tests/cli/plan3-evidence-closure-diagnostic.test.ts
  - node atm.mjs broker replay status --json
  - node atm.mjs doctor --json
  - npm run validate:standard -- --json
  - node atm.mjs hook pre-push --base origin/main --head HEAD --json
errorCodes: []
evidence:
  required: canonical-plan3-final-verdict
rollback:
  strategy: revert-commit-and-trip-queue-only
  notes: "Never rewrite historical evidence or convert a failed verdict into pass."
atomizationImpact:
  ownerAtomOrMap: atm.broker.parallel-replay
  mapUpdates: []
  extractionCandidates:
    - atom: atm.replay.final-closure-reader
      pattern: Evidence Aggregator
      source: packages/cli/src/commands/broker/replay/final-closure-reader.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0245 Plan 3.1 evidence aggregator and final verdict

## Intent

Build one evidence aggregator that reads canonical task events, sealed replay
and paired artifacts, backlog shards, rollback/parity receipts, circuit-breaker
state, and runner/build digests. The caller may select an evidence root but may
not pass healthy booleans, zero counters, empty blocker lists, or synthetic
cell counts.

The aggregator is the independent closure oracle, not another projection of
the evidence producer. Producer-owned success labels, counters, and booleans
are untrusted input until reconstructed from canonical sources.

## Acceptance

- [ ] Final verdict input is reconstructed from canonical sources and records unavailable receipts explicitly.
- [ ] The caller can choose an evidence root/window but cannot inject `rollbackExercised`, parity, blocker lists, correctness zeros, admission labels, or any equivalent healthy assertion.
- [ ] Any missing source, open blocker, non-terminal dogfood card, unmatched AB/BA cell, failed parity, or stale reset digest produces `remain-open` and queue-only.
- [ ] A close verdict requires closed 0237/0238, overlapping ledger intervals, canonical queue/wakeup evidence, valid red/green discrimination, matched performance, and all 0244 closeback gates.
- [ ] Cross-captain post-run dashboard evidence is consumed only through its canonical digests and independently reproduced observations; dashboard display labels cannot close the plan.
- [ ] The verdict seals evidence window, watermark, runner/build/scenario digests, counters, timings, compact digest, and source availability.
- [ ] Plan status and 0234/0235 closeback are updated only after this verdict passes; remote SHA parity is checked after push by the implementing captain.

## Evidence and rollback

The final artifact is immutable and references every consumed digest. Rollback
reverts the implementation commit and trips queue-only; it never rewrites
historical evidence or changes a failed verdict into pass.

## Atomization impact

- owner atom/map: `atm.broker.parallel-replay`
- extraction candidate: `final-closure-reader.ts` owns source discovery and normalization; final policy remains pure and independently testable.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:08:02.668Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0245-plan-3-1-evidence-aggregator-and-final-verdict.task.md","contentDigest":"sha256:3dfc00c7dae267bbe1625cad6208b66cf946b357696e2ad0535569b427821659"} -->
