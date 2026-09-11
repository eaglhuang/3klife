---
task_id: TASK-PRF-0019
title: Execute independent external A/B benchmark with sealed corpus and cost telemetry
status: planned
owner: benchmark-custodian
priority: P0
depends_on:
  - TASK-PRF-0018
  - TASK-PRF-0006
causalGraph:
  causalDependencies: [TASK-PRF-0018, TASK-PRF-0006]
  startConditions:
    - An independent custodian seals the hidden corpus, prompts, scoring rubric and adjudication policy.
    - The benchmark manifest binds an immutable public ATM tarball and a reproducible worktree/Git baseline.
    - Provider telemetry exports token, wall-clock and retry measurements for every arm.
  softRelations: [TASK-PRF-0008]
  changedPublicSeams: [external-ab-benchmark]
  causalImpactEdges:
    - false-block-rate-is-measured
    - missed-conflict-rate-is-measured
    - human-and-token-cost-is-measured
    - atm-vs-worktree-complexity-tradeoff-is-decidable
  parallelFrontierInputs:
    - independent-corpus-custodian
    - provider-telemetry-export
    - baseline-worktree-harness
  validatorReferences:
    - test_prf_external_benchmark_seals_2e7c4b10
    - test_prf_external_benchmark_metrics_8c1f9a44
  phaseOwner: phase-4-independent-external-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/fixtures/atm-external-benchmark/manifest.json
  - scripts/validate-external-benchmark-protocol.ts
  - scripts/validate-external-benchmark-metrics.ts
  - scripts/validate-external-benchmark-decision.ts
  - docs/reports/atm-external-benchmark-decision.md
deliverables:
  - scripts/fixtures/atm-external-benchmark/manifest.json
  - scripts/validate-external-benchmark-protocol.ts
  - scripts/validate-external-benchmark-metrics.ts
  - scripts/validate-external-benchmark-decision.ts
  - docs/reports/atm-external-benchmark-decision.md
validators:
  - node --strip-types scripts/validate-external-benchmark-protocol.ts --mode validate
  - node --strip-types scripts/validate-external-benchmark-metrics.ts --mode validate
  - node --strip-types scripts/validate-external-benchmark-decision.ts --mode validate
  - node --strip-types tests/cli/external-benchmark-protocol.test.ts
  - node --strip-types tests/cli/external-benchmark-metrics.test.ts
  - node --strip-types tests/cli/external-benchmark-decision.test.ts
testContributions:
  - caseId: test_prf_external_benchmark_seals_2e7c4b10
    semanticKey: benchmark_seals_are_independent_and_exact
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [atm-vs-worktree-complexity-tradeoff-is-decidable]
    expectedRedPredicate: A run can execute with an unsealed corpus, mutable package, provider substitution or non-independent adjudicator.
    responsibility: task-required
  - caseId: test_prf_external_benchmark_metrics_8c1f9a44
    semanticKey: benchmark_reports_false_blocks_missed_conflicts_and_cost
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [false-block-rate-is-measured, missed-conflict-rate-is-measured, human-and-token-cost-is-measured]
    expectedRedPredicate: The report lacks denominators, confidence intervals, token/wall-clock cost or a directly comparable worktree baseline.
    responsibility: task-required
requiredTestCaseIds:
  - test_prf_external_benchmark_seals_2e7c4b10
  - test_prf_external_benchmark_metrics_8c1f9a44
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: command-backed-and-independent-custodian-attestation
rollback:
  strategy: invalidate-unsealed-run-and-preserve-raw-ledger
  notes: Never rewrite a sealed run or selectively remove unfavorable trials; mark the run invalid and publish the raw ledger plus reason.
atomizationImpact:
  ownerAtomOrMap: atm.external-proof-map
  mapUpdates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0019 Execute independent external A/B benchmark with sealed corpus and cost telemetry

## Intent

Execute a preregistered, provider-neutral A/B benchmark comparing ATM against
the baseline “one worktree per agent plus Git merge/rebase and CI”. The benchmark
must measure false blocks, missed conflicts, human intervention time, token
consumption, wall-clock time, retry count and merge/rebase effort on the same
hidden task corpus. It must be independently adjudicated and reproducible from
the sealed manifest and public package digest.

## Acceptance

- [ ] ACC-1: Corpus, prompts, task generators, scoring rubric and adjudicator are independently sealed; operators cannot inspect or alter hidden cases.
- [ ] ACC-2: ATM and worktree arms run on the same task order, agent/provider budget and repository snapshots; package version and SHA-256 are exact and immutable.
- [ ] ACC-3: Report publishes denominators, confidence intervals, false-block rate, missed-conflict rate, human minutes, token cost, wall-clock, retries and merge/rebase overhead for both arms.
- [ ] ACC-4: Decision rule is preregistered: ATM is preferred only if safety is non-inferior and its total human+token cost is lower by the declared margin; otherwise report “not proven”.

## Out of scope

- Selecting favorable tasks after seeing results or substituting local green output for external execution.
- Claiming superiority from anecdotal case studies, framework-internal tests or a single provider.

## Stop rule

If any independent seal, telemetry stream or baseline execution is missing, leave
the run **BLOCKED / INCONCLUSIVE** and publish the exact missing input rather
than computing a directional conclusion.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T00:46:25.686Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0019-execute-independent-external-a-b-benchmark-with-sealed-corpus-and-cost-telemetry.task.md","contentDigest":"sha256:5da68296ff412c38bef59fa6d9009689fa7e60b4d55f9e6f9a6d3558571c8681"} -->
