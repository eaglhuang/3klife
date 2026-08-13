---
task_id: ATM-GOV-0366
title: Disclose the owner-lane source in lane capability refusals
status: done
owner: unassigned
priority: P2
depends_on: []
causalGraph:
  startConditions:
    - A refusal compares the executing lane against the owner lane but names neither the owner lane nor the record it read.
  softRelations: [ATM-GOV-0365]
  causalImpactEdges: [undisclosed-owner-lane-forces-probing]
  parallelFrontierInputs: [lane-capability-authority]
  validatorReferences: [borrowed-actor-authority-hard-gate, validate-cli]
  phaseOwner: governance-substrate
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/lane-session/capability-authority.ts
  - tests/cli/borrowed-actor-authority-hard-gate.test.ts
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-021.json
deliverables:
  - packages/cli/src/commands/lane-session/capability-authority.ts
  - tests/cli/borrowed-actor-authority-hard-gate.test.ts
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-021.json
validators:
  - node --strip-types tests/cli/borrowed-actor-authority-hard-gate.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0366_refusal_discloses_the_owner_lane_source
    targetGroupId: null
    semanticKey: a_lane_refusal_names_the_record_that_decides_it
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [undisclosed-owner-lane-forces-probing]
    contributionResourceKey: lane-capability-refusal-disclosure
    responsibility: task-required
    contractEdge: atm.laneCapabilityDecision.v1
    resourceKey: lane-capability-refusal-disclosure
    expectedRedPredicate: the refusal reports neither the ledger record it read nor a next command, so the blocked actor can only guess among its own lane sessions
requiredTestCaseIds:
  - test_atm_gov_0366_refusal_discloses_the_owner_lane_source
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Reverting restores a refusal that withholds the record deciding it. The gate itself is unchanged by this card, so reverting cannot re-open an authority hole.
atomizationImpact:
  ownerAtomOrMap: atm.lane-capability-authority
  mapUpdates: []
  extractionCandidates: []
errorCodes:
  - ATM_LANE_BORROWED_ACTOR_BLOCKED
outOfScope:
  - packages/cli/src/commands/lane-session/redaction.ts
  - packages/cli/src/commands/lane-session/proxy-receipt.ts
  - packages/cli/src/commands/tasks/task-ledger-readers.ts
nonGoals:
  - Weakening the lane capability gate. The refusal stays a refusal; only what it discloses changes.
  - Disclosing a lane capability value in any refusal payload. Location is disclosed; the capability is not.
  - Publishing the frozen runner. This card lands source and joins the pending publication batch.
createdByCommand: atm plan card create
completed_at: "2026-08-13T17:01:45.384Z"
completed_by_agent: "claude-008-gov-0366"
closedAt: "2026-08-13T17:01:45.384Z"
closedByActor: "claude-008-gov-0366"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-13T17-01-45-384Z-close-6a7929e9383d"
lastTransitionAt: "2026-08-13T17:01:45.384Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "03c135e886447138ec88f4ae4ad0d45725055c8e"
---

# ATM-GOV-0366 Disclose the owner-lane source in lane capability refusals

## Problem

`ATM_LANE_BORROWED_ACTOR_BLOCKED` decides by comparing two identities and then
reports one of them. The executing lane is named by implication; the owner lane
it was compared against is not, and neither is the record that holds it.

That record is not secret. `claim.laneSession` in
`.atm/history/tasks/<task>.json` carries the owner lane id and an `exportHint`
that is literally the command needed to proceed. An actor that has minted more
than one lane session therefore has the answer on disk and no pointer to it, so
the only route left is to try lanes one at a time — probing a governed gate,
which is the behaviour the framework otherwise forbids.

Recorded as `ATM-BUG-2026-08-13-021`, observed on ATM-GOV-0365, where the same
refusal was paid twice before the ledger was read.

## Design

The refusal payload gains a disclosure block describing *where the decision came
from* rather than *what the capability is*:

- the ledger path the owner claim was read from,
- whether that claim records a lane export hint,
- and a `nextCommand` that reads that record.

The lane value itself is never disclosed, by either branch. `--actor` is
attribution, not authority: a borrower can present any actor string, so
"disclose the hint when the caller claims to be the owner" would hand the
capability to precisely the attempt the gate exists to stop. Location is safe
because the ledger is already readable by anyone holding the repository; the
capability is not, and stays redacted. `allowed` stays `false` in every case.

The description is built from the claim `evaluateLaneCapability` already read and
is carried on the decision itself, so a consumer reports the source that the
decision consulted instead of opening the ledger a second time to describe it.
That is `INV-ATM-012` applied at its smallest scale: one authority read, one
decision, every consumer downstream of it.

## Acceptance

- ACC-1 A blocked attempt reports the ledger record that decided it and a
  `nextCommand` that reads that record, with no task, actor or path special
  cases in the control flow.
- ACC-2 No refusal payload contains the owner lane id or the claim's export
  hint, whatever actor string the attempt presents. It reports only that the
  hint exists and where to read it.
- ACC-3 The gate is unchanged: every previously blocked attempt is still
  blocked, and the existing hard-gate regressions still pass.
- ACC-4 The disclosure is derived from the same claim read that produces the
  decision and is carried on the decision, so no consumer re-reads the ledger
  to describe a decision it did not make (INV-ATM-012).
