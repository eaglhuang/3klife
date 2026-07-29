---
task_id: TASK-GIT-0025
title: G9.1 lock projection and ticket scope parity correction
status: planned
owner: atm-core
priority: P0
milestone: G9.1
depends_on:
  - TASK-GIT-0017
  - TASK-GIT-0018
causalGraph:
  causalDependencies:
    - "G9 inventory and framework-temp lock projection contract"
    - "G10 claim-issued work-admission ticket contract"
  startConditions:
    - "TASK-GIT-0017 and TASK-GIT-0018 are delivered"
  softRelations:
    - "unblocks TASK-GIT-0024 closeout without changing historical attestation semantics"
  changedPublicSeams:
    - "framework-temp lock disposition projection"
    - "work-admission ticket scope matcher"
  causalImpactEdges:
    - "lock projection -> pending worktree and active-work summary"
    - "ticket scope matcher -> commit, close, and protected push coverage"
  parallelFrontierInputs: []
  validatorReferences:
    - "tests/cli/framework-temp-lock-admission-parity.test.ts"
    - "tests/cli/work-admission-ticket-scope-glob-parity.test.ts"
  phaseOwner: atm.git-boundary-admission
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-admission"
  extractionCandidates:
    - "packages/cli/src/commands/next/playbook-projection/active-work-summary.ts"
  reason: "Extract reservation lifecycle parsing into one projection atom so the summary remains an adapter and the physical line budget is satisfied by decomposition, not waiver."
scopePaths:
  - "packages/core/src/broker/work-admission-ticket.ts"
  - "packages/core/src/broker/runner-build-output-inventory.ts"
  - "packages/cli/src/commands/framework-development/framework-temp-lock-projection.ts"
  - "packages/cli/src/commands/next/route-resolution/pending-worktree.ts"
  - "packages/cli/src/commands/next/playbook-projection/active-work-summary.ts"
  - "packages/cli/src/commands/next/playbook-projection/task-reservation-projection.ts"
  - "packages/cli/src/commands/tasks/claim-work-admission.ts"
  - "packages/cli/src/commands/tasks/import-orchestrator.ts"
  - "packages/cli/src/commands/tasks/task-import-work-admission.ts"
  - "packages/cli/src/commands/tasks/task-work-admission-import.ts"
  - "packages/cli/src/commands/git-governance/work-admission-check.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "tests/cli/framework-temp-lock-admission-parity.test.ts"
  - "tests/cli/work-admission-ticket-scope-glob-parity.test.ts"
  - "tests/cli/work-admission-ticket-deferred-index-parity.test.ts"
  - "tests/cli/work-admission-ticket-import-bundle-parity.test.ts"
deliverables:
  - "One framework-temp lock disposition projection consumed identically by claim admission and active-work reporting, including files[]-only locks, TTL state, linked task/lane identity, and sealed-inventory membership."
  - "One admission-origin model owned by WorkAdmissionTicketAuthority: a claim origin permits the claimed task scope, while a task-import origin permits only the imported ledger and its matching import transition."
  - "One scope matcher owned by WorkAdmissionTicketAuthority that accepts exact paths and task-card glob scope consistently for write, stage, commit, close, and push."
  - "A governed commit with --defer-foreign-staged computes its filtered task bundle once and validates that same bundle, never foreign index residue that the commit operation will preserve."
  - "A bounded recovery disposition for expired files[]-only framework-temp locks: stale recovery input is visible but cannot be adopted by an unrelated claim."
  - "One task-reservation projection module that owns reservation JSON parsing, freshness, lane extraction, and single-task inspection; active-work summary consumes its compact output rather than retaining that lifecycle policy."
  - "A task-import admission ticket constrained to exactly one imported ledger and its matching import transition, with no authority for source, close, or push work."
validators:
  - "node --strip-types tests/cli/framework-temp-lock-admission-parity.test.ts"
  - "node --strip-types tests/cli/work-admission-ticket-scope-glob-parity.test.ts"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/work-admission-ticket-import-bundle-parity.test.ts"
