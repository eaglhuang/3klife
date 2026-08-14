---
task_id: ATM-GOV-0390
title: Record publication verification evidence on the pending backlog items
status: done
owner: unassigned
priority: P2
depends_on: []
causalGraph:
  startConditions:
    - Eight items claim their fix awaits frozen publication, but none records how that claim could be checked.
  causalImpactEdges: [unverifiable-publication-claim-forces-recurring-archaeology]
  parallelFrontierInputs: [round-trip-backlog]
  validatorReferences: [validate-backlog-census]
  phaseOwner: governance-substrate
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-013.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-014.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-015.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-019.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-020.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-025.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-14-002.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-14-003.json
deliverables:
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-013.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-014.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-015.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-019.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-020.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-025.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-14-002.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-14-003.json
validators:
  - node --strip-types scripts/validate-backlog-census.ts --mode validate
testContributions:
  - caseId: test_atm_gov_0390_publication_claims_carry_their_own_check
    targetGroupId: null
    semanticKey: a_publication_claim_records_how_to_verify_it
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [unverifiable-publication-claim-forces-recurring-archaeology]
    contributionResourceKey: governance-round-trip-dispositions
    responsibility: task-required
    contractEdge: atm.governanceBacklogItem.v1
    resourceKey: governance-round-trip-dispositions
    expectedRedPredicate: an item says its fix awaits publication without naming the commit, so every reader must re-derive the answer from file history
requiredTestCaseIds:
  - test_atm_gov_0390_publication_claims_carry_their_own_check
tddMode: not-applicable
tddNotApplicableReason: The deliverable is evidence text appended to eight records with no executable behaviour of its own; the census validator is its contract check, and the claim it records is verified by git ancestry commands quoted inside the text.
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Reverting removes verification evidence from records whose status is unchanged. Nothing else depends on it.
atomizationImpact:
  ownerAtomOrMap: atm.governance-lifecycle
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope:
  - packages
  - scripts
  - release
nonGoals:
  - Changing any item's status. Whether a published fix now behaves correctly is its owner's call, not this card's.
  - Editing any item outside the eight that carry a pending-publication claim.
createdByCommand: atm plan card create
completed_at: "2026-08-14T14:32:09.541Z"
completed_by_agent: "claude-008-gov-0366"
closedAt: "2026-08-14T14:32:09.541Z"
closedByActor: "claude-008-gov-0366"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T14-32-09-541Z-close-b645a2988f22"
lastTransitionAt: "2026-08-14T14:32:09.541Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "701569dc89ddf5ede9909ac1351b57bb834aa606"
---

# ATM-GOV-0390 Record publication verification evidence on the pending backlog items

## Problem

Eight items are recorded `Fixed in source; frozen publication pending`. Three of
them cite the commit that fixed them; five cite nothing, so checking whether the
claim is still true means re-deriving each fix's location from file history. That
archaeology was done once during this session and would otherwise have to be
repeated by every later reader.

It is now checkable against a single authority. The published frozen runner
declares its own input: `release/atm-onefile/release-manifest.json` at
publication commit `8a3047111` records
`sealedSourceCommit b3996c755027679acd995c4163fe96365f20468b`,
`buildDecision fullRebuild` and `payloadReuse false` — so the packed runner was
rebuilt from that commit rather than reusing an earlier payload. A fix is in the
frozen runner exactly when its commit is an ancestor of that sealed source
commit.

Every one of the eight passes that test. This card records the check, not the
conclusion: whether a published fix behaves correctly is a separate question
belonging to each item's owner.

## Design

Each item gains one evidence sentence naming the commit, the ancestry check
against the sealed source commit, and any corroborating symbol found inside the
published `packages/cli/dist` tree. Where the commit was inferred from the
subject file's last change rather than cited by the item itself, the text says
so, because an inference and a citation are not the same evidence and a later
reader must be able to tell them apart.

`ATM-BUG-2026-08-14-003` is recorded differently on purpose: its fix lives in
`scripts/sealed-runner-publication.ts`, which runs from source and is not
carried by the frozen runner at all, so "publication pending" was never the
right description of its state.

No `status` field is touched.

## Acceptance

- ACC-1 Each of the eight items records the commit its fix landed in and the
  ancestry check against the sealed source commit the published runner declares.
- ACC-2 Items whose commit was inferred rather than cited say so explicitly, and
  ATM-BUG-2026-08-14-003 records that its fix is not runner-carried.
- ACC-3 No item's `status` changes, and the backlog census stays green with
  `unclassified` zero.
