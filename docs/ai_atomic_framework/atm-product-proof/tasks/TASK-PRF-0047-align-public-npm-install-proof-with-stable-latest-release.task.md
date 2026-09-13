---
task_id: TASK-PRF-0047
title: Align public npm install proof with stable latest release
status: done
owner: atm-release
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-public-npm-install.ts
  - tests/cli/product-proof-evidence-boundary.test.ts
  - .atm/history/evidence/TASK-PRF-0047.bundle-manifest.json
deliverables:
  - scripts/validate-public-npm-install.ts
  - tests/cli/product-proof-evidence-boundary.test.ts
validators:
  - node --strip-types tests/cli/product-proof-evidence-boundary.test.ts
  - node --strip-types scripts/validate-public-npm-install.ts --package @ai-atomic-framework/cli --version 0.1.0 --require-default-tag
  - node --strip-types scripts/check-encoding-touched.ts --files scripts/validate-public-npm-install.ts tests/cli/product-proof-evidence-boundary.test.ts
testContributions:
  - caseId: test_public_npm_install_proof_stable_latest_7c2d1a4e
    targetGroupId: null
    semanticKey: public_npm_install_proof_stable_latest
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [public-npm-proof-version-seam]
    expectedRedPredicate: proof rejects or clearly reports a mismatch between requested stable version and npm latest/default tag
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: public-npm-proof-contract
    resourceKey: null
requiredTestCaseIds:
  - test_public_npm_install_proof_stable_latest_7c2d1a4e
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.cli.public-npm-install-proof
  mapUpdates:
    - atomic_workbench/maps/atm-cli-command-router-map.json
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-13T09:33:52.752Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-13T09:33:52.752Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-13T09-33-52-752Z-close-8c1d1f41ddd1"
lastTransitionAt: "2026-09-13T09:33:52.752Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2fc7741be2eeb7665db5cc757ab6906eca2218cb"
---

# TASK-PRF-0047 Align public npm install proof with stable latest release

## Intent

The stable release `@ai-atomic-framework/cli@0.1.0` is now npm `latest`, but the
proof validator still defaults to the historical beta train. Align the canonical
proof path and its focused test so a successful result cannot conceal a
stable/latest mismatch, while preserving beta validation only when explicitly
requested.

## Acceptance

- [ ] The default proof path targets the current stable release/tag, or requires an explicit version input; it never reports `verified` with `defaultInstallMatchesRequested=false`.
- [ ] A clean public-registry install of `@ai-atomic-framework/cli@0.1.0` passes without workspace links and confirms npm `latest=0.1.0`.
- [ ] Historical beta validation remains available only through an explicit version/tag request.
- [ ] The focused test fails on a stable/latest mismatch and passes on the corrected contract.
- [ ] Evidence remains command-backed and external runtime evidence is not copied into Git history.

## Stop rule

If npm `latest` changes during implementation, do not hard-code a stale version;
use an explicit release input or manifest and stop before publishing. No npm
publish is authorized by this card.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T09:26:16.237Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0047-align-public-npm-install-proof-with-stable-latest-release.task.md","contentDigest":"sha256:894fbb899f77e21a42d494802e35a8d4b360325b2b6bd57294d484268f1cbec3"} -->
