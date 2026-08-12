---
task_id: ATM-GOV-0348
title: Scope commit work admission to the ticket bundle, not the whole staged index
status: done
owner: atm-captain
priority: P0
depends_on: []
causalGraph:
  startConditions: [governed-commit-runs-while-foreign-paths-sit-in-the-shared-index]
  softRelations: [ATM-GOV-0328, TASK-ERR-0010, TASK-ERR-0014]
  changedPublicSeams: [commit-work-admission-file-selection]
  causalImpactEdges:
    - foreign-staged-path-to-commit-admission-denial
    - admission-denial-to-coerced-foreign-index-mutation
  parallelFrontierInputs: [canonical-git-index, work-admission-ticket, sealed-commit-bundle]
  validatorReferences: [test_commit_admission_ticket_scoped_selection_0348]
  phaseOwner: correction-wave-0-unblock
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: C:\Users\User\AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/cli/src/commands/git-governance.ts
  - tests/cli/commit-admission-ticket-scoped-selection.test.ts
deliverables:
  - packages/cli/src/commands/git-governance.ts
  - tests/cli/commit-admission-ticket-scoped-selection.test.ts
validators:
  - node --strip-types tests/cli/commit-admission-ticket-scoped-selection.test.ts
  - node --strip-types tests/cli/commit-attribution-concurrency-gates.test.ts
  - npm run typecheck
  - npm run validate:module-boundaries
testContributions:
  - caseId: test_commit_admission_ticket_scoped_selection_0348
    semanticKey: commit_admission_reads_the_ticket_bundle_not_the_whole_staged_index
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges:
      - foreign-staged-path-to-commit-admission-denial
      - admission-denial-to-coerced-foreign-index-mutation
    expectedRedPredicate: a governed commit whose own bundle is fully in scope is denied with ATM_WRITE_TICKET_SCOPE_VIOLATION solely because an unrelated task's path is staged
    responsibility: task-required
    contractEdge: commit-work-admission-file-selection
  - caseId: test_foreign_staged_bytes_survive_scoped_admission_0348
    semanticKey: foreign_staged_bytes_are_unchanged_across_an_unflagged_admitted_commit
    coversAcceptance: [ACC-4]
    coversImpactEdges: [admission-denial-to-coerced-foreign-index-mutation]
    expectedRedPredicate: committing in-scope work requires a deferral flag that unstages another lane's paths, so foreign staged bytes cannot survive untouched
    responsibility: task-required
    contractEdge: commit-work-admission-file-selection
requiredTestCaseIds:
  - test_commit_admission_ticket_scoped_selection_0348
  - test_foreign_staged_bytes_survive_scoped_admission_0348
