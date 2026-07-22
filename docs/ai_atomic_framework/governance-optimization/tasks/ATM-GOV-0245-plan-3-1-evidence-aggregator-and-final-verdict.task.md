---
task_id: ATM-GOV-0245
title: Plan 3.1 evidence aggregator and final verdict
status: planned
owner: atm-governance
priority: P0
milestone: ATM-3.1-R5
depends_on:
  - ATM-GOV-0244
  - ATM-GOV-0250
  - ATM-GOV-0252
  - ATM-GOV-0253
  - ATM-GOV-0254
  - ATM-GOV-0255
  - ATM-GOV-0256
  - ATM-GOV-0257
  - ATM-GOV-0258
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
- [ ] Historical terminal task status is not semantic evidence. The aggregator preserves predecessor history, consumes each evidence disposition, and treats `superseded-for-plan-closure`, failed, unavailable, or inconclusive evidence as `remain-open` without reopening the predecessor.
- [ ] A close verdict requires closed 0237/0238, overlapping actor intervals on one canonical worktree/base/HEAD, disjoint bounded intents on the declared same-file intersection, one compose batch, valid serializability proof, neutral-steward-only apply, shared-commit member attribution, valid red/green discrimination, matched performance, and all 0244 closeback gates.
- [ ] The close verdict additionally requires command-backed semantic validation of the exact composed candidate before steward apply; missing, failed, unavailable, stale, or digest-mismatched validation is never inferred from serializability, a final build, or a healthy producer label.
- [ ] Queue/wakeup evidence is read from the sealed true-conflict/stale fallback cell; the aggregator must accept zero queue residency in the primary safe-compose cell and must reject path-only serialization as a parallel success.
- [ ] Any normal-development use of separate Git branch/worktree/index, worker direct-write to the shared file, missing adapter decision, or missing steward journal produces `remain-open` under `INV-ATM-010`.
- [ ] Cross-captain post-run dashboard evidence is consumed only through its canonical digests and independently reproduced observations; dashboard display labels cannot close the plan.
- [ ] Every closure-critical acceptance predicate is consumed from the 0252 evidence map with an adequate realness class and valid independent-verifier receipt; unavailable, failed, or inconclusive predicates keep the plan open.
- [ ] Plan-global closure always consumes a pre-sealed locked-policy verifier receipt whose implementation, scenario/assertion, threshold, and evidence-window digests were fixed before producer work. Separate-actor review alone cannot satisfy the aggregate verdict.
- [ ] The final verdict accepts global completion only from a completed 0253 cross-authority saga receipt. Target-only or planning-only completion is reported as `closeback-pending`, never as Plan 3 success.
- [ ] If the 0253 authority manifest requires remote visibility, the aggregator independently verifies each exact authority commit is reachable from the declared remote/ref and that its push receipt matches the sealed SHA; a local-only commit or unavailable remote remains `closeback-pending`.
- [ ] The verdict seals evidence window, watermark, runner/build/scenario digests, counters, timings, compact digest, and source availability.
- [ ] Global close is rejected while any Plan 3.1 dogfood task can release with in-scope source dirty WIP that becomes ownerless, or while `ATM_CLAIM_FOREIGN_UNSTAGED_WIP` lacks a deterministic recoveryCommand for the next overlapping claim.
- [ ] The verdict consumes `ATM-GOV-0258` evidence for broker-managed transactional stage/commit isolation and `ATM-BUG-2026-07-22-229` dirty-release recovery: queue ordering, request-owned staging, zero cross-actor staged-file leakage, post-close release artifact commit automation, runner receipt disposition, and manual captain intervention count.
- [ ] Plan status advances only after this verdict passes. Historical 0234/0235 records remain terminal and immutable; continuation evidence and the 0253 closeback saga carry the new closure truth. Remote SHA parity is checked after push by the implementing captain.

## Evidence and rollback

The final artifact is immutable and references every consumed digest. Rollback
reverts the implementation commit and trips queue-only; it never rewrites
historical evidence or changes a failed verdict into pass.

## Atomization impact

- owner atom/map: `atm.broker.parallel-replay`
- extraction candidate: `final-closure-reader.ts` owns source discovery and normalization; final policy remains pure and independently testable.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:08:02.668Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0245-plan-3-1-evidence-aggregator-and-final-verdict.task.md","contentDigest":"sha256:3dfc00c7dae267bbe1625cad6208b66cf946b357696e2ad0535569b427821659"} -->
