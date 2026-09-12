---
task_id: TASK-PRF-0029
title: Deepen CLI runtime boundary and reduce adopter bundle
status: done
owner: atm-release
priority: P1
series: PRF
series_reason: The published npm artifact is a first-order product-proof surface and its size must be reduced without weakening the clean-install contract.
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - Published beta5 clean-install proof remains green.
    - Current npm runtime inventory and command surface are captured as the sealed baseline.
    - Deep-module review receipt passes before production implementation.
  softRelations: [TASK-PRF-0006, TASK-PRF-0018]
  changedPublicSeams: [cli-command-router, npm-runtime-boundary, adopter-artifact-manifest]
  causalImpactEdges:
    - core-command-behavior-preserved
    - optional-capabilities-are-replaceable
    - adopter-bytes-decrease-without-forbidden-artifacts
    - clean-install-remains-independent-of-workspace-links
  parallelFrontierInputs: [beta5-public-npm-digest, beta5-artifact-inventory, cli-surface-baseline]
  validatorReferences: [test_prf_runtime_boundary_equivalence_7e4a1c2b, test_prf_bundle_reduction_budget_3f9d2a81]
  phaseOwner: phase-4-adopter-bundle-minimisation
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/command-specs.ts
  - scripts/build-cli-npm-runtime.ts
  - scripts/build-package-dist.ts
  - scripts/validate-adopter-artifact-manifest.ts
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
  - docs/reports/atm-product-ci-burn-in.md
deliverables:
  - packages/cli/src/atm.ts
  - scripts/build-cli-npm-runtime.ts
  - scripts/build-package-dist.ts
  - scripts/validate-adopter-artifact-manifest.ts
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
validators:
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - node --strip-types tests/cli/adopter-artifact-budget.test.ts
  - node --strip-types scripts/validate-adopter-artifact-manifest.ts --mode validate
  - node --strip-types scripts/validate-npm-clean-install.ts
  - node --strip-types scripts/validate-cli.ts --mode surface
  - npm run validate:module-boundaries
  - npm run typecheck
  - npm run lint
testContributions:
  - caseId: test_prf_runtime_boundary_equivalence_7e4a1c2b
    targetGroupId: null
    semanticKey: runtime_boundary_equivalence
    coversAcceptance: [ACC-1, ACC-2, ACC-4, ACC-6]
    coversImpactEdges: [core-command-behavior-preserved, optional-capabilities-are-replaceable, clean-install-remains-independent-of-workspace-links]
    expectedRedPredicate: A command, library export, or clean-install smoke path changes behavior after the runtime boundary is split.
    contributionResourceKey: cli-runtime-equivalence
    responsibility: task-required
    dependencyEdge: runtime-boundary-to-cli-surface
    contractEdge: cli-command-router
    resourceKey: clean-install-environment
  - caseId: test_prf_bundle_reduction_budget_3f9d2a81
    targetGroupId: null
    semanticKey: bundle_reduction_budget
    coversAcceptance: [ACC-3, ACC-5, ACC-6]
    coversImpactEdges: [adopter-bytes-decrease-without-forbidden-artifacts]
    expectedRedPredicate: The candidate does not improve the sealed baseline on unpacked bytes or ships a forbidden artifact class.
    contributionResourceKey: npm-runtime-budget
    responsibility: task-required
    dependencyEdge: runtime-closure-to-artifact-budget
    contractEdge: adopter-artifact-manifest
    resourceKey: beta5-baseline-inventory
requiredTestCaseIds:
  - test_prf_runtime_boundary_equivalence_7e4a1c2b
  - test_prf_bundle_reduction_budget_3f9d2a81
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - deep-module-refactor
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Restore the beta5 runtime boundary and generated manifest; retain baseline and failed-candidate evidence. Never relax the clean-install or forbidden-artifact gates to make a split pass.
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  atomCid: cid:atom.cli-command-router-map
  mapUpdates: [atomic_workbench/maps/atm-cli-command-router-map.json]
  newScriptsAllowed: false
  extractionCandidates:
    - atom: atm.cli.runtime-capability-boundary
      pattern: Provider-neutral deep module
      source: packages/cli/src/atm.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-12T15:49:57.808Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-12T15:49:57.808Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-12T15-49-57-808Z-close-94e8bc9a6501"
lastTransitionAt: "2026-09-12T15:49:57.808Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "19d893ffdb17a63b31a02b861585356308f1e5bd"
---

# TASK-PRF-0029 Deepen CLI runtime boundary and reduce adopter bundle

## Intent

The beta5 package is clean-installable and contains no forbidden artifact
classes, but its 3,357,365-byte unpacked payload is 92% one eagerly bundled
`runtime.mjs`. The command router currently eager-imports roughly 70 command
modules. This card turns that measured product cost into a bounded
deep-module/expand-contract change.

The implementation must first preserve the public `atm` command surface and
library entrypoint, then move optional integrations/templates behind a
replaceable capability boundary only where two concrete adapters exist. A
smaller number is not sufficient if command behavior, clean-install
independence, or evidence provenance regresses.

## Acceptance

- [ ] ACC-1: A provider-neutral runtime capability interface and deep-module review receipt exist before implementation; the deletion test shows that removing the boundary would redistribute policy across callers.
- [ ] ACC-2: The core `atm` bin, library export, and declared command surface remain behaviorally equivalent in an isolated clean install with no workspace links.
- [ ] ACC-3: The candidate reduces unpacked bytes and/or entry count against the beta5 baseline by a measured amount recorded in the manifest; no reduction is accepted if it weakens required behavior.
- [ ] ACC-4: At least two concrete adapters (bundled core and optional capability provider) are exercised through the public interface; tests do not assert private internals.
- [ ] ACC-5: The artifact manifest still rejects tests, CI fixtures, evidence ledgers, duplicate development source, and unresolved vendor imports.
- [ ] ACC-6: Typecheck, lint, module-boundary, CLI-surface, clean-install, and focused artifact validators pass, with rollback evidence retained.

## Out of scope

- Removing supported commands solely to hit a byte target.
- Replacing the public npm package with a workspace link or a source checkout.
- Publishing a follow-up version before an isolated registry install and CI
  proof pass.

## Stop rule

Stop and keep the beta5 boundary if the second adapter cannot be made real,
if clean-install equivalence fails, or if the measured reduction is smaller
than the added operational complexity. Record the counterexample and retain
the baseline rather than weakening a validator.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-12T15:19:51.179Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0029-deepen-cli-runtime-boundary-and-reduce-adopter-bundle.task.md","contentDigest":"sha256:4fb3d23368264ec898252ef9648c0764a873809ae8cf6e8425512cb4bc16a293"} -->