---
task_id: TASK-PRF-0118
title: Complete external benchmark data-plane metrics and fail-closed validation
status: done
owner: benchmark-custodian
priority: P1
depends_on: [TASK-PRF-0007]
causalGraph:
  causalDependencies: [TASK-PRF-0007]
  startConditions:
    - "The benchmark protocol names completion, false-block, missed-conflict, human-time, token, billed-cost, retry, and repair-time metrics, but the real paired executor does not emit one canonical record containing them."
    - "No paid or provider-backed benchmark run may start while a missing field can be interpreted as zero or a missing completion value can default to success."
  softRelations: [TASK-PRF-0019, TASK-PRF-0042]
  changedPublicSeams: [external-benchmark-raw-record, external-benchmark-decision]
  causalImpactEdges: [benchmark-metrics-are-observed, incomplete-runs-fail-closed, product-decision-is-replayable]
  parallelFrontierInputs: [executor-raw-packet, oracle-adjudication, provider-telemetry]
  validatorReferences: [test_prf0118_canonical_raw_record, test_prf0118_missing_completion_fail_closed, test_prf0118_decision_replay]
  phaseOwner: phase-5-benchmark-execution
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/lib/external-benchmark/arm-driver.ts
  - scripts/lib/external-benchmark/executor.ts
  - scripts/lib/external-benchmark/paired-executor.ts
  - scripts/lib/external-benchmark/metrics.ts
  - scripts/lib/external-benchmark/adjudication.ts
  - scripts/lib/external-benchmark/report.ts
  - scripts/lib/external-benchmark/runner.ts
  - scripts/run-atm-external-benchmark.ts
  - scripts/validate-external-benchmark-decision.ts
  - scripts/validate-external-benchmark-metrics.ts
  - tests/cli/external-benchmark-executor.test.ts
  - tests/cli/external-benchmark-paired-executor.test.ts
  - tests/cli/external-benchmark-v2-metrics.test.ts
  - tests/cli/external-benchmark-decision.test.ts
deliverables:
  - scripts/lib/external-benchmark/executor.ts
  - scripts/lib/external-benchmark/metrics.ts
  - scripts/lib/external-benchmark/runner.ts
  - scripts/lib/external-benchmark/report.ts
  - scripts/validate-external-benchmark-decision.ts
  - scripts/validate-external-benchmark-metrics.ts
  - tests/cli/external-benchmark-executor.test.ts
  - tests/cli/external-benchmark-v2-metrics.test.ts
  - tests/cli/external-benchmark-decision.test.ts
validators:
  - node atm.mjs tasks import --from C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0118-complete-external-benchmark-data-plane-metrics-and-fail-closed-validation.task.md --dry-run --json
  - node --strip-types tests/cli/external-benchmark-executor.test.ts
  - node --strip-types tests/cli/external-benchmark-paired-executor.test.ts
  - node --strip-types tests/cli/external-benchmark-v2-metrics.test.ts
  - node --strip-types tests/cli/external-benchmark-decision.test.ts
  - node scripts/validate-external-benchmark-metrics.ts
  - git diff --check -- scripts/lib/external-benchmark/arm-driver.ts scripts/lib/external-benchmark/executor.ts scripts/lib/external-benchmark/metrics.ts scripts/lib/external-benchmark/report.ts scripts/lib/external-benchmark/runner.ts scripts/run-atm-external-benchmark.ts scripts/validate-external-benchmark-metrics.ts tests/cli/external-benchmark-executor.test.ts tests/cli/external-benchmark-paired-executor.test.ts tests/cli/external-benchmark-v2-metrics.test.ts tests/cli/external-benchmark-decision.test.ts
evidence:
  required: canonical-raw-record-and-fail-closed-decision-replay
rollback:
  strategy: revert-data-plane-only
  notes: "Revert only the scoped benchmark data-plane changes; do not alter the preregistered manifest, hidden corpus, provider exports, npm package pin, historical benchmark records, or unrelated task state."
atomizationImpact:
  ownerAtomOrMap: atm.external-benchmark-decision-map
  mapUpdates: []
  newScriptsAllowed: false
  extractionCandidates: []