errorCodes:
  - "ATM_CLAIM_FOREIGN_UNSTAGED_WIP"
  - "ATM_WRITE_TICKET_SCOPE_VIOLATION"
  - "ATM_WRITE_TICKET_STALE"
createdByCommand: atm plan card create
---

# TASK-GIT-0025 G9.1 lock projection and ticket scope parity correction

## Intent

Correct the two contract-fidelity gaps exposed by the preserved G8 fixture:
an expired framework-temp lock that has `files[]` but no task direction lock is
classified inconsistently by claim admission and active-work reporting; and a
claim-issued ticket records task scope globs but its verifier compares only
literal strings. Both defects can falsely turn governed evidence into
unowned WIP or a scope violation.

## First-Principles and Deep-Module Design

The protected resource is an admitted path's **governance disposition**, not
the spelling of a lock field or a caller-local path list. Existing deep modules
remain the only authorities:

- `BuildOutputInventory` decides whether a generated path is a member of a
  sealed runner generation.
- the framework-temp lock projection decides the lifecycle/owner disposition
  of a claimed path, including `files[]`-only and expired records.
- `WorkAdmissionTicketAuthority` decides both the bounded admission origin and
  whether a normalized observed path is within the ticket's declared scope.

The two adapters for the lock projection are claim admission/pending-worktree
and active-work summary. The ticket adapters are task import, governed commit,
and later close/push coverage gates. A task-import ticket is not a second
authority: it is a constrained origin in the same authority, bound to one
imported ledger and its matching transition. Deleting either authority would
force adapters to reconstruct TTL, lock shape, import provenance, glob
semantics, and inventory membership independently; that is the deletion-test
proof that this card must deepen existing modules rather than add a registry or
allowlist.

### Admission-first extraction

`active-work-summary.ts` is one line over the physical claim budget. This card
does not seek a budget waiver. Extract the task-reservation reader as one deep
module with a small interface: list fresh reservations and inspect one task's
reservation. It hides JSON parsing, task-source metadata, lane extraction,
TTL calculation, and freshness classification. `active-work-summary` remains
the adapter that aggregates claims, locks, and the projection result.

## Non-Goals

- Do not reopen TASK-GIT-0017 or TASK-GIT-0018.
- Do not create snapshots, a parallel ticket authority, or a second residue
  registry.
- Do not mutate, stage, commit, discard, or adopt the preserved G8 Lock B and
  seven-residue fixture as ordinary task delivery.
- Do not add path-specific exceptions for TASK-GIT-0024, actors, dates, or
  release directories.

## Acceptance

- [ ] A framework-temp record with only `files[]` is normalized once and yields
  the same owner/disposition in pending-worktree and active-work summary.
- [ ] A live foreign lock blocks a conflicting claim; an expired lock without a
  terminal release is classified as a stale recovery input, not candidate-owned
  WIP and not a generic advisory path.
- [ ] A sealed inventory member follows G9 publication recovery; a non-member
  cannot be silently demoted merely because its path resembles a release file.
- [ ] Ticket checks accept exact paths and card scope globs with identical
  normalization across write, stage, commit, close, and push; genuine outside
  paths still fail closed.
- [ ] The same WorkAdmissionTicket authority has explicit `claim` and
  `task-import` origins. A task-import origin permits only its imported ledger
  plus matching import transition, and cannot authorize source writes, close,
  push, or a generic planned-task commit.
- [ ] `--defer-foreign-staged` filters foreign staged paths before work-admission
  validation using one computed bundle; foreign residue remains untouched and
  an in-scope bundle still fails closed for a genuine outside path.
- [ ] `active-work-summary.ts` is at or below the 600-line physical budget after
  the reservation projection is extracted; the new module owns the reservation
  parser and has focused coverage through the existing admission parity tests.
- [ ] The G8 fixture is inspected only through test fixtures/receipts and is
  never swept into this card's commit bundle.
- [ ] Focused tests, `npm run typecheck`, and `npm run validate:cli` pass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T23:18:31.021Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0025-g9-1-lock-projection-and-ticket-scope-parity-correction.task.md","contentDigest":"sha256:727697661189a44aa688a0651e4f2d5a0dd485de7ce571408b49e40afe003bae"} -->
