---
task_id: TASK-PRF-0008
title: Execute the external benchmark and issue the product decision
status: planned
owner: atm-evaluation
priority: P0
series: PRF
series_reason: Closest approved family because this card produces the terminal evidence for the ATM product-proof plan.
depends_on: [TASK-PRF-0007]
causalGraph:
  causalDependencies: [TASK-PRF-0007]
  startConditions:
    - TASK-PRF-0007 protocol, corpus, environment and oracle seals are valid.
    - Independent adjudicator and raw telemetry destinations are available.
  softRelations: []
  changedPublicSeams: [comparative-evaluation-runner, benchmark-cost-ledger, keep-narrow-stop-decision]
  causalImpactEdges:
    - raw-runs-produce-reproducible-metrics
    - adjudication-preserves-oracle-independence
    - decision-follows-preregistered-thresholds
  parallelFrontierInputs:
    - sealed-benchmark-protocol
    - sealed-external-corpus
    - independent-oracle-manifest
  validatorReferences:
    - test_prf_raw_metric_accounting_c713e425
    - test_prf_adjudication_reproducibility_8e69b04f
    - test_prf_product_decision_rule_95d21a7c
  phaseOwner: phase-5-benchmark-execution-and-decision
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/run-atm-external-benchmark.ts
  - scripts/lib/external-benchmark/runner.ts
  - scripts/lib/external-benchmark/metrics.ts
  - scripts/lib/external-benchmark/adjudication.ts
  - scripts/lib/external-benchmark/report.ts
  - tests/cli/external-benchmark-metrics.test.ts
  - tests/cli/external-benchmark-decision.test.ts
  - docs/reports/atm-external-benchmark-decision.md
deliverables:
  - scripts/run-atm-external-benchmark.ts
  - scripts/lib/external-benchmark/runner.ts
  - scripts/lib/external-benchmark/metrics.ts
  - scripts/lib/external-benchmark/adjudication.ts
  - scripts/lib/external-benchmark/report.ts
  - tests/cli/external-benchmark-metrics.test.ts
  - tests/cli/external-benchmark-decision.test.ts
  - docs/reports/atm-external-benchmark-decision.md
validators:
  - node --strip-types tests/cli/external-benchmark-metrics.test.ts
  - node --strip-types tests/cli/external-benchmark-decision.test.ts
  - node --strip-types scripts/validate-external-benchmark-protocol.ts
testContributions:
  - caseId: test_prf_raw_metric_accounting_c713e425
    targetGroupId: null
    semanticKey: external_benchmark_raw_metric_accounting
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [raw-runs-produce-reproducible-metrics]
    expectedRedPredicate: Aggregate safety or cost values cannot be reproduced from raw run records.
    contributionResourceKey: benchmark-raw-runs
    responsibility: task-required
    dependencyEdge: raw-run-to-aggregate-metric
    contractEdge: benchmark-cost-ledger
    resourceKey: benchmark-run-store
  - caseId: test_prf_adjudication_reproducibility_8e69b04f
    targetGroupId: null
    semanticKey: independent_adjudication_reproducibility
    coversAcceptance: [ACC-3]
    coversImpactEdges: [adjudication-preserves-oracle-independence]
    expectedRedPredicate: Adjudication cannot be reproduced from sealed oracle and anonymized outputs.
    contributionResourceKey: adjudication-manifest
    responsibility: task-required
    dependencyEdge: sealed-oracle-to-run-verdict
    contractEdge: comparative-evaluation-runner
    resourceKey: oracle
  - caseId: test_prf_product_decision_rule_95d21a7c
    targetGroupId: null
    semanticKey: keep_narrow_stop_decision
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [decision-follows-preregistered-thresholds]
    expectedRedPredicate: Decision differs from preregistered thresholds or omits an unavailable or adverse primary metric.
    contributionResourceKey: benchmark-decision-report
    responsibility: task-required
    dependencyEdge: aggregate-metrics-to-product-decision
    contractEdge: keep-narrow-stop-decision
    resourceKey: decision-report
requiredTestCaseIds:
  - test_prf_raw_metric_accounting_c713e425
  - test_prf_adjudication_reproducibility_8e69b04f
  - test_prf_product_decision_rule_95d21a7c
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: invalidate-run-and-rerun-sealed-round
  notes: Never edit raw evidence. Preserve and invalidate a compromised round, then reseal before rerun.
atomizationImpact:
  ownerAtomOrMap: atm.comparative-evaluation-map
  mapUpdates: [atomic_workbench/maps/atm-comparative-evaluation-map.json]
  newScriptsAllowed: true
  extractionCandidates:
    - atom: atm.comparative-evaluation-runner
      pattern: Strategy plus Independent Oracle
      source: scripts/run-atm-external-benchmark.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0008 Execute the external benchmark and issue the product decision

## Intent

Execute the sealed benchmark, preserve raw evidence and publish the binding keep,
narrow or stop decision for ATM.

## Acceptance

- [ ] ACC-1: Both real arms complete the sealed AB/BA workload without modeled timing, hard-coded side effects or workspace-linked ATM code.
- [ ] ACC-2: Raw timestamps, prompts, tokens, billed cost, human minutes, retries, commands and repairs reproduce every aggregate.
- [ ] ACC-3: Independent oracle adjudication produces false-block, missed-conflict and completion labels without label leakage.
- [ ] ACC-4: The decision applies safety non-inferiority, no worse false-block rate and at least 20% primary cost improvement without material cost regression.
- [ ] ACC-5: If two independent rounds fail, general governance expansion stops and the smallest optional capability is named for any narrow retest.

## Out of scope

- Changing thresholds after observing results.
- Declaring success from task closure, synthetic workloads or incomplete cost data.

## Stop rule

Invalidate a round if seals, oracle independence, environment parity or raw
telemetry are compromised. If required cost data are unavailable, publish an
inconclusive result rather than inferring benefit.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-20T14:42:38.297Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0008-execute-the-external-benchmark-and-issue-the-product-decision.task.md","contentDigest":"sha256:02bb06784663bc866091bbe8830b2586704096e8e8a276305af42673684ccc34"} -->
