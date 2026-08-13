---
task_id: ATM-GOV-0365
title: Land subcommand help dispatch and the round-trip backlog dispositions
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - A defect that was fixed, verified live and covered by a focused test is still recorded Open in the committed backlog.
  softRelations: [ATM-GOV-0364]
  causalImpactEdges: [verified-fix-recorded-open-invites-re-report]
  parallelFrontierInputs: [round-trip-backlog]
  validatorReferences: [validate-backlog-census, governance-round-trip-cost]
  phaseOwner: governance-substrate
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-007.json
deliverables:
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-007.json
validators:
  - node --strip-types scripts/validate-backlog-census.ts --mode validate
  - node --strip-types tests/cli/governance-round-trip-cost.test.ts
testContributions:
  - caseId: test_atm_gov_0365_resolved_dispositions_are_committed
    targetGroupId: null
    semanticKey: a_verified_fix_is_recorded_as_resolved_in_the_committed_backlog
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [verified-fix-recorded-open-invites-re-report]
    contributionResourceKey: governance-round-trip-dispositions
    responsibility: task-required
    contractEdge: atm.governanceBacklogItem.v1
    resourceKey: governance-round-trip-dispositions
    expectedRedPredicate: a defect that was fixed and verified is still recorded Open in the committed backlog, so the next reader re-reports it
requiredTestCaseIds:
  - test_atm_gov_0365_resolved_dispositions_are_committed
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Reverting restores an Open disposition for a defect that is fixed, which is worse than the original state. Only revert together with the fix itself.
atomizationImpact:
  ownerAtomOrMap: atm.governance-lifecycle
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope:
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/command-specs/tasks.spec.ts
  - packages/cli/src/commands/tasks/legacy/implementation.ts
  - packages/cli/src/commands/shared/command-spec-output.ts
  - tests/cli/governance-round-trip-cost.test.ts
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-008.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-011.json
nonGoals:
  - Re-opening the two findings that verification withdrew.
  - Carrying any file another lane currently claims. This card is deliberately one file wide.
createdByCommand: atm plan card create
completed_at: "2026-08-13T16:00:23.206Z"
completed_by_agent: "claude-008-gov-0365"
closedAt: "2026-08-13T16:00:23.206Z"
closedByActor: "claude-008-gov-0365"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-13T16-00-23-206Z-close-998f08b10038"
lastTransitionAt: "2026-08-13T16:00:23.206Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "642d7382b004bf6c0e9e09c70ceac052c877be68"
---

# ATM-GOV-0365 Land the scope-amendment disposition

## Problem

ATM-BUG-2026-08-13-007 — a scope amendment never reaching the governed delivery
bundle — was fixed in `b5bf02d16`, verified live after the frozen runner was
republished from `88230861e`, and is covered by
`test_atm_gov_0364_scope_amendment_reaches_the_delivery_bundle`. Its committed
disposition is still `Open`.

A neighbouring commit closed the sibling dispositions 008 and 011 and left 007
behind. That is the worst of the three states: the defect is gone, the guard is
in place, and the record still invites the next reader to reproduce it.

This card is one file wide on purpose. The rest of the round-trip work is
claimed by another lane, and widening this card to reach it would produce a
true broker conflict rather than a delivery.

## Acceptance

- ACC-1 ATM-BUG-2026-08-13-007 is `Resolved` in the committed backlog, naming
  the commit that fixed it and the focused test that guards it.
- ACC-2 The backlog census stays green with `unclassified` zero, and the
  regression test for the withdrawn findings still passes, so closing this
  disposition does not disturb the two that were withdrawn.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-13T15:34:49.770Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0365-land-subcommand-help-dispatch-and-the-round-trip-backlog-dispositions.task.md","contentDigest":"sha256:ffc259910b832cc75b74875df12b5a7fc51cfe0a6c11f9e76564c0ac5cf92c91"} -->
