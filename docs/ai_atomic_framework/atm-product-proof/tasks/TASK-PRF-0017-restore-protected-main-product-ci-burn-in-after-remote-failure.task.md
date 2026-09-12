---
task_id: TASK-PRF-0017
title: Restore protected-main Product CI burn-in after remote failure
status: done
owner: atm-release
priority: P0
depends_on:
  - TASK-PRF-0014
  - TASK-PRF-0016
causalGraph:
  causalDependencies: [TASK-PRF-0014, TASK-PRF-0016]
  startConditions:
    - The remote owner has authority to push the repaired source and dispatch release-candidate runs.
    - Local Product CI contract, lint and clean-install validators are green on the exact candidate commit.
    - No branch-protection or workflow permission change is required for the proof run.
  softRelations: [TASK-PRF-0008]
  changedPublicSeams: [protected-main-product-ci-burn-in]
  causalImpactEdges:
    - remote-product-ci-is-green
    - release-candidate-observations-are-reproducible
    - protected-main-gate-is-current
  parallelFrontierInputs:
    - repaired-ci-candidate-commit
    - release-candidate-dispatch-capability
    - live-branch-protection-policy
  validatorReferences:
    - test_prf_remote_burn_in_gate_4d8b2c11
    - test_prf_ci_failure_classification_6e19af30
  phaseOwner: phase-3-protected-main-ci-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .github/workflows/ci.yml
  - tests/cli/ci-product-lane-contract.test.ts
  - scripts/validate-ci-product-lane.ts
  - docs/reports/atm-product-ci-burn-in.md
deliverables:
  - .github/workflows/ci.yml
  - tests/cli/ci-product-lane-contract.test.ts
  - scripts/validate-ci-product-lane.ts
  - docs/reports/atm-product-ci-burn-in.md
validators:
  - node --strip-types tests/cli/ci-product-lane-contract.test.ts
  - npm run typecheck
  - npm run lint
  - node --strip-types scripts/validate-ci-product-lane.ts
  - node --strip-types scripts/validate-ci-product-lane.ts --remote
testContributions:
  - caseId: test_prf_remote_burn_in_gate_4d8b2c11
    semanticKey: remote_burn_in_requires_current_green_release_candidates
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [remote-product-ci-is-green, release-candidate-observations-are-reproducible]
    expectedRedPredicate: The remote validator accepts fewer than ten current Product CI runs or fewer than two release-candidate runs.
    responsibility: task-required
  - caseId: test_prf_ci_failure_classification_6e19af30
    semanticKey: ci_failure_is_not_reclassified_as_green
    coversAcceptance: [ACC-3]
    coversImpactEdges: [protected-main-gate-is-current]
    expectedRedPredicate: A failed Product CI job or stale remote observation is reported as non-green and cannot close the proof.
    responsibility: task-required
requiredTestCaseIds:
  - test_prf_remote_burn_in_gate_4d8b2c11
  - test_prf_ci_failure_classification_6e19af30
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: preserve-red-observation-and-revert-only-task-scoped-ci-change
  notes: Never rewrite historical red runs. If a candidate fails, retain the run URL and first failing job, repair the source, and rerun a new candidate sequence.
atomizationImpact:
  ownerAtomOrMap: atm.product-ci-proof-map
  mapUpdates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-12T15:01:59.445Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-12T15:01:59.445Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-12T15-01-59-445Z-close-81a7c513f8a7"
lastTransitionAt: "2026-09-12T15:01:59.445Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "29635d942a261775395a69d564f4a976f15cece0"
---

# TASK-PRF-0017 Restore protected-main Product CI burn-in after remote failure

## Intent

Restore an actually current protected-main Product CI proof after the remote
branch was observed red. The task is not complete when local checks pass: it
requires ten newest `ci` runs on `main`, at least two `release-candidate`
dispatches, and a successful `Product CI` job in every run. Historical green
tables must remain explicitly historical.

## Acceptance

- [ ] ACC-1: The exact candidate commit passes the local Product CI contract, typecheck, lint and clean-install validators.
- [ ] ACC-2: The live GitHub API shows ten newest `ci` runs on `main`, including at least two release-candidate runs, and `Product CI` is successful in all ten.
- [ ] ACC-3: The report records the exact run IDs, SHAs, classifications, first failures if any, branch-protection context, and validator command output; no historical table is presented as current proof.

## Out of scope

- Publishing npm packages, changing branch protection, or pushing without explicit owner authorization.
- Replacing a failed remote run with local green output.
- Rewriting or deleting historical red evidence.

## Stop rule

If owner push/dispatch authority is absent, or the live API remains red, leave
the task open with an inconclusive/red report and the exact recovery command.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T00:27:27.680Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0017-restore-protected-main-product-ci-burn-in-after-remote-failure.task.md","contentDigest":"sha256:3302101b7e3180be9d08bc45ebe709faa6d1294f4952592211b6867174c6100f"} -->