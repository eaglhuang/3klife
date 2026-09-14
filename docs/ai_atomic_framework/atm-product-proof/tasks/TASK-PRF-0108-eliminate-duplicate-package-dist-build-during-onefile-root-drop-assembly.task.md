---
task_id: TASK-PRF-0108
title: Eliminate duplicate package-dist build during onefile/root-drop assembly
status: done
owner: atm-build
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - latest standard-profile telemetry shows validate-bootstrap as a 146542 ms hotspot
    - buildOnefileRelease invokes package-dist directly and root-drop assembly invokes it again
    - artifact manifests and runner semantics are available for before/after digest comparison
  softRelations:
    - TASK-PRF-0101
    - TASK-PRF-0107
  changedPublicSeams:
    - atm.release.onefile-build
    - atm.release.root-drop-build
  causalImpactEdges:
    - standard-validation-wall-time
    - bootstrap-runner-correctness
    - command-gate-latency-score
  parallelFrontierInputs:
    - TASK-PRF-0101
    - TASK-PRF-0107
  validatorReferences:
    - onefile-release-manifest-integrity
    - root-drop-release-manifest-integrity
    - bootstrap-clean-fixture
    - paired-build-latency
  phaseOwner: atm-build
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/build-onefile-release.ts
  - scripts/build-root-drop-release.ts
  - tests/cli/onefile-root-drop-build-coordination.test.ts
  - docs/reports/atm-command-gate-latency-score.md
deliverables:
  - scripts/build-onefile-release.ts
  - scripts/build-root-drop-release.ts
  - tests/cli/onefile-root-drop-build-coordination.test.ts
  - docs/reports/atm-command-gate-latency-score.md
validators:
  - node --strip-types tests/cli/onefile-root-drop-build-coordination.test.ts
  - npm run validate:root-drop-release
  - npm run validate:onefile-release
  - npm run validate:bootstrap
  - npm run check:encoding:touched -- --files scripts/build-onefile-release.ts scripts/build-root-drop-release.ts tests/cli/onefile-root-drop-build-coordination.test.ts docs/reports/atm-command-gate-latency-score.md
errorCodes: []
createdByCommand: atm plan card create
testContributions:
  - caseId: test_task_prf0108_build_once_contract_3e91a7c2
    targetGroupId: null
    semanticKey: onefile_root_drop_build_once
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [standard-validation-wall-time, bootstrap-runner-correctness]
    expectedRedPredicate: onefile assembly triggers package-dist more than once or skips the explicit root-drop default build contract
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: bootstrap-runner-correctness
    contractEdge: atm.release.onefile-build
    resourceKey: package-dist-build
  - caseId: test_task_prf0108_artifact_equivalence_7a5e4d11
    targetGroupId: null
    semanticKey: release_manifest_equivalence
    coversAcceptance: [ACC-2, ACC-3]
    coversImpactEdges: [bootstrap-runner-correctness]
    expectedRedPredicate: optimized build changes root-drop or onefile inventory, manifest digest, or launcher behavior
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: onefile-root-drop-build
    contractEdge: onefile-release-manifest-integrity
    resourceKey: release-artifact-digest
  - caseId: test_task_prf0108_latency_receipt_1c02f9a8
    targetGroupId: null
    semanticKey: paired_build_latency
    coversAcceptance: [ACC-4, ACC-5, ACC-6]
    coversImpactEdges: [standard-validation-wall-time, command-gate-latency-score]
    expectedRedPredicate: receipt lacks paired p50/p95 or semantic failure samples, or candidate p50 does not improve
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: standard-validation-wall-time
    contractEdge: paired-build-latency
    resourceKey: build-latency
requiredTestCaseIds:
  - test_task_prf0108_build_once_contract_3e91a7c2
  - test_task_prf0108_artifact_equivalence_7a5e4d11
  - test_task_prf0108_latency_receipt_1c02f9a8
advisoryTestCaseIds: []
phaseTestCaseIds: []
atomizationImpact:
  ownerAtomOrMap: atm.release.builder-coordination
  atomCid: null
  mapUpdates:
    - atomic_workbench/maps/atm-release-builder-map.json
  extractionCandidates:
    - atom: atm.release.package-dist-freshness
      pattern: Deep Module
      source: scripts/build-root-drop-release.ts
      disposition: inline
      inlineReason: the freshness precondition belongs to root-drop assembly; extracting a helper would add surface without a second caller contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: revert the single builder-coordination commit; retain paired receipts and artifact digests
tddMode: required
methodProfiles:
  - expand-contract
  - paired-performance
completed_at: "2026-09-14T20:59:46.557Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T20:59:46.557Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T20-59-46-557Z-close-57114b384004"
lastTransitionAt: "2026-09-14T20:59:46.557Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "80b06eafb0c886465d97e2db3eeb8fa57728e3b4"
---

# TASK-PRF-0108 Eliminate duplicate package-dist build during onefile/root-drop assembly

## Intent

The onefile builder currently calls `build-package-dist` directly and then
calls `buildRootDropRelease`, whose default safety contract builds the same
package dist again. This card removes only that duplicate work: root-drop keeps
its safe default for direct callers, while onefile passes an explicit proof that
it has already built the package dist. No validator, release check, lock, or
multi-AI ownership rule is removed.

## Acceptance

- [ ] Onefile assembly performs one package-dist build while direct root-drop
      callers still perform their own freshness build.
- [ ] Root-drop and onefile artifact inventories, launcher behavior, and sealed
      manifest digests remain equivalent to the baseline.
- [ ] Clean bootstrap, root-drop, and onefile validators remain green.
- [ ] External receipt contains at least 30 interleaved AB/BA measurements and
      8 A/A controls for the selected build/bootstrap workload, in milliseconds,
      with failure/timeout samples retained.
- [ ] Candidate p50 for the measured hotspot improves by at least 20% and p95
      does not regress by more than 10%; otherwise record inconclusive and stop.
- [ ] No new command, registry, daemon, lock boundary, or serialisation of
      private multi-AI reads is introduced.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T20:26:02.256Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0108-eliminate-duplicate-package-dist-build-during-onefile-root-drop-assembly.task.md","contentDigest":"sha256:252e1e8076400a03c1b69dbad33d816bb425881d8b5032a7d714d1eae187eb40"} -->
