---
task_id: TASK-PRF-0007
title: Preregister an independent external ATM benchmark
status: done
owner: atm-evaluation
priority: P1
series: PRF
series_reason: Closest approved family because the benchmark is the independent product-proof decision authority.
depends_on: [TASK-PRF-0004, TASK-PRF-0005, TASK-PRF-0006]
causalGraph:
  causalDependencies: [TASK-PRF-0004, TASK-PRF-0005, TASK-PRF-0006]
  startConditions:
    - Public npm and reduced adopter artifacts pass their external exit gates.
    - At least two non-ATM-authored external repositories are eligible for sealing.
  softRelations: [TASK-PRF-0008]
  changedPublicSeams: [comparative-evaluation-protocol, sealed-corpus-contract, independent-oracle-contract]
  causalImpactEdges:
    - baseline-executes-real-worktree-git-workflow
    - atm-arm-installs-public-npm-artifact
    - oracle-is-independent-from-both-arm-implementers
  parallelFrontierInputs:
    - external-repository-eligibility-report
    - published-package-version-and-digest
    - phase-4-artifact-manifests
  validatorReferences:
    - test_prf_benchmark_protocol_seal_d01cf8e4
    - test_prf_arm_realness_7a5283b9
    - test_prf_oracle_independence_3e9cfc12
  phaseOwner: phase-5-benchmark-preregistration
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/bench/ATM-ExternalBenchmark-PROTOCOL.md
  - scripts/fixtures/atm-external-benchmark/manifest.json
  - scripts/validate-external-benchmark-protocol.ts
  - tests/cli/external-benchmark-protocol.test.ts
  - schemas/evidence/external-benchmark-run.schema.json
deliverables:
  - docs/bench/ATM-ExternalBenchmark-PROTOCOL.md
  - scripts/fixtures/atm-external-benchmark/manifest.json
  - scripts/validate-external-benchmark-protocol.ts
  - tests/cli/external-benchmark-protocol.test.ts
  - schemas/evidence/external-benchmark-run.schema.json
validators:
  - node --strip-types tests/cli/external-benchmark-protocol.test.ts
  - node --strip-types scripts/validate-external-benchmark-protocol.ts
testContributions:
  - caseId: test_prf_benchmark_protocol_seal_d01cf8e4
    targetGroupId: null
    semanticKey: external_benchmark_protocol_seal
    coversAcceptance: [ACC-1, ACC-4]
    coversImpactEdges: [baseline-executes-real-worktree-git-workflow]
    expectedRedPredicate: Protocol can change after evidence is visible, or baseline uses a modeled substitute.
    contributionResourceKey: external-benchmark-protocol
    responsibility: task-required
    dependencyEdge: preregistration-to-run-admission
    contractEdge: comparative-evaluation-protocol
    resourceKey: protocol-seal
  - caseId: test_prf_arm_realness_7a5283b9
    targetGroupId: null
    semanticKey: benchmark_arm_realness
    coversAcceptance: [ACC-2]
    coversImpactEdges: [baseline-executes-real-worktree-git-workflow, atm-arm-installs-public-npm-artifact]
    expectedRedPredicate: Either arm uses modeled timing, workspace link, fixture, or derived p95 instead of raw execution.
    contributionResourceKey: arm-environment-manifest
    responsibility: task-required
    dependencyEdge: workload-to-arm-runner
    contractEdge: sealed-corpus-contract
    resourceKey: external-repositories
  - caseId: test_prf_oracle_independence_3e9cfc12
    targetGroupId: null
    semanticKey: benchmark_oracle_independence
    coversAcceptance: [ACC-3, ACC-5]
    coversImpactEdges: [oracle-is-independent-from-both-arm-implementers]
    expectedRedPredicate: Oracle labels or hidden conflicts are available to implementers before sealing.
    contributionResourceKey: oracle-separation-manifest
    responsibility: task-required
    dependencyEdge: hidden-corpus-to-adjudication
    contractEdge: independent-oracle-contract
    resourceKey: oracle
requiredTestCaseIds:
  - test_prf_benchmark_protocol_seal_d01cf8e4
  - test_prf_arm_realness_7a5283b9
  - test_prf_oracle_independence_3e9cfc12
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: invalidate-and-reseal
  notes: If protocol, corpus or oracle confidentiality changes after sealing, invalidate and preregister a new version.
atomizationImpact:
  ownerAtomOrMap: atm.comparative-evaluation-map
  mapUpdates: [atomic_workbench/maps/atm-comparative-evaluation-map.json]
  newScriptsAllowed: true
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-27T16:52:17.618Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-27T16:52:17.618Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-27T16-52-17-618Z-close-a5296a196a93"
lastTransitionAt: "2026-08-27T16:52:17.618Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "23f69f7bc805bff5a15a0467635e13c435cd3daa"
---

# TASK-PRF-0007 Preregister an independent external ATM benchmark

## Intent

Precommit the independent protocol, real execution arms, sealed external corpus,
oracle separation, metrics and decision rule before observing results.

## Acceptance

- [ ] ACC-1: Protocol, hypotheses, metrics, thresholds, retry rules, exclusions and precision analysis are sealed before execution.
- [ ] ACC-2: At least two external repository SHAs are sealed; baseline uses real worktree plus Git/PR and ATM installs only from public npm.
- [ ] ACC-3: Hidden oracle and adjudicator are separated from both implementers and cover conflicts, benign concurrency, stale-base, recovery and negative controls.
- [ ] ACC-4: AB/BA counterbalancing and environment controls are defined, and p95 uses raw timestamps only.
- [ ] ACC-5: False block, missed conflict, human minutes, tokens, billed cost, completion, retries and repair time have executable definitions.

## Out of scope

- Executing or interpreting benchmark results.
- Treating deterministic in-repo models as the Git baseline.

## Stop rule

Stop if repositories, package digest, oracle separation or raw cost telemetry
cannot be sealed. Mark unavailable fields; do not substitute modeled values.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-20T14:42:36.012Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0007-preregister-an-independent-external-atm-benchmark.task.md","contentDigest":"sha256:0e12b2f8533f70a2122ab1c671db1b9bb72f9ca1d9a528e4c347378870f7024d"} -->
