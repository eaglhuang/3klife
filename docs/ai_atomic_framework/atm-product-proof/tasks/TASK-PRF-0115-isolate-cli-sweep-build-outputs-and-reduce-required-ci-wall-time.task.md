---
task_id: TASK-PRF-0115
title: Isolate CLI sweep build outputs and reduce required CI wall time
status: planned
owner: ci-product
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - "Product CI run 35619033450 is green, but its CLI test sweep consumed 423000 ms wall time."
    - "Seven sweep tests are serialized only because they mutate the same packages/cli/dist and release/** output trees."
    - "A same-runner AB/BA baseline must exist before choosing output isolation or shared-fixture reuse."
  softRelations: [TASK-PRF-0108, TASK-PRF-0111]
  changedPublicSeams: [cli-test-sweep-isolation, release-builder-test-fixture]
  causalImpactEdges: [required-ci-wall-time, clean-install-release-correctness, multi-ai-shared-output-safety]
  parallelFrontierInputs: [cli-sweep-wall-clock-baseline, generated-output-ownership]
  validatorReferences: [cli-sweep-fixture-isolation, product-ci-required-wall-time]
  phaseOwner: ci-product
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/run-cli-test-sweep.ts
  - scripts/cli-test-sweep.config.json
  - scripts/build-package-dist.ts
  - scripts/build-root-drop-release.ts
  - scripts/build-onefile-release.ts
  - tests/cli/onefile-root-drop-build-coordination.test.ts
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/root-drop-release-incremental-overlay.test.ts
  - tests/cli/root-drop-release-manifest-integrity.test.ts
  - tests/cli/root-drop-release-source-list.test.ts
  - tests/cli/runner-sync-incremental-build-dogfood.test.ts
  - tests/cli/runner-sync-incremental-build.test.ts
  - tests/cli/cli-test-sweep-output-isolation.test.ts
  - docs/reports/atm-command-gate-latency-score.md
deliverables:
  - scripts/run-cli-test-sweep.ts
  - scripts/cli-test-sweep.config.json
  - scripts/build-package-dist.ts
  - scripts/build-root-drop-release.ts
  - scripts/build-onefile-release.ts
  - tests/cli/cli-test-sweep-output-isolation.test.ts
  - docs/reports/atm-command-gate-latency-score.md
validators:
  - node --strip-types tests/cli/onefile-root-drop-build-coordination.test.ts
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - node --strip-types scripts/run-cli-test-sweep.ts
  - npm run validate:root-drop-release
  - npm run validate:onefile-release
  - node --strip-types scripts/measure-product-ci-burn-in.ts --stdin --report-only
testContributions:
  - caseId: test_prf0115_sweep_output_isolation_5b9e2ca1
    targetGroupId: null
    semanticKey: cli_sweep_output_isolation
    coversAcceptance: [ACC-2, ACC-3]
    coversImpactEdges: [required-ci-wall-time, multi-ai-shared-output-safety]
    expectedRedPredicate: concurrent release-oriented sweep members overwrite, delete, or observe another member's generated output
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: generated-output-ownership
    contractEdge: cli-test-sweep-isolation
    resourceKey: release-generated-output
  - caseId: test_prf0115_required_ci_wall_time_12d24e93
    targetGroupId: null
    semanticKey: product_ci_sweep_wall_time
    coversAcceptance: [ACC-1, ACC-4, ACC-5]
    coversImpactEdges: [required-ci-wall-time, clean-install-release-correctness]
    expectedRedPredicate: candidate lacks paired wall-clock evidence, regresses p95, or changes the release/clean-install contract
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: cli-sweep-wall-clock-baseline
    contractEdge: product-ci-required-wall-time
    resourceKey: ci-sweep-wall-clock
requiredTestCaseIds:
  - test_prf0115_sweep_output_isolation_5b9e2ca1
  - test_prf0115_required_ci_wall_time_12d24e93
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: external-paired-ci-sweep-wall-clock-receipt
rollback:
  strategy: revert-commit
  notes: Revert the selected fixture or output-root seam; retain external timing and negative-case evidence.
atomizationImpact:
  ownerAtomOrMap: atm.release.builder-coordination
  mapUpdates: []
  extractionCandidates:
    - atom: atm.cli-sweep-output-fixture
      pattern: Deep Module
      source: scripts/build-onefile-release.ts
      disposition: inline
      inlineReason: This card must prove one bounded test-fixture seam before creating any reusable module; splitting the release builder now would add surface before a second caller is demonstrated.
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0115 Isolate CLI sweep build outputs and reduce required CI wall time

## Intent

Product CI's required CLI sweep took about seven minutes in the latest green
run. Seven release-oriented tests are deliberately serialized because they
write `packages/cli/dist` and `release/**` under the same repository root.
That cost is paid on every integration and therefore affects real multi-AI
delivery latency. It is not acceptable to merely increase concurrency and
introduce flakes, nor to create a second long-lived worktree, daemon, cache, or
governance lane.

First establish a same-runner AB/BA and A/A wall-clock baseline. Then choose
exactly one smallest safe mechanism: independent temporary output roots, or a
reusable read-only build fixture that eliminates duplicate build work. The
choice must preserve release manifests, clean-install behaviour and failure
visibility. If neither mechanism lowers the required Product CI wall time by
20% without a p95 regression, report inconclusive and stop.

## Acceptance

- [ ] ACC-1: A baseline records Product CI-equivalent sweep wall time, p50,
      p95, per-test duration, timeout and failure samples under fixed runner,
      Node, cache and source SHA. Aggregate child duration is not substituted
      for wall time.
- [ ] ACC-2: Each formerly serial test either has a private temporary generated
      output root or consumes a verified reusable fixture; concurrent members
      cannot write another member's output. No long-lived worktree, daemon,
      second task store, registry, command or shared-write lane is introduced.
- [ ] ACC-3: Root-drop and onefile manifests, frozen launcher behaviour, npm
      clean-install matrix and failure/timeout semantics remain equivalent to
      the baseline. A deliberately conflicting-output negative case must fail
      rather than silently pass.
- [ ] ACC-4: At least 15 interleaved AB/BA pairs and 8 A/A controls are stored
      outside Git. Candidate required sweep wall-time p50 improves at least
      20%, p95 does not regress more than 10%, and no new flaky retry occurs;
      otherwise record the contrary evidence and stop.
- [ ] ACC-5: Product CI remains green on the candidate commit. The report
      distinguishes this internal required-gate reduction from any unproven
      external net-benefit claim.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-21T15:50:14.105Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0115-isolate-cli-sweep-build-outputs-and-reduce-required-ci-wall-time.task.md","contentDigest":"sha256:97a550e4f3ab8b5ed79c1eaf2a10af69b071fed9559b8b8c7122aff52b8d10dc"} -->
