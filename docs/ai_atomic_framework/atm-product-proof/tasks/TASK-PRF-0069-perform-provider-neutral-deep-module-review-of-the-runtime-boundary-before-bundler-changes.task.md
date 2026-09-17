---
task_id: TASK-PRF-0069
title: Perform provider-neutral deep-module review of the runtime boundary before bundler changes
status: planned
owner: external-reviewer
priority: P1
depends_on: [TASK-PRF-0062]
causalGraph:
  causalDependencies: [TASK-PRF-0062]
  startConditions:
    - "TASK-PRF-0062 established a candidate runtime boundary, but the current public package still fails chart commands."
    - "No bundler, code-splitting, package split, or runtime-boundary mutation may start until this review returns a provider-neutral receipt."
  softRelations: [TASK-PRF-0068, TASK-PRF-0050, TASK-PRF-0067]
  changedPublicSeams: [npm_runtime_boundary, frozen_runner_to_package_contract]
  causalImpactEdges: [adopter_bundle_cost, runtime_completeness, maintenance_complexity]
  parallelFrontierInputs: [runtime_topology_inventory, adapter_classification, bundle_option_measurements]
  validatorReferences: [test_prf0069_receipt_schema, test_prf0069_deletion_test, test_prf0069_negative_controls]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/**
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-candidate-npm-install.ts
  - scripts/validate-public-npm-install.ts
  - release/atm-onefile/atm.mjs
  - release/atm-root-drop/**
  - packages/cli/dist/**
  - scripts/engineering-change-method-profiles.json
deliverables:
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0069-deep-module-review.md
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0069-deep-module-review.json
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0069-dispatch-brief.md
planningArtifacts:
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0069-deep-module-review.md
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0069-deep-module-review.json
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0069-dispatch-brief.md
planningReadOnlyPaths:
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0069-deep-module-review.md
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0069-deep-module-review.json
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0069-dispatch-brief.md
validators:
  - node atm.mjs next --prompt "TASK-PRF-0069 provider-neutral deep-module review" --json
  - node atm.mjs doctor --json
  - node atm.mjs tasks import --from C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0069-perform-provider-neutral-deep-module-review-of-the-runtime-boundary-before-bundler-changes.task.md --dry-run --json
  - node --strip-types tests/cli/deep-module-review-contract.test.ts
  - node --strip-types tests/cli/deep-module-review-negative-controls.test.ts
  - git diff --check -- packages/cli/src/atm.ts scripts/build-cli-npm-runtime.ts scripts/validate-candidate-npm-install.ts scripts/validate-public-npm-install.ts release/atm-onefile/atm.mjs
testContributions:
  - caseId: test_prf0069_receipt_schema
    targetGroupId: null
    semanticKey: deep_module_review_receipt_contract
    coversAcceptance: [ACC-1, ACC-5, ACC-6, ACC-8]
    coversImpactEdges: [runtime_completeness]
    expectedRedPredicate: "A review can recommend a runtime refactor without a provider-neutral receipt, source digests, or read-only attestation."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0062
    contractEdge: npm_runtime_boundary
    resourceKey: review-receipt
  - caseId: test_prf0069_deletion_test
    targetGroupId: null
    semanticKey: deletion_test_and_two_adapter_rule
    coversAcceptance: [ACC-2, ACC-3]
    coversImpactEdges: [maintenance_complexity]
    expectedRedPredicate: "A shallow wrapper or file-length finding is promoted as a deep module without caller-complexity reduction or two concrete adapters."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0062
    contractEdge: frozen_runner_to_package_contract
    resourceKey: deep-module-review
  - caseId: test_prf0069_negative_controls
    targetGroupId: null
    semanticKey: pre_review_bundler_mutation_rejected
    coversAcceptance: [ACC-4, ACC-7]
    coversImpactEdges: [adopter_bundle_cost]
    expectedRedPredicate: "Code splitting or package splitting is treated as approved before completeness and dependency-cost evidence exists."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0062
    contractEdge: npm_runtime_boundary
    resourceKey: negative-controls
requiredTestCaseIds: [test_prf0069_receipt_schema, test_prf0069_deletion_test, test_prf0069_negative_controls]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: not-applicable
tddNotApplicableReason: "This card is an external read-only architecture review; implementation tests are deferred until Captain accepts the receipt and opens a follow-up implementation card."
tddExemptions: [external-review-only]
methodProfiles: [deep-module-refactor]
evidence:
  required: provider-neutral-deep-module-review-receipt-and-read-only-attestation
rollback:
  strategy: discard-provider-recommendation-without-target-mutation
  notes: "A rejected or inconclusive review is discarded or superseded in the planning repo; no target source, dist, registry package, or historical evidence is reverted or rewritten."
atomizationImpact:
  ownerAtomOrMap: atm.product-proof.runtime-boundary-review
  mapUpdates: []
  extractionCandidates:
    - atom: atm.npm-runtime-boundary
      pattern: Policy Object
      source: packages/cli/src/atm.ts
      disposition: review-only
      inlineReason: "Do not extract or split until the deep-module receipt proves a stable interface and two concrete adapters."
acceptanceEvidence: '{"deep-module-review-proof":{"id":"deep-module-review-proof","claim":"No bundler or package-boundary mutation is promoted until an independent provider-neutral deep-module review proves interface depth, adapter evidence, packaging trade-offs, and read-only provenance.","authoritativeSources":["pinned-source-snapshot","runtime-topology-inventory","deep-module-review-receipt","read-only-attestation"],"derivationRule":"all closure-critical predicates pass and missing observations remain inconclusive","requiredRealness":"sealed-replay","verifier":{"mode":"separate-actor"},"negativeControls":[{"id":"file-length-only","expectedFailureReason":"file length is not module depth"},{"id":"pre-review-bundler-mutation","expectedFailureReason":"bundler mutation precedes independent review"}],"missingDataVerdict":"inconclusive","closureCritical":true}}'
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0069 Perform provider-neutral deep-module review of the runtime boundary before bundler changes

## Intent

The 0049/0062 runtime work exposed a real design choice, not merely a file-size
problem: the source uses a lazy command boundary, the frozen onefile and npm
runtime must remain complete, and variable dynamic imports have already produced
an installable-but-broken candidate. Before anyone changes the bundler, enables
code splitting, or creates additional npm packages, an independent external
reviewer must determine whether the boundary is a deep module with a useful
stable interface or only a shallow wrapper that would add maintenance cost.

This is review-only. The reviewer reads the pinned source, frozen runner, build
script, candidate/public validators, and the 0062 measurements; it may write only
the planning-repository review receipt and dispatch brief. It must not modify the
target repository, build artifacts, npm registry, Git history, task ledger, or
runtime evidence.

## Acceptance

- [ ] **ACC-1 — Bounded topology:** The receipt inventories the runtime entry,
      command loader, bundler transformation, frozen onefile, root-drop/package
      boundary, validator paths, and all observed callers. Every dependency is
      classified as in-process, local-substitutable, remote-owned, or true-external.
- [ ] **ACC-2 — Deep-module test:** The reviewer applies the deletion test and
      records which caller complexity, policy duplication, and test seams would
      disappear behind each proposed interface. File length alone cannot justify
      a refactor; the report must recommend deepen, keep, or defer.
- [ ] **ACC-3 — Two-adapter discipline:** Any replaceable seam is accepted only
      when two concrete adapters and their interface-level tests are identified.
      If the current code has fewer than two real adapters, the receipt must say
      so and recommend the smallest non-layered repair instead of inventing an
      abstraction.
- [ ] **ACC-4 — Packaging alternatives:** The review compares static import,
      literal lazy import in one bundle, code splitting/chunks, and package
      splitting against completeness, unpacked bytes, entry count, dependency
      bytes, startup time, and rollback risk. It must not promote an option on
      size alone or assume missing chunks are acceptable.
- [ ] **ACC-5 — Method/profile fidelity:** The receipt conforms to
      `atm.deepModuleReviewReport.v1`, names the
      `deep-module-refactor` profile, preserves its trigger evidence, required
      observations, counterexamples, completion evidence, and rollback, and
      keeps the provider replaceable.
- [ ] **ACC-6 — Independent and read-only:** The report identifies the external
      actor/provider, source and evidence digests, exact replay commands, and
      confirms zero target-repo mutations, npm publish, Git push, task close, or
      evidence-ledger writes. Provider output is advisory until Captain review.
- [ ] **ACC-7 — Negative controls:** The receipt rejects (a) a file-length-only
      refactor, (b) a one-off helper extraction presented as a deep module, and
      (c) bundler/code-splitting changes made before this review. Missing source
      or measurement evidence is `inconclusive`, never a pass.
- [ ] **ACC-8 — Planning evidence:** The planning-card import dry-run and review
      contract tests pass; the dispatch brief is directly transferable to Claude,
      Gemini, or another external reviewer without granting write authority.


<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T08:57:16.976Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0069-perform-provider-neutral-deep-module-review-of-the-runtime-boundary-before-bundler-changes.task.md","contentDigest":"sha256:dd3ba595b19eb3dc199188fa0d2b2081d479fa256b8d81d9ab85b2b7ddf9f0dc"} -->
