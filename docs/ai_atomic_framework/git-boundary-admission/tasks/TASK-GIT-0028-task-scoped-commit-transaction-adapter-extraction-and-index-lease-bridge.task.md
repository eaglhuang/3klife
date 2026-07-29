---
task_id: TASK-GIT-0028
title: Task-scoped commit transaction adapter extraction and index lease bridge
status: done
owner: unassigned
priority: P0
milestone: G7.2
depends_on:
  - TASK-GIT-0015
  - TASK-GIT-0027
  - TASK-RFT-0101
causalGraph:
  causalDependencies:
    - "G7 broker-owned staging index arbitration"
    - "G7.1 exact stage-override lease authority source contract"
  startConditions:
    - "The exact index-lease authority is validated, but the large CLI wrapper cannot consume a caller-provided task bundle without duplicating transaction policy."
  softRelations:
    - "G7.1 and G7.2 may be implemented in one same-owner coalesced lane; G7.2 must land before either production caller consumes G7.1."
    - "RFT-0101 first rehabilitates the preserved oversized transaction facade; G7.2 consumes that bounded interface rather than extending recovery WIP."
    - "Unblocks G16 historical closeout without reopening G9 runner-publication work."
  changedPublicSeams:
    - "TaskScopedCommitTransaction adapter interface"
    - "GitIndexLeaseAuthority transaction adapter"
  causalImpactEdges:
  - "validated exact-entry lease plus caller-provided task bundle -> isolated task commit -> byte-identical foreign index restoration"
  parallelFrontierInputs: []
  validatorReferences:
    - "tests/cli/git-commit-task-scoped-staging.test.ts"
    - "tests/cli/git-index-override-lease-consumption.test.ts"
  phaseOwner: atm.git-boundary-admission
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/git-governance/task-scoped-commit-transaction.ts"
  - "packages/cli/src/commands/git-governance/implementation.ts"
  - "packages/cli/src/commands/git-governance/commit-bundle-filter.ts"
  - "packages/cli/src/commands/git-index-ownership.ts"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "tests/cli/git-index-override-lease-consumption.test.ts"
deliverables:
  - "One TaskScopedCommitTransaction deep module that hides temporary-index commit execution, exact foreign-entry park/restore, and outcome receipt construction behind a small interface."
  - "Two adapters only: ordinary task-scoped governed commit and taskflow close-bundle assembly; both consume GitIndexLeaseAuthority rather than re-parsing lease JSON or running ad hoc Git index operations."
  - "A thin git-governance implementation adapter with no duplicated lease, blob, mode, restore, or incident policy."
  - "Failure-safe rollback that restores every authorized foreign index entry before returning a commit failure; durable receipt and explicit error if restoration itself fails."
validators:
  - "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - "node --strip-types tests/cli/git-index-override-lease-consumption.test.ts"
  - "npm run typecheck"
  - "npm run validate:cli"
testContributions:
  - caseId: "test_int_git_index_lease_transaction"
    responsibility: "task-required"
    contributionResourceKey: "git-index-lease-transaction"
    coversAcceptance:
      - "acceptance-1"
      - "acceptance-2"
      - "acceptance-3"
    coversImpactEdges: ["validated-lease-to-restored-index"]
  - caseId: "test_task_git_commit_transaction_adapter"
    responsibility: "task-required"
    contributionResourceKey: "task-scoped-commit-adapter"
    coversAcceptance:
      - "acceptance-4"
      - "acceptance-5"
    coversImpactEdges: ["validated lease -> isolated task commit -> byte-identical foreign index restoration"]
requiredTestCaseIds:
  - "test_int_git_index_lease_transaction"
  - "test_task_git_commit_transaction_adapter"
phaseTestCaseIds: []
advisoryTestCaseIds: []
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-admission"
  extractionCandidates:
    - "packages/cli/src/commands/git-governance/implementation.ts"
  reason: "Move transaction orchestration behind one deep module; retain CLI parsing as a thin adapter."
errorCodes:
  - "ATM_INDEX_FOREIGN_ACTIVE_STAGED"
createdByCommand: atm plan card create
completed_at: "2026-07-29T17:56:38.074Z"
completed_by_agent: "codex-git-series-captain"
closedAt: "2026-07-29T17:56:38.074Z"
closedByActor: "codex-git-series-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-29T17-56-38-074Z-close-7507cc0f4cd2"
lastTransitionAt: "2026-07-29T17:56:38.074Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "48c6111b8f8f9605fbc26c17d164ded6691a5c2f"
---

# TASK-GIT-0028 Task-scoped commit transaction adapter extraction and index lease bridge

## Intent

Extract the task-scoped commit transaction from the oversized CLI implementation
into one deep module before wiring G7.1's exact stage-override capability into
production commit and closeout flows. The protected resource remains the exact
index entry. The transaction adapter owns orchestration; `GitIndexLeaseAuthority`
remains the only owner of lease parsing, identity fencing, expiry, one-time use,
and path/blob/mode equality.

`TASK-RFT-0101` is a hard predecessor: it converts the existing non-delivery
preservation WIP into the bounded transaction contract this card consumes.
Do not treat any preservation commit as G7.2 evidence.

## First-Principles and Deep-Module Design

The required effect is small: commit one current-task bundle without losing
someone else's staged entries. The hidden complexity is large: temporary index
construction, hook environment, branch queue, durable receipts, failure
rollback, and two callers. Put that complexity behind
`TaskScopedCommitTransaction.execute(request)`. Callers provide an already
validated task bundle plus a `GitIndexLeaseAuthority` decision; they receive a
commit outcome or a fail-closed diagnostic. They never manipulate the live
index directly. G9.1 may later improve how callers calculate that bundle, but
it is not a prerequisite for this transaction boundary.

Deletion test: deleting this module would force both `git commit` and
`taskflow close` to duplicate index parking, restoration and receipt logic.
Dependencies are in-process Git commands and local-substitutable lease storage;
there is no remote or editor-specific policy. Do not encode task ids, actors,
dates or local incident paths in production control flow.

## Acceptance

- [ ] Normal governed commit and close-bundle callers use the same transaction
  adapter and the same G7.1 authorization decision.
- [ ] A valid explicit lease parks only its exact foreign entries; successful
  and failed commits both restore path/blob/mode identically before returning.
- [ ] Missing, expired, used, owner-mismatched, partial or drifted leases fail
  before index mutation. Restore failure creates durable receipt evidence and
  a specific diagnostic.
- [ ] `implementation.ts` remains a CLI parser/adapter: it neither parses nor
  consumes lease storage, parks/restores index entries, nor recomputes the
  filtered bundle. The transaction policy has one public interface and two
  real adapters.
- [ ] Focused tests, typecheck and CLI validation pass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-29T00:06:38.450Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0028-task-scoped-commit-transaction-adapter-extraction-and-index-lease-bridge.task.md","contentDigest":"sha256:cf3e8634757a6f4cac02bf19e79928aba466bcfe4848976ebb409197ce6d5ff9"} -->
