---
task_id: TASK-PRF-0018
title: Republish slim npm runtime and rebind benchmark package
status: planned
owner: atm-release
priority: P0
depends_on:
  - TASK-PRF-0016
  - TASK-PRF-0006
causalGraph:
  causalDependencies: [TASK-PRF-0016, TASK-PRF-0006]
  startConditions:
    - The release owner authorizes publication of a new immutable beta version.
    - The current source build produces the declared npm-runtime boundary without workspace links.
    - The benchmark protocol is amended and resealed to the exact new public tarball digest before any run.
  softRelations: [TASK-PRF-0008]
  changedPublicSeams: [public-npm-runtime-size]
  causalImpactEdges:
    - public-tarball-is-installable
    - adopter-runtime-stays-within-size-budget
    - benchmark-arm-binds-to-current-tarball
  parallelFrontierInputs:
    - npm-runtime-output-inventory
    - immutable-public-beta-version
    - benchmark-protocol-preregistration
  validatorReferences:
    - test_prf_public_runtime_budget_7f2c4a11
    - test_prf_benchmark_tarball_binding_9a61d2e0
  phaseOwner: phase-2-public-npm-delivery
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/build-package-dist.ts
  - scripts/validate-public-npm-install.ts
  - scripts/validate-package-skeleton.ts
  - scripts/fixtures/atm-external-benchmark/manifest.json
  - docs/reports/atm-public-npm-install-proof-beta.md
  - docs/reports/atm-external-benchmark-decision.md
deliverables:
  - scripts/build-package-dist.ts
  - scripts/validate-public-npm-install.ts
  - scripts/validate-package-skeleton.ts
  - scripts/fixtures/atm-external-benchmark/manifest.json
  - docs/reports/atm-public-npm-install-proof-beta.md
  - docs/reports/atm-external-benchmark-decision.md
validators:
  - node --strip-types scripts/validate-package-skeleton.ts --mode install-smoke
  - node --strip-types scripts/validate-public-npm-install.ts --package @ai-atomic-framework/cli --version <new-version> --output docs/reports/atm-public-npm-install-proof-beta.md
  - node --strip-types scripts/validate-external-benchmark-protocol.ts --mode validate
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
testContributions:
  - caseId: test_prf_public_runtime_budget_7f2c4a11
    semanticKey: public_runtime_matches_declared_size_and_file_budget
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [public-tarball-is-installable, adopter-runtime-stays-within-size-budget]
    expectedRedPredicate: The published tarball is installable but exceeds the declared runtime file or byte budget, or includes forbidden source/evidence surfaces.
    responsibility: task-required
  - caseId: test_prf_benchmark_tarball_binding_9a61d2e0
    semanticKey: benchmark_protocol_binds_exact_public_tarball
    coversAcceptance: [ACC-3]
    coversImpactEdges: [benchmark-arm-binds-to-current-tarball]
    expectedRedPredicate: The benchmark manifest names a version or SHA-256 that differs from the independently verified public tarball.
    responsibility: task-required
requiredTestCaseIds:
  - test_prf_public_runtime_budget_7f2c4a11
  - test_prf_benchmark_tarball_binding_9a61d2e0
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: retain-old-tag-and-invalidate-unbound-benchmark-protocol
  notes: Never overwrite an npm version or mutate a sealed benchmark after runs. If the size or dependency closure is wrong, publish nothing and reseal a new protocol only after a corrected immutable beta exists.
atomizationImpact:
  ownerAtomOrMap: atm.release-build-map
  mapUpdates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0018 Republish slim npm runtime and rebind benchmark package

## Intent

Republish the current slim npm runtime rather than treating the older public
beta.4 artifact as proof of a small adopter bundle. The public beta.4 measure
is 1,703,377 bytes compressed, 7,599,532 bytes unpacked and 1,152 files,
while the current local npm-runtime candidate is 930,475 bytes compressed,
3,357,258 bytes unpacked and 76 generated runtime files. The task must bind
the benchmark arm to the exact new public artifact.

## Acceptance

- [ ] ACC-1: The new public beta resolves from npm and passes isolated install plus `atm --version` with no workspace link.
- [ ] ACC-2: The public tarball's compressed/unpacked bytes and file inventory meet the declared adopter-runtime budget and exclude source, tests, fixtures and runtime evidence.
- [ ] ACC-3: The external benchmark manifest is resealed to the exact published version and SHA-256 before execution; a mismatch fails closed.

## Out of scope

- Publishing without explicit owner authorization.
- Reusing beta.4's digest as evidence for a different package payload.
- Executing the external benchmark before independent corpus, adjudication and provider-telemetry seals exist.

## Stop rule

If the package is installable but over budget, or if the registry payload does
not match the benchmark seal, leave the task open and report the exact digest
and size rather than claiming the small-package requirement is met.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T00:34:01.043Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0018-republish-slim-npm-runtime-and-rebind-benchmark-package.task.md","contentDigest":"sha256:a9c062f91ea8585bae5752b89dc7261ae4cd1ba3484a868c615f8b8c2dda9efb"} -->
