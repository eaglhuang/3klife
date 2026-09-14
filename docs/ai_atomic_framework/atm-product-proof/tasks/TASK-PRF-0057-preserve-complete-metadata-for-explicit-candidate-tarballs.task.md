---
task_id: TASK-PRF-0057
title: Preserve complete metadata for explicit candidate tarballs
status: done
owner: release-evidence-steward
priority: P1
depends_on: []
causalGraph:
  causalDependencies: [TASK-PRF-0056]
  startConditions: []
  softRelations: [TASK-PRF-0053, TASK-PRF-0056]
  changedPublicSeams: [candidate_npm_install_proof]
  causalImpactEdges: [candidate_tarball_provenance, rerunnable_package_metrics]
  parallelFrontierInputs: [explicit-tarball, candidate-directory]
  validatorReferences: [test_prf_candidate_explicit_tarball_metadata, test_prf_candidate_explicit_tarball_fail_closed, test_prf_candidate_metadata_parity]
  phaseOwner: release
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-candidate-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/product-proof-evidence-boundary.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
  - docs/reports/atm-product-proof-checkpoints.md
deliverables:
  - scripts/validate-candidate-npm-install.ts
  - tests/cli/public-npm-install-contract.test.ts
  - tests/cli/product-proof-evidence-boundary.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
  - docs/reports/atm-product-proof-checkpoints.md
  - external explicit-tarball receipt with package metadata and deterministic archive inventory
validators:
  - npm run typecheck
  - npm run lint
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - node --strip-types tests/cli/product-proof-evidence-boundary.test.ts
  - node --strip-types scripts/validate-candidate-npm-install.ts --candidate-dir packages/cli --candidate-tarball <sealed-tarball> --record-blocked
testContributions:
  - caseId: test_prf_candidate_explicit_tarball_metadata
    targetGroupId: null
    semanticKey: candidate_explicit_tarball_metadata
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [candidate_tarball_provenance]
    expectedRedPredicate: "An explicit candidate tarball receipt reports version local, zero unpacked bytes, zero entries, or an empty file inventory despite a valid archive."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: candidate_npm_install_proof
    resourceKey: explicit-tarball-metadata
  - caseId: test_prf_candidate_explicit_tarball_fail_closed
    targetGroupId: null
    semanticKey: candidate_explicit_tarball_fail_closed
    coversAcceptance: [ACC-3]
    coversImpactEdges: [rerunnable_package_metrics]
    expectedRedPredicate: "A truncated, malformed, or package-metadata-incomplete explicit tarball is accepted or produces a misleading zero-valued receipt."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: candidate_npm_install_proof
    resourceKey: explicit-tarball-fail-closed
  - caseId: test_prf_candidate_metadata_parity
    targetGroupId: null
    semanticKey: candidate_metadata_parity
    coversAcceptance: [ACC-4]
    coversImpactEdges: [candidate_tarball_provenance]
    expectedRedPredicate: "The same packaged candidate produces materially different version, unpacked byte, entry count, or file-list metadata depending on candidate-directory versus explicit-tarball mode."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: candidate_npm_install_proof
    resourceKey: candidate-metadata-parity
requiredTestCaseIds:
  - test_prf_candidate_explicit_tarball_metadata
  - test_prf_candidate_explicit_tarball_fail_closed
  - test_prf_candidate_metadata_parity
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed-explicit-tarball-clean-install-metadata-parity
rollback:
  strategy: revert-commit-preserve-failed-receipts
  notes: "Revert only the validator, focused tests, and report additions; retain the original zero-valued explicit-tarball receipt outside Git for audit."
atomizationImpact:
  ownerAtomOrMap: atm.public-runtime-closure
  mapUpdates: []
  extractionCandidates:
    - atom: atm.candidate-registry-workflow-validator
      pattern: Policy Object
      source: scripts/validate-candidate-npm-install.ts
      disposition: follow-up-card
      inlineReason: "Keep archive metadata recovery cohesive with the candidate proof repair; extract only after a provider-neutral archive reader is shared by another validator."
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T03:17:58.152Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T03:17:58.152Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T03-17-58-152Z-close-5880edae13e7"
lastTransitionAt: "2026-09-14T03:17:58.152Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "def193edac2a4c24cfc28c5fa9151abb4c517ec9"
---

# TASK-PRF-0057 Preserve complete metadata for explicit candidate tarballs

## Intent

TASK-PRF-0056 closed the candidate validator's core workflow gap, but a direct
run with `--candidate-tarball` proved that the explicit archive path still
emits `version: local`, `unpackedBytes: 0`, `entryCount: 0`, and no file list.
That is a provenance failure even when installation and all required commands
pass. This card repairs the evidence contract without changing the runtime
boundary, bundle budget, public registry, or npm publication authorization.

## Acceptance

- [ ] ACC-1: For a valid `--candidate-tarball`, the receipt records package
      name/version, tarball byte size and SHA-256, unpacked byte total, entry
      count, and a deterministic archive file inventory with per-file sizes.
- [ ] ACC-2: Explicit-tarball metadata is derived from the supplied archive,
      not from the current candidate directory or a workspace link; the clean
      install still runs the complete seven-command matrix and preserves
      `candidateOnly: true` and `publicRegistry: false`.
- [ ] ACC-3: Truncated, malformed, or package-metadata-incomplete archives fail
      closed with an actionable error/blocked receipt and never silently emit
      zero-valued size or entry metadata.
- [ ] ACC-4: Packaging the same candidate and validating it once by directory
      and once by explicit tarball yields equivalent package version, unpacked
      bytes, entry count, and file inventory; focused tests, typecheck, lint,
      and a command-backed external receipt pass. No npm publish or push is
      authorized.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T03:07:31.158Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0057-preserve-complete-metadata-for-explicit-candidate-tarballs.task.md","contentDigest":"sha256:03f7ac3f1479b43842579ef82d186d087de41777b2d05705f0b58c277e927637"} -->