phaseTestCaseIds: [typecheck, validate:module-boundaries]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [admission-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the selection change and its regression together. Never resolve an admission denial by unstaging, resetting, or stashing another lane's paths.
atomizationImpact:
  ownerAtomOrMap: atm.work-admission-ticket
  mapUpdates: []
  extractionCandidates:
    - atom: atm.commit-admission-file-selection
      pattern: Policy Object
      source: packages/cli/src/commands/git-governance.ts
      disposition: extract
      inlineReason: null
errorCodes:
  - code: ATM_WRITE_TICKET_SCOPE_VIOLATION
    disposition: reuse
    category: git-governance
    trigger: a requested mutation path lies outside the ticket file grant
    retryable: false
outOfScope:
  - packages/core/src/broker/work-admission-ticket.ts
  - packages/cli/src/commands/git-governance/implementation/**
nonGoals:
  - Weakening the admission gate itself. The gate is correct; only what the commit path feeds it is wrong.
  - Changing what a commit actually writes. The sealed candidate index already decides that.
completed_at: "2026-08-12T01:24:34.490Z"
completed_by_agent: "claude-008-gov-0348"
closedAt: "2026-08-12T01:24:34.490Z"
closedByActor: "claude-008-gov-0348"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-12T01-24-34-490Z-close-c457d25ba1bc"
lastTransitionAt: "2026-08-12T01:24:34.490Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "23df1652ba7a9edd986c3dd532a2326677f6f65e"
---

# ATM-GOV-0348 Scope commit work admission to the ticket bundle, not the whole staged index

## Problem

A governed commit resolves its work-admission file list in
`selectTicketValidatedCommitFiles`:

```ts
if (!deferForeignStaged || !ticket) return stagedFiles;
```

Ticket-scoped filtering therefore happens **only** when `--defer-foreign-staged`
is passed. On the default path the entire `readStagedFiles(cwd)` output — every
foreign path already sitting in the shared index — is handed to
`evaluateTaskWorkAdmissionGate`, which correctly denies with
`ATM_WRITE_TICKET_SCOPE_VIOLATION` because those paths are outside the grant.

The gate is not the defect. `packages/core/src/broker/work-admission-ticket.ts`
does exactly the right thing with the list it is given. The defect is that the
commit path gives it the whole index.

Two consequences follow, and the second is the serious one.

1. A commit whose own bundle is entirely in scope is denied for a reason that
   has nothing to do with that commit.
2. The only route past the denial is `--defer-foreign-staged`, which snapshots
   and unstages the other lane's paths. So a gate whose purpose is to prevent
   one lane from touching another lane's index bytes ends up making that touch
   the *only* way to proceed. An operator following the error is pushed toward
   the exact mutation the surrounding governance forbids.

This also defeats the sealed candidate index. That mechanism exists precisely to
isolate a task-scoped commit from unrelated staged work, but admission runs
first, so it never gets the chance.

## Observed

2026-08-11, during TASK-ERR-0014. Delivery bundle was six in-scope source files;
the ticket grant covered all of them. Three unrelated paths from the already
closed ATM-GOV-0346 were staged in the shared index:

```
.atm/history/evidence/ATM-GOV-0346.closure-packet.json
.atm/history/task-events/ATM-GOV-0346/2026-08-11T10-18-45-078Z-repair-closure-eb53b1dfed70.json
.atm/history/tasks/ATM-GOV-0346.json
```

`node atm.mjs git commit --task TASK-ERR-0014 --dry-run` denied with
`ATM_WRITE_TICKET_SCOPE_VIOLATION`, naming exactly those three paths. Adding
`--auto-stage` did not help, because selection still returned the whole index.
Only `--defer-foreign-staged` allowed the commit
(`8edd23226e2441928099d49bfc622f3f91b8798b`). Their staged blob ids were
recorded before and compared after, and were identical — but that outcome
depended on the operator choosing to verify, not on the gate.

Same family as `ATM-BUG-2026-08-09-008` (close readiness and override issuer
disagreeing about staged-index ownership) and as ATM-GOV-0328.

## Acceptance

- ACC-1 A governed commit whose bundle lies wholly inside the ticket grant is
  admitted regardless of unrelated paths present in the shared index, with no
  flag required.
- ACC-2 Admission still denies when a path the commit would actually write is
  outside the grant. Scoping the selection must not become a way to smuggle an
  out-of-scope path past the gate.
- ACC-3 `--defer-foreign-staged` continues to control whether foreign staged
  entries are snapshotted and unstaged. It no longer controls whether admission
  is ticket-scoped, and it is no longer required to commit in-scope work.
- ACC-4 Foreign staged bytes are unchanged, byte for byte, across an admitted
  commit taken without any deferral flag.

## Notes for the implementer

The narrow change is to make ticket-scope filtering unconditional and leave
`deferForeignStaged` governing only the unstaging behaviour. Verify against
ACC-2 before assuming that is sufficient: the sealed bundle, not the admission
list, is what bounds the commit contents, so confirm that a genuinely
out-of-scope bundle entry is still rejected on the scoped path.
