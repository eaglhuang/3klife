---
task_id: TASK-PRF-0126
title: Run same-fixture close-readiness A/B performance proof and stop-rule decision
status: planned
owner: codex-product-proof
priority: P1
depends_on: [TASK-PRF-0125]
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: [TASK-PRF-0125]
  changedPublicSeams: [close-readiness-performance-proof]
  causalImpactEdges: [close-readiness-wait-ms, child-process-count, product-acceptance]
  parallelFrontierInputs: [TASK-PRF-0125-product-acceptance-gap-20260923.md]
  validatorReferences: [docs/reports/taskflow-close-readiness-ab-20260923.md]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/taskflow-close-readiness-ab-20260923.md
  - docs/reports/taskflow-close-readiness-ab-20260923.json
deliverables:
  - docs/reports/taskflow-close-readiness-ab-20260923.md
  - docs/reports/taskflow-close-readiness-ab-20260923.json
validators:
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts
  - node --strip-types tests/cli/taskflow-close-readiness-snapshot.test.ts
  - npm run typecheck
  - node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
evidence:
  required: command-backed
testContributions:
  - caseId: test_prf0126_same_fixture_ab_p50_p95_31f1a0c2
    semanticKey: same_fixture_ab_p50_p95
    coversAcceptance: [ACC-1, ACC-2, ACC-4]
    coversImpactEdges: [close-readiness-wait-ms, child-process-count]
    expectedRedPredicate: baseline and candidate measurements are not collected under identical fixture and host conditions
    responsibility: task-required
  - caseId: test_prf0126_verdict_digest_false_block_missed_conflict_82e4b1d9
    semanticKey: verdict_digest_false_block_missed_conflict
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [product-acceptance]
    expectedRedPredicate: cached and uncached verdicts or conflict outcomes differ, or false-block/missed-conflict fields are missing
    responsibility: task-required
  - caseId: test_prf0126_stop_rule_complexity_vs_savings_6a7d3e90
    semanticKey: stop_rule_complexity_vs_savings
    coversAcceptance: [ACC-5]
    coversImpactEdges: [product-acceptance]
    expectedRedPredicate: measured savings do not exceed added implementation and maintenance cost, but no stop decision is recorded
    responsibility: task-required
requiredTestCaseIds: [test_prf0126_same_fixture_ab_p50_p95_31f1a0c2, test_prf0126_verdict_digest_false_block_missed_conflict_82e4b1d9, test_prf0126_stop_rule_complexity_vs_savings_6a7d3e90]
rollback:
  strategy: revert-commit
  notes: Revert only the evidence/report addition; do not alter TASK-PRF-0125 history.
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-close-readiness-map
  atomCid: null
  mapUpdates: []
  extractionCandidates: []
tags: [product-proof, performance, stop-rule]
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0126 Run same-fixture close-readiness A/B performance proof and stop-rule decision

## Intent

TASK-PRF-0125 proved correctness but its governed close did not prove the promised performance benefit. Produce one reproducible same-fixture A/B report for uncached versus run-local snapshot close-readiness, including wall-time p50/p95, child-process count, verdict digest equality, false-block and missed-conflict outcomes, and a stop-rule decision. Do not modify TASK-PRF-0125 or treat task status as product acceptance.

## Acceptance

- [ ] **ACC-1 — same conditions:** baseline and candidate run on the same commit, host, fixture, Node version, and repetition count; report raw samples and excluded runs.
- [ ] **ACC-2 — measurable latency:** report wall-time p50/p95 and child-process count for both paths; use milliseconds and explicit sample count.
- [ ] **ACC-3 — exact correctness:** cached/uncached verdict JSON, blocker codes, changed-file lists, and evidence references have byte-identical digests on the same immutable fixture.
- [ ] **ACC-4 — safety outcomes:** deletion, rename, stale-base, foreign-staged, and planning-drift fixtures show no false block or missed conflict; missing observations are `null`, never zero.
- [ ] **ACC-5 — stop rule:** accept only if savings exceed added complexity and maintenance cost; otherwise record `STOP — no net benefit` and recommend removal or rollback.

## Method

1. Pin commit, host, Node version, fixture, and command lines before measurement.
2. Execute uncached/candidate paths in interleaved ABAB order with warm-up excluded.
3. Capture raw per-run milliseconds, child-process count, verdict digest, false-block and missed-conflict fields.
4. Publish the Markdown summary and machine-readable JSON under `docs/reports/`.
5. Close only when the report contains a signed accept/stop decision; task closure is not a substitute for product acceptance.

## Stop conditions

- Any verdict mismatch, false pass, missed conflict, or missing raw sample: STOP and do not claim speedup.
- Candidate p95 regression greater than 10%: STOP and recommend revert.
- Savings do not exceed added complexity or maintenance cost: STOP — no net benefit.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-23T02:52:56.821Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0126-run-same-fixture-close-readiness-a-b-performance-proof-and-stop-rule-decision.task.md","contentDigest":"sha256:27e1990235044629502afed4a343a20dd1c58f285a4d9203f73a51b136af73e3"} -->
