---
task_id: ATM-GOV-0343
title: Preserve same-task retained WIP continuity across fresh lane reclaim
status: done
owner: atm-lane-authority
priority: P0
depends_on: []
causalGraph:
  softRelations:
    - TASK-LANE-0022
    - TASK-LANE-0023
    - ATM-GOV-0342
  changedPublicSeams:
    - claim dirty-WIP admission ownership predicate
  causalImpactEdges:
    - released-wip-to-same-task-fresh-lane-reclaim
    - retained-wip-to-cross-task-fail-closed
  parallelFrontierInputs:
    - runner-sync-publication
  validatorReferences:
    - test_same_task_retained_wip_reclaim_0343
  phaseOwner: wave-2-lifecycle-atomicity
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Wave 2 lifecycle and claim-admission correctness; this is a generic regression repair, not a new error-family or temporary residue action."
scopePaths:
  - packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
  - packages/cli/src/commands/next/__tests__/foreign-dirty-wip-admission.test.ts
  - tests/cli/claim-foreign-unstaged-wip.test.ts
deliverables:
  - packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
  - packages/cli/src/commands/next/__tests__/foreign-dirty-wip-admission.test.ts
validators:
  - node --strip-types packages/cli/src/commands/next/__tests__/foreign-dirty-wip-admission.test.ts
  - node --strip-types tests/cli/claim-foreign-unstaged-wip.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_same_task_retained_wip_reclaim_0343
    targetGroupId: null
    semanticKey: retained_wip_same_task_fresh_lane_reclaim
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [released-wip-to-same-task-fresh-lane-reclaim, retained-wip-to-cross-task-fail-closed]
    expectedRedPredicate: a fresh lane for the same task and actor is classified as foreign despite retained ownership
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: release-wip-ownership
    contractEdge: claim-dirty-wip-admission
    resourceKey: null
requiredTestCaseIds:
  - test_same_task_retained_wip_reclaim_0343
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert only the admission predicate and its tests; retained WIP facts remain durable and foreign/cross-task claims must remain fail-closed."
atomizationImpact:
  ownerAtomOrMap: atm.claim.foreign-dirty-wip-admission
  mapUpdates: []
  extractionCandidates:
    - atom: atm.claim.retained-wip-ownership-adapter
      pattern: Policy Object
      source: packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
      disposition: inline
      inlineReason: "The module is below extraction threshold; retain one narrow ownership predicate rather than duplicate lifecycle transition policy."
errorCodes:
  - code: ATM_CLAIM_FOREIGN_UNSTAGED_WIP
    disposition: reuse
    category: claim-admission
    trigger: candidate claim intersects dirty code not provably resumable by its own task and actor
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs tasks status --task <task-id> --json
    sourceOwner: packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
    registryOwnerTask: ATM-GOV-0169
    tests:
      - packages/cli/src/commands/next/__tests__/foreign-dirty-wip-admission.test.ts
createdByCommand: atm plan card create
completed_at: "2026-08-09T21:49:31.231Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-09T21:49:31.231Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-09T21-49-31-231Z-close-ff5a6fbd5441"
lastTransitionAt: "2026-08-09T21:49:31.231Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2d3c6f5f8e6069385d5a6588bb665b3d183a1f3c"
---

# ATM-GOV-0343 Preserve same-task retained WIP continuity across fresh lane reclaim

## Intent

Repair the general ownership rule exposed by Wave 2 dogfood: retained dirty WIP
is resumable only by a fresh claim for the same task and actor, irrespective of
the previous lane id. A retained WIP record is a continuity fact, not an active
mutation capability. Cross-task and cross-actor claims must remain blocked.

## Acceptance

- [ ] ACC-1: The required isolated case proves a released task with valid
      retained WIP can be reclaimed by the same task and actor from a fresh
      lane without manual adoption; it also proves cross-task, cross-actor,
      and active-claim paths remain rejected.
- [ ] ACC-2: A different task or actor remains blocked with
      `ATM_CLAIM_FOREIGN_UNSTAGED_WIP`, even if it shares paths or knows the
      old lane id.
- [ ] ACC-3: The admission decision consumes one explicit ownership predicate;
      it does not infer authority from actor id alone, old lane id alone, or a
      task-specific allowlist.

## Evidence lifecycle

Record a red-to-green evidence pair bound to
`test_same_task_retained_wip_reclaim_0343`, then command-backed focused,
typecheck, and CLI validation evidence before close.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T20:20:53.200Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0343-preserve-same-task-retained-wip-continuity-across-fresh-lane-reclaim.task.md","contentDigest":"sha256:6c3e440d975d6dc8ff42c6a01e1edf685c0ef069f8ac8e4a9ffbe460a66c757f"} -->
