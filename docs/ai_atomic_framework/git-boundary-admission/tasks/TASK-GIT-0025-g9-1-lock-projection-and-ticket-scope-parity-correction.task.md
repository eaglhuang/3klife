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
scopePaths:
  - "packages/core/src/broker/work-admission-ticket.ts"
  - "packages/core/src/broker/runner-build-output-inventory.ts"
  - "packages/cli/src/commands/framework-development/framework-temp-lock-projection.ts"
  - "packages/cli/src/commands/next/route-resolution/pending-worktree.ts"
  - "packages/cli/src/commands/next/playbook-projection/active-work-summary.ts"
  - "packages/cli/src/commands/tasks/claim-work-admission.ts"
  - "packages/cli/src/commands/git-governance/work-admission-check.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "tests/cli/framework-temp-lock-admission-parity.test.ts"
  - "tests/cli/work-admission-ticket-scope-glob-parity.test.ts"
  - "tests/cli/work-admission-ticket-deferred-index-parity.test.ts"
deliverables:
  - "One framework-temp lock disposition projection consumed identically by claim admission and active-work reporting, including files[]-only locks, TTL state, linked task/lane identity, and sealed-inventory membership."
  - "One scope matcher owned by WorkAdmissionTicketAuthority that accepts exact paths and task-card glob scope consistently for write, stage, commit, close, and push."
  - "A governed commit with --defer-foreign-staged validates the ticket against its filtered task bundle, never against foreign index residue that the commit operation will preserve."
  - "A bounded recovery disposition for expired files[]-only framework-temp locks: stale recovery input is visible but cannot be adopted by an unrelated claim."
validators:
  - "node --strip-types tests/cli/framework-temp-lock-admission-parity.test.ts"
  - "node --strip-types tests/cli/work-admission-ticket-scope-glob-parity.test.ts"
  - "npm run typecheck"
  - "npm run validate:cli"
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
- `WorkAdmissionTicketAuthority` decides whether a normalized observed path is
  within the ticket's declared scope.

The two adapters for the lock projection are claim admission/pending-worktree
and active-work summary. The two adapters for the ticket matcher are governed
commit and the later close/push coverage gates. Deleting either authority would
force those adapters to reconstruct TTL, lock shape, glob semantics, and
inventory membership independently; that is the deletion-test proof that this
card must deepen existing modules rather than add a registry or allowlist.

## Non-Goals

- Do not reopen TASK-GIT-0017 or TASK-GIT-0018.
- Do not create snapshots, another ticket type, or a second residue registry.
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
- [ ] `--defer-foreign-staged` filters foreign staged paths before work-admission
  validation; foreign residue remains untouched and an in-scope bundle still
  fails closed for a genuine outside path.
- [ ] The G8 fixture is inspected only through test fixtures/receipts and is
  never swept into this card's commit bundle.
- [ ] Focused tests, `npm run typecheck`, and `npm run validate:cli` pass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T23:18:31.021Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0025-g9-1-lock-projection-and-ticket-scope-parity-correction.task.md","contentDigest":"sha256:727697661189a44aa688a0651e4f2d5a0dd485de7ce571408b49e40afe003bae"} -->