testContributions:
  - caseId: test_prf0118_canonical_raw_record
    targetGroupId: null
    semanticKey: canonical_raw_record_carries_required_observed_metrics
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [benchmark-metrics-are-observed]
    expectedRedPredicate: "The real paired executor emits a packet that omits completion, oracle decision binding, human intervals, retries, repair timestamps, or an explicit unavailable value."
    contributionResourceKey: external-benchmark-raw-record
    responsibility: task-required
    dependencyEdge: TASK-PRF-0007
    contractEdge: benchmark-metrics-are-observed
    resourceKey: canonical-raw-record
  - caseId: test_prf0118_missing_completion_fail_closed
    targetGroupId: null
    semanticKey: missing_completion_cannot_become_success
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [incomplete-runs-fail-closed]
    expectedRedPredicate: "A run with missing or incomplete completion evidence reaches keep, stop, or a 100% completion default instead of inconclusive."
    contributionResourceKey: external-benchmark-fail-closed
    responsibility: task-required
    dependencyEdge: TASK-PRF-0007
    contractEdge: product-decision-net-benefit
    resourceKey: missing-completion-negative
  - caseId: test_prf0118_decision_replay
    targetGroupId: null
    semanticKey: decision_replays_from_raw_records_and_oracle_labels
    coversAcceptance: [ACC-5, ACC-6]
    coversImpactEdges: [product-decision-is-replayable]
    expectedRedPredicate: "The decision layer reports a positive product result without recomputing completion, false-block, missed-conflict, cost, retries, and repair-time from bound raw records."
    contributionResourceKey: external-benchmark-decision
    responsibility: task-required
    dependencyEdge: TASK-PRF-0007
    contractEdge: product-decision-net-benefit
    resourceKey: decision-replay
requiredTestCaseIds: [test_prf0118_canonical_raw_record, test_prf0118_missing_completion_fail_closed, test_prf0118_decision_replay]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
nonGoals:
  - "Do not execute a paid provider or formal external benchmark."
  - "Do not change the preregistered manifest, package version pin, hidden corpus, oracle custody, or provider credentials."
  - "Do not redesign the benchmark protocol or add a second incompatible raw-record format."
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-22T00:48:06.153Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-22T00:48:06.153Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-22T00-48-06-153Z-close-103a5f42a338"
lastTransitionAt: "2026-09-22T00:48:06.153Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ee7f75727ae36c9e3e645ae217f4fbd21faac1ab"
---

# TASK-PRF-0118 Complete external benchmark data-plane metrics and fail-closed validation

## Intent

The current external-benchmark data plane is split across two incompatible
contracts. The real paired executor emits status, session, command, token,
cost, and wall-clock fields, while the older metrics and adjudication layers
expect completion, human intervals, retries, repair timestamps, false-block,
and missed-conflict evidence. The report also treats missing completion as
`1` when no threshold is supplied. That makes a structurally incomplete run
look successful and prevents an independent A/B decision from being replayed.

This card connects one canonical raw record to the existing v2 metric and
oracle contracts, computes every required metric from observed evidence, and
fails closed to `inconclusive` whenever a required value or binding is absent.
It is a data-plane repair only; it must make the later benchmark possible, not
claim that ATM has already beaten the worktree baseline.

## Acceptance

- [ ] **ACC-1 — Canonical raw record:** Every real paired arm record carries
      immutable run/pair/arm/repository/version bindings plus status, start and
      finish timestamps, wall-clock, provider/model, token usage, billed cost,
      human intervention intervals, retry count, repair timestamps, and an
      explicit completion/oracle reference. Unavailable values are `null` with
      a reason, never omitted or coerced to zero.
- [ ] **ACC-2 — One aggregation path:** The execution output consumed by
      `runner.ts` and `report.ts` is the same canonical record used by the
      metric validator; the disconnected legacy `RawBenchmarkRun` path is
      removed or made an explicit adapter with a test proving equivalence.
- [ ] **ACC-3 — Fail closed:** Missing completion, oracle adjudication,
      false-block/missed-conflict denominator, human-time evidence, billed-cost
      evidence, retry count, or repair timestamps yields `inconclusive` (or an
      explicit unavailable metric) and can never default to a successful
      completion or a `keep` verdict.
- [ ] **ACC-4 — Negative controls:** Tests prove that incomplete runs,
      mismatched run bindings, forged provider exports, and missing cost or
      repair evidence cannot produce a positive product decision.
- [ ] **ACC-5 — Decision replay:** From the sealed raw records, oracle labels,
      provider export digest, and preregistered thresholds, an independent
      verifier can recompute completion, false-block, missed-conflict,
      human-minutes, tokens, billed cost, retries, repair time, and the final
      `keep`/`narrow`/`stop`/`inconclusive` verdict.
- [ ] **ACC-6 — Scope discipline:** No paid/provider-backed benchmark is run;
      no npm publish, manifest reseal, hidden-corpus change, provider
      credential change, or historical evidence rewrite is included.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T00:24:40.513Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0118-complete-external-benchmark-data-plane-metrics-and-fail-closed-validation.task.md","contentDigest":"sha256:64499d06836f51150735d0a5a9b5305e362dc2805fa13450a1eb55257d251bca"} -->
