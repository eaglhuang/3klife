---
task_id: ATM-GOV-0417
title: Runner-sync closeback must leave no dirty generated residue
status: abandoned
owner: atm-governance
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
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/broker/steward-queues.ts
  - packages/cli/src/commands/taskflow/**
  - scripts/runner-sync-incremental-build.ts
  - scripts/runner-sync-receipt-continuation.ts
  - tests/cli/runner-sync-closeback-residue.test.ts
deliverables:
  - packages/cli/src/commands/broker/steward-queues.ts
  - packages/cli/src/commands/taskflow/**
  - scripts/runner-sync-incremental-build.ts
  - scripts/runner-sync-receipt-continuation.ts
  - tests/cli/runner-sync-closeback-residue.test.ts
validators:
  - node --strip-types tests/cli/runner-sync-closeback-residue.test.ts
  - npm run typecheck
  - npm run validate:cli:surface
  - npm run validate:runner-reproducibility
errorCodes: []
testContributions:
  - caseId: test_runner_sync_closeback_leaves_no_generated_residue_0417
    targetGroupId: null
    semanticKey: runner_sync_closeback_no_generated_residue
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [runner-sync-closeback-boundary]
    responsibility: task-required
    contractEdge: runner-sync-closeback-contract
requiredTestCaseIds:
  - test_runner_sync_closeback_leaves_no_generated_residue_0417
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
methodProfiles:
  - expand-contract
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync-closeback-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runner-sync-closeback
      pattern: Transactional closeback boundary
      source: packages/cli/src/commands/taskflow
      disposition: follow-up-card
      inlineReason: null
createdByCommand: atm plan card create
abandonment:
  recordedAt: 2026-09-06T13:50:00Z
  reason: Current target-repository source already satisfies the runner-sync closeback ownership contract; focused regressions pass, so no source repair is justified.
  targetTaskState: abandoned
  deliveryCommit: null
---

# ATM-GOV-0417 Runner-sync closeback must leave no dirty generated residue

## Intent

Ensure a successful taskflow close that consumed a runner-sync receipt also
delivers the exact generated receipt and release surfaces, or emits a governed,
owner-bound recovery route. The repair must not broaden ownership to foreign
WIP and must preserve the existing runner-sync steward attribution.

## Acceptance

- [ ] A close with an accepted runner-sync receipt leaves no runner receipt or
      release-surface dirty residue.
- [ ] A missing, stale, or out-of-scope receipt fails closed with one executable
      recovery command and does not silently widen the task ticket.
- [ ] Foreign staged/dirty files remain byte-identical and outside the delivery.
- [ ] Red and green evidence bind the same case id, public seam, and candidate
      lineage.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-06T13:36:00.615Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0417-runner-sync-closeback-must-leave-no-dirty-generated-residue.task.md","contentDigest":"sha256:ffbb264a3fbcd237a22c6f67201a2f33ef123b34bf0f1e939f9fbc78835a6863"} -->
