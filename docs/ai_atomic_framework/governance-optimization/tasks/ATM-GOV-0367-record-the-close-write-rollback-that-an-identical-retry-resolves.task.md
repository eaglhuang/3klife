---
task_id: ATM-GOV-0367
title: Record the close-write rollback that an identical retry resolves
status: done
owner: unassigned
priority: P2
depends_on: []
causalGraph:
  startConditions:
    - A governed close rolls back and the identical command then succeeds, and the backlog does not say so.
  softRelations: [ATM-GOV-0365, ATM-GOV-0366]
  causalImpactEdges: [unrecorded-retry-succeeds-teaches-retrying-gates]
  parallelFrontierInputs: [round-trip-backlog]
  validatorReferences: [validate-backlog-census]
  phaseOwner: governance-substrate
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-024.json
deliverables:
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-024.json
validators:
  - node --strip-types scripts/validate-backlog-census.ts --mode validate
testContributions:
  - caseId: test_atm_gov_0367_retry_succeeding_close_is_recorded
    targetGroupId: null
    semanticKey: a_gate_that_a_bare_retry_passes_is_recorded_as_a_defect
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [unrecorded-retry-succeeds-teaches-retrying-gates]
    contributionResourceKey: governance-round-trip-dispositions
    responsibility: task-required
    contractEdge: atm.governanceBacklogItem.v1
    resourceKey: governance-round-trip-dispositions
    expectedRedPredicate: a governed gate that a bare retry passes is unrecorded, so operators learn to retry gates instead of reading them
requiredTestCaseIds:
  - test_atm_gov_0367_retry_succeeding_close_is_recorded
tddMode: not-applicable
tddNotApplicableReason: The deliverable is a single backlog record with no executable behaviour of its own; the census validator is its contract check, and the defect it records has no reproduction that does not require a live two-lane repository.
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Reverting deletes the record of a defect observed twice. Only revert if the observation is shown to be wrong.
atomizationImpact:
  ownerAtomOrMap: atm.governance-lifecycle
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope:
  - packages/cli/src/commands/taskflow
  - .atm/history/tasks
nonGoals:
  - Diagnosing the rollback. This card records a reproduction, it does not claim a mechanism.
  - Weakening or retrying any gate in production code.
createdByCommand: atm plan card create
completed_at: "2026-08-13T17:59:40.096Z"
completed_by_agent: "claude-008-gov-0366"
closedAt: "2026-08-13T17:59:40.096Z"
closedByActor: "claude-008-gov-0366"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-13T17-59-40-096Z-close-e6d4dcc9bbb9"
lastTransitionAt: "2026-08-13T17:59:40.096Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0cf86181401f7e0c621a7ddc7c683f826f323a9c"
---

# ATM-GOV-0367 Record the close-write rollback that an identical retry resolves

## Problem

Two governed closes in one session — ATM-GOV-0365 and ATM-GOV-0366 — rolled back
on their first `--write` attempt and succeeded on a byte-identical retry with no
state change in between. In both cases the ledger was correctly restored, so the
rollback did its job; what is missing is the record.

A gate that a bare retry passes teaches operators to retry gates. That is the
most expensive habit this framework can accidentally teach, because it is
indistinguishable, from the operator's side, from a gate that means nothing.

This card records the reproduction. It deliberately does not diagnose it: two
observations with captured payloads are worth more to whoever fixes it than a
guess made while the payloads are still warm.

## Acceptance

- ACC-1 `ATM-BUG-2026-08-13-024` records both occurrences with their task ids,
  error codes and the fact that the retry carried no change, and states plainly
  that no mechanism is claimed.
- ACC-2 The backlog census stays green with `unclassified` zero.
