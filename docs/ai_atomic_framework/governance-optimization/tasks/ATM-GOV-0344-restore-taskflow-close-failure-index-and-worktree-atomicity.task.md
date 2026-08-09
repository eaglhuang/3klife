---
task_id: ATM-GOV-0344
title: restore taskflow close failure index and worktree atomicity
status: done
owner: atm-governance-captain
priority: P0
depends_on: [ATM-GOV-0325, ATM-GOV-0326]
causalGraph:
  causalDependencies: [ATM-GOV-0325, ATM-GOV-0326]
  startConditions: [A reproducible close failure has a recorded pre-state and post-state for HEAD, index, worktree, and task ledger.]
  softRelations: [ATM-GOV-0327, TASK-AAO-0149, TASK-MAO-0050]
  changedPublicSeams: [atm.taskflowCloseTransaction.v1, atm.gitIndexLeaseParkPlan.v1]
  causalImpactEdges: [close-failure, staged-index-isolation, protected-governance-rollback, deferred-foreign-state]
  parallelFrontierInputs: [canonical-worktree, broker-ticket, byte-identified-index-baseline]
  validatorReferences: [validate-taskflow-close-atomicity, git-index-close-isolation, git-index-override-lease-consumption]
  phaseOwner: wave-2-lifecycle-atomicity
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/tasks/close-window-lock.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/taskflow/__tests__/taskflow-close-atomicity.test.ts
  - tests/cli/git-index-close-isolation.test.ts
  - tests/cli/git-index-override-lease-consumption.test.ts
deliverables:
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/taskflow/__tests__/taskflow-close-atomicity.test.ts
  - tests/cli/git-index-close-isolation.test.ts
validators:
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-close-atomicity.test.ts
  - node --strip-types tests/cli/git-index-close-isolation.test.ts
  - node --strip-types tests/cli/git-index-override-lease-consumption.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_close_failure_preserves_index_and_worktree_0344
    semanticKey: close_failure_preserves_index_and_worktree
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [close-failure, staged-index-isolation, protected-governance-rollback, deferred-foreign-state]
    expectedRedPredicate: a forced close failure changes a pre-existing staged blob, unstaged file, or protected governance artifact
    responsibility: task-required
    contractEdge: taskflow-close-transaction
requiredTestCaseIds: [test_close_failure_preserves_index_and_worktree_0344]
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert transaction boundary and regression tests together; no recovery path may mutate foreign staged data without a byte-identity receipt.
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-close-transaction
  mapUpdates: [atomic_workbench/maps/atm-evidence-map.json]
  extractionCandidates:
    - atom: atm.close-transaction-rollback-boundary
      pattern: Transaction Script
      source: packages/cli/src/commands/taskflow/close-orchestration.ts
      disposition: inline
      inlineReason: Existing cohesive rollback boundary; retain one public transaction seam while adding exact state snapshots.
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-09T22:47:50.177Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-09T22:47:50.177Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-09T22-47-50-177Z-close-e11bf16c6b04"
lastTransitionAt: "2026-08-09T22:47:50.177Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c1d16162e56e4375b17413340aae14f0c811739f"
---

# ATM-GOV-0344 — Restore taskflow close failure index and worktree atomicity

## Goal

Repair the general close-write transaction contract: if any close phase fails,
the command must either leave the canonical worktree, staged index, protected
governance files, task ledger, and HEAD byte-identical to their pre-state, or
return a durable receipt proving a completed forward recovery. It must never
report a failed close after mutating unrelated staged entries or deleting an
unrelated protected artifact.

The repair must derive behavior from a captured transaction snapshot; it must
not encode card IDs, actors, fixed paths, or incident-specific staged blobs.

## Scope and operating boundary

- Tier 2 surface: the shared canonical Git index. Use existing broker and
  index-lease interfaces; do not create an alternate index, branch, worktree,
  or raw-Git recovery workflow.
- Preserve foreign staged entries through explicit path, mode, and blob restore
  identities. A mismatch fails closed before any new close payload is staged.
- Do not change rescue worktrees, ErrorCode behavior, task lifecycle semantics
  outside this transaction, or ATM-GOV-0327 payloads.

## Acceptance

- [ ] ACC-1: An injected failure before delivery commit leaves HEAD, the full
  index (including foreign staged entries), unrelated worktree files, and the
  target ledger byte-identical to the captured pre-state.
- [ ] ACC-2: An injected failure after temporary foreign-index parking either
  restores every parked entry by exact mode/blob/path identity or emits a
  durable recoverable transaction record and blocks later close writes.
- [ ] ACC-3: A successful close restores deferred foreign state exactly and
  commits only the active task's declared bundle.
- [ ] ACC-4: Tests use generated fixture paths and multiple foreign entries;
  they contain no local paths, card IDs, or fixed entry count.
- [ ] ACC-5: Pre-close and write-readiness return one executable,
  broker-aware recovery route when isolation cannot be established.

## Execution and evidence

Start with a red assertion for
`test_close_failure_preserves_index_and_worktree_0344`. Record red/green
evidence against the same case and source/candidate lineage. Run each focused
validator through `node atm.mjs evidence run`, then typecheck and CLI
validation. Before close, retain full before/after state digests and the
transaction receipt in the evidence bundle.

## Stop conditions

Stop and record an incident/backlog item if exact restoration cannot be proved,
if a fix needs a new serialization rule, or if it touches a foreign task
payload. Do not use broad restore/reset/clean or bypass a failed test through
timeout, retry, or caller assertions.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T22:08:53.070Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0344-restore-taskflow-close-failure-index-and-worktree-atomicity.task.md","contentDigest":"sha256:d4635c735528b0eb5e7f5b6006f6be84d2bbe4c3c5c8c45332c4b72c0788098d"} -->
