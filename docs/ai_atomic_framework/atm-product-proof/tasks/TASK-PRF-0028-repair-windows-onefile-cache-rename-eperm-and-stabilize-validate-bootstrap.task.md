---
task_id: TASK-PRF-0028
title: Repair Windows onefile cache rename EPERM and stabilize validate-bootstrap
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
  - scripts/build-onefile-release.ts
  - scripts/validate-bootstrap.ts
  - tests
  - .github/workflows/release-npm.yml
deliverables:
  - scripts/build-onefile-release.ts
  - scripts/validate-bootstrap.ts
  - .github/workflows/release-npm.yml
validators:
  - node --strip-types scripts/validate-bootstrap.ts --mode validate
  - npm run validate:full -- --filter validate-bootstrap,validate-git-hooks-enforcement-full --serial --validator-timeout-ms 300000
  - npm run validate:full -- --parallel --validator-timeout-ms 300000
methodProfiles:
  - expand-contract
tddMode: required
testContributions:
  - caseId: test_validate_bootstrap_windows_cache_promotion_28
    targetGroupId: validate-bootstrap
    semanticKey: windows_cache_promotion_retry
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5, ACC-6]
    coversImpactEdges: [onefile-cache-public-seam]
    expectedRedPredicate: validate-bootstrap fails with transient rename EPERM
    responsibility: task-required
requiredTestCaseIds:
  - test_validate_bootstrap_windows_cache_promotion_28
phaseTestCaseIds: []
advisoryTestCaseIds: []
atomizationImpact:
  ownerAtomOrMap: atm.release.onefile-cache-promotion
  mapUpdates: []
  extractionCandidates:
    - atom: atm.release.onefile-cache-promotion
      pattern: Retryable filesystem promotion boundary
      source: scripts/build-onefile-release.ts
      disposition: inline
      inlineReason: Keep the bounded retry at the existing cache promotion seam; extracting it would scatter lock/cleanup invariants without reducing adopter surface.
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-11T22:26:16.645Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-11T22:26:16.645Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-11T22-26-16-645Z-close-e77e5fab2d9a"
lastTransitionAt: "2026-09-11T22:26:16.645Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a3de11e68ac13de97c1032985b3497748d8fad81"
---

# TASK-PRF-0028 Repair Windows onefile cache rename EPERM and stabilize validate-bootstrap

## Intent

Repeated Windows runs fail while atomically promoting the onefile extraction
cache: `renameSync(stagingRoot, cacheRoot)` raises `EPERM` even after the target
directory is removed. The failure is an OS/file-handle race (often antivirus or
indexer interference), not a semantic bootstrap error. Generalize the cache
promotion boundary with bounded retry/backoff for transient Windows rename
errors, preserve cleanup and lock ownership, and widen the workflow timeout to
the measured cost of the full governance validator. Do not hide persistent
errors or weaken validation.

## Acceptance

- [ ] Cache promotion retries only transient `EPERM`/`EACCES`/`EBUSY` failures,
      with a bounded attempt count and clear final diagnostic.
- [ ] Staging and lock cleanup remain guaranteed on success and failure.
- [ ] `validate-bootstrap` passes repeatedly on Windows; the focused governance
      validator passes with a 300000 ms budget.
- [ ] Full validation completes 112/112 without timeout or bootstrap failure.
- [ ] Release workflow timeout reflects observed worst-case validator duration.
- [ ] Evidence records the failing baseline, green candidate, and rollback
      path (revert commit).

## Evidence and rollback

Required evidence is command-backed and must include at least one red baseline
showing the rename race, one green focused run, and one green full run. Rollback
is a revert of the delivery commit; no cache data or runtime evidence is kept in
Git history.


<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T21:17:21.154Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0028-repair-windows-onefile-cache-rename-eperm-and-stabilize-validate-bootstrap.task.md","contentDigest":"sha256:558ec27be66d1f8f9a13cd4fb6a6e0a84d0fd566808d5692a622c5037cdd8387"} -->
