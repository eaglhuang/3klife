---
task_id: TASK-ERR-0008
title: Unify taskflow close and stage-override index ownership snapshots
status: done
owner: atm-captain
priority: P0
depends_on: []
causalGraph:
  changedPublicSeams: [git-index-ownership-snapshot]
  causalImpactEdges: [taskflow-close-to-stage-override-recovery]
  parallelFrontierInputs: [hook-generated-git-head-receipt]
  validatorReferences: [test_git_index_override_snapshot_consistency_0008, validate:cli, typecheck]
  phaseOwner: ATM-GOV-0328
related_plan: error-governance/error-governance-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/git-governance/implementation/lease-command.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - tests/cli/git-index-override-lease-snapshot-consistency.test.ts
deliverables:
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/git-governance/implementation/lease-command.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - tests/cli/git-index-override-lease-snapshot-consistency.test.ts
validators:
  - node --strip-types tests/cli/git-index-override-lease-snapshot-consistency.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_git_index_override_snapshot_consistency_0008
    semanticKey: git_index_override_snapshot_consistency
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5, ACC-6]
    coversImpactEdges: [taskflow-close-to-stage-override-recovery]
    expectedRedPredicate: close and lease classify the same pinned index differently
    responsibility: task-required
    contractEdge: git-index-ownership-snapshot
requiredTestCaseIds:
  - test_git_index_override_snapshot_consistency_0008
phaseTestCaseIds:
  - validate:cli
  - typecheck
tddMode: required
tddNotApplicableReason: null
methodProfiles:
  - repair-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.git-index-ownership
  mapUpdates: []
  extractionCandidates:
    - atom: atm.git-index-ownership-snapshot
      pattern: Result Contract
      source: packages/cli/src/commands/git-index-ownership.ts
      disposition: inline
      inlineReason: Existing ownership module is the replaceable deep-module boundary; adding a second wrapper would fragment the contract.
errorCodes:
  - ATM_GIT_INDEX_OVERRIDE_LEASE_INDEX_DRIFT
  - ATM_INDEX_FOREIGN_ACTIVE_STAGED
createdByCommand: atm plan card create
completed_at: "2026-08-09T12:25:05.429Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-09T12:25:05.429Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-09T12-25-05-429Z-close-b6fbd69d4b14"
lastTransitionAt: "2026-08-09T12:25:05.429Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f2f264e12a7a4346f4bd51d5a2fcce2da367b336"
---

# TASK-ERR-0008 Unify taskflow close and stage-override index ownership snapshots

## Intent

Repair the index-lane admission contract exposed by ATM-GOV-0328. `taskflow close`
and `git lease stage-override` must evaluate the same immutable staged-index
ownership snapshot. A hook-generated `git-head` receipt must therefore have one
of two deterministic outcomes: it is foreign-active and the exact-path lease is
issued, or it is not foreign-active and `taskflow close` does not present it as a
blocker. No manual index mutation, broad staging, retry masking, or actor-specific
exception is permitted.

## Acceptance

- [ ] ACC-1: Extract or extend one provider-neutral index-ownership snapshot
  contract that binds the Git index tree/digest, staged paths, task ownership,
  and classification timestamp. Both close preflight and stage-override issuance
  consume that same contract; they must not independently rescan and disagree.
- [ ] ACC-2: A regression creates the same hook-generated `git-head` staged
  receipt shape seen in ATM-GOV-0328. If close marks the path foreign-active,
  the lease command receives and grants that exact path from the pinned snapshot.
- [ ] ACC-3: The complementary regression proves that an empty foreign-active
  set yields no `ATM_INDEX_FOREIGN_ACTIVE_STAGED` close blocker and no prescribed
  stage-override command. The result is deterministic across repeated reads.
- [ ] ACC-4: Preserve fail-closed behavior for true index drift: if the index
  changes after snapshot creation, return the existing drift code with a fresh
  recovery command; never grant a stale or wider lease.
- [ ] ACC-5: `ATM_GIT_INDEX_OVERRIDE_LEASE_INDEX_DRIFT` and
  `ATM_INDEX_FOREIGN_ACTIVE_STAGED` remain semantically distinct and their
  existing registry contracts remain valid. No new error code is introduced.
- [ ] ACC-6: `node --strip-types tests/cli/git-index-override-lease-snapshot-consistency.test.ts`,
  `npm run typecheck`, and `npm run validate:cli` pass as command-backed evidence.

## Engineering method

- Method profile: `repair-contract` (inspect the matching profile before implementation).
- First principles: a recovery command is part of the public contract; it must
  be executable against the state that emitted it.
- Deep-module boundary: callers receive one small immutable ownership snapshot
  result, not duplicated Git/index classification logic or ad hoc path lists.
- Shared-write tier: Git index is Tier 2. The broker/lease is allowed to serialize
  the exact snapshot, but must return execute-now, queue, or a coherent recovery
  result under INV-ATM-008.

## Test contribution

- caseId: `test_git_index_override_snapshot_consistency_0008`
- coversAcceptance: ACC-1, ACC-2, ACC-3, ACC-4
- expectedRedPredicate: close preflight reports a foreign-active path while the
  stage-override issuer reports an empty foreign-active set for the same pinned index.
- responsibility: task-required
- tddMode: required

## Evidence and rollback

- Evidence must include the pre-fix reproducible command pair from
  ATM-BUG-2026-08-09-008 and post-fix command-backed regression output.
- Rollback: revert the governed delivery commit. The old contradictory behavior
  is not an acceptable compatibility target; if rollback is needed, preserve the
  receipt and return the last coherent fail-closed recovery command.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T11:19:06.359Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"error-governance/tasks/TASK-ERR-0008-unify-taskflow-close-and-stage-override-index-ownership-snapshots.task.md","contentDigest":"sha256:2130bfee96207c969fa8bd90970714988d3be3474a783728ba39465577efc8d9"} -->
