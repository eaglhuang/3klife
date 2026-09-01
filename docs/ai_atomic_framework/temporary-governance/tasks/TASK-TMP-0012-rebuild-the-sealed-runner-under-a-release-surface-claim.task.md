---
task_id: TASK-TMP-0012
title: Rebuild the sealed runner under a release-surface claim
status: done
owner: codex-cleanup-captain
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams:
    - sealed-runner-publication
  causalImpactEdges:
    - release-surface-claim-enables-runner-sync
  parallelFrontierInputs:
    - TASK-TMP-0011-closeout
  validatorReferences:
    - sealed-runner-build
  phaseOwner: codex-cleanup-captain
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/**
  - packages/cli/dist/**
deliverables:
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/release-manifest.json
validators:
  - ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
  - node atm.mjs --version
tddMode: reasoned-not-applicable
tddNotApplicableReason: This card rebuilds and seals generated runner artifacts without changing source behavior; the build and frozen-runner commands are the executable acceptance evidence.
tddExemptions:
  - kind: mechanical
    reason: Generated release surfaces only.
methodProfiles:
  - operational-recovery
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-01T15:17:08.579Z"
completed_by_agent: "codex-cleanup-captain"
closedAt: "2026-09-01T15:17:08.579Z"
closedByActor: "codex-cleanup-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-01T15-17-08-579Z-close-474a654183d7"
lastTransitionAt: "2026-09-01T15:17:08.579Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3876af4cc90d8cd9c8ac3f83e986bb42d069047a"
---

# TASK-TMP-0012 Rebuild the sealed runner under a release-surface claim

## Intent

TBD.

## Acceptance

- [ ] Deliverables and validators are filled before import or implementation.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-01T15:09:37.224Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0012-rebuild-the-sealed-runner-under-a-release-surface-claim.task.md","contentDigest":"sha256:b66b8f85b71102507dd4fbdf2c388adafd1378425596a136b96e7da10ec713b7"} -->
