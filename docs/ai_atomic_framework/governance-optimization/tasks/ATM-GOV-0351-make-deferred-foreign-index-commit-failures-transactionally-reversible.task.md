---
task_id: ATM-GOV-0351
title: make deferred foreign index commit failures transactionally reversible
status: done
owner: atm-governance-captain
priority: P0
depends_on: [ATM-GOV-0344, ATM-GOV-0348]
causalGraph:
  causalDependencies: [ATM-GOV-0344, ATM-GOV-0348]
  startConditions: [A reproducible governed commit failure has left a changed shared index after defer-foreign-staged resolution.]
  softRelations: [ATM-GOV-0349, ATM-GOV-0350, TASK-ERR-0014]
  changedPublicSeams: [atm.gitDeferredIndexTransaction.v1]
  causalImpactEdges: [deferred-foreign-state, failed-commit-index-rollback, protected-governance-rollback, runner-recovery-claim-bootstrap, emergency-lease-atomicity]
  parallelFrontierInputs: [canonical-worktree, sealed-candidate-index, broker-ticket, exact-index-entry-baseline]
  validatorReferences: [git-index-deferred-transaction-atomicity, validate-cli]
  phaseOwner: wave-3-validator-and-lifecycle-recovery
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - packages/cli/src/commands/git-governance/implementation/commit-execution.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/git-governance/task-scoped-commit-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.test.ts
  - packages/cli/src/commands/git-governance/task-scoped-commit-transaction.test.ts
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/next/runner-recovery-claim-authorization.ts
  - packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
  - packages/cli/src/commands/emergency/gate.ts
  - packages/cli/src/commands/emergency/leases.ts
  - packages/cli/src/commands/git-governance/implementation/commit-command.ts
  - packages/cli/src/commands/git-governance/implementation/broker-hook-bypass-preflight.ts
  - packages/cli/src/commands/git-governance/implementation/broker-hook-bypass-preflight.test.ts
  - packages/core/src/broker/cross-task-mutation-guard.ts
  - packages/core/src/broker/__tests__/cross-task-mutation-candidate-index.test.ts
  - packages/cli/src/commands/command-specs/next.spec.ts
  - tests/cli-fixtures/help-snapshots/next.json
  - packages/cli/src/commands/next/__tests__/runner-recovery-claim-lease.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/task-scoped-commit-transaction.ts
  - packages/cli/src/commands/git-governance/task-scoped-commit-transaction.test.ts
  - packages/cli/src/commands/next/__tests__/runner-recovery-claim-lease.test.ts
  - tests/cli-fixtures/help-snapshots/next.json
  - packages/core/src/broker/__tests__/cross-task-mutation-candidate-index.test.ts
  - packages/cli/src/commands/git-governance/implementation/broker-hook-bypass-preflight.test.ts
validators:
  - node --strip-types packages/cli/src/commands/git-governance/task-scoped-commit-transaction.test.ts
  - node --strip-types packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.test.ts
  - npm run typecheck
  - node --strip-types packages/cli/src/commands/next/__tests__/runner-recovery-claim-lease.test.ts
  - node --strip-types packages/cli/src/commands/git-governance/implementation/broker-hook-bypass-preflight.test.ts
testContributions:
  - caseId: test_deferred_index_failure_restores_exact_prestate_0351
    targetGroupId: null
    semanticKey: deferred_index_failure_restores_exact_prestate
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-5]
    coversImpactEdges: [deferred-foreign-state, failed-commit-index-rollback, protected-governance-rollback]
    expectedRedPredicate: a post-mutation resolver or commit failure leaves any pre-existing index entry changed, deleted, added, or reordered
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.gitDeferredIndexTransaction.v1
    resourceKey: git-index
  - caseId: test_deferred_index_success_preserves_foreign_entries_0351
    targetGroupId: null
    semanticKey: deferred_index_success_preserves_foreign_entries
    coversAcceptance: [ACC-4]
    coversImpactEdges: [deferred-foreign-state]
    expectedRedPredicate: a successful task-scoped commit leaks, removes, or changes a foreign staged mode/blob/path entry
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.gitDeferredIndexTransaction.v1
    resourceKey: git-index
  - caseId: test_runner_recovery_claim_consumes_lease_after_admission_0351
    targetGroupId: null
    semanticKey: runner_recovery_claim_consumes_lease_after_admission
    coversAcceptance: [ACC-2, ACC-3, ACC-5, ACC-6]
    coversImpactEdges: [runner-recovery-claim-bootstrap, emergency-lease-atomicity]
    expectedRedPredicate: a broker or readiness rejection consumes a runner-recovery emergency lease before a claim lifecycle write begins
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.gitDeferredIndexTransaction.v1
    resourceKey: emergency-lease
  - caseId: test_runner_recovery_reclaims_unowned_task_scoped_wip_0351
    targetGroupId: null
    semanticKey: runner_recovery_reclaims_unowned_task_scoped_wip
    coversAcceptance: [ACC-3, ACC-6, ACC-7]
    coversImpactEdges: [runner-recovery-claim-bootstrap, emergency-lease-atomicity]
    expectedRedPredicate: valid recovery authorization cannot reclaim wholly task-scoped unowned WIP, or it admits a foreign-owned dirty path
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.gitDeferredIndexTransaction.v1
    resourceKey: claim-dirty-wip-admission
  - caseId: test_hook_bypass_preflight_uses_sealed_candidate_before_lease_0351
    targetGroupId: null
    semanticKey: hook_bypass_preflight_uses_sealed_candidate_before_lease
    coversAcceptance: [ACC-2, ACC-5, ACC-8]
    coversImpactEdges: [emergency-lease-atomicity]
    expectedRedPredicate: an unrelated shared-index entry blocks or consumes a hook-bypass lease before the task-scoped sealed candidate has passed broker admission
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.gitDeferredIndexTransaction.v1
    resourceKey: broker-candidate-admission
requiredTestCaseIds: [test_deferred_index_failure_restores_exact_prestate_0351, test_deferred_index_success_preserves_foreign_entries_0351, test_runner_recovery_claim_consumes_lease_after_admission_0351, test_runner_recovery_reclaims_unowned_task_scoped_wip_0351, test_hook_bypass_preflight_uses_sealed_candidate_before_lease_0351]
advisoryTestCaseIds: [legacy_cmd_validate_cli]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the transaction owner and its focused fixtures together; no raw index reset or manual .atm mutation is a recovery path.
atomizationImpact:
  ownerAtomOrMap: atm.git-deferred-index-transaction
  mapUpdates: [atomic_workbench/maps/atm-evidence-map.json]
  extractionCandidates:
    - atom: atm.git-deferred-index-transaction
      pattern: Transaction Script
      source: packages/cli/src/commands/git-governance/task-scoped-commit-transaction.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-12T08:51:07.228Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-12T08:51:07.228Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-12T08-51-07-228Z-close-fa934a7c3fe5"
lastTransitionAt: "2026-08-12T08:51:07.228Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "490c7becf549e78b3de85646a866efb9900b27f4"
---

# ATM-GOV-0351 make deferred foreign index commit failures transactionally reversible

## Intent

Repair the generic transaction boundary used by a governed commit with
`--defer-foreign-staged`. Once that path begins an index-affecting operation,
every non-commit outcome must restore the complete pre-operation index by exact
path, mode, and blob identity before returning. A successful task-scoped commit
must preserve foreign entries equally exactly. The implementation must use one
deep transaction module shared by resolver and executor; it must not recognize
task IDs, actors, evidence filenames, or incident-specific paths.

## Acceptance

- [ ] ACC-1: A failure injected after deferred-index work begins and before a
  commit completes leaves HEAD, every pre-existing staged entry (path/mode/blob),
  and unrelated worktree bytes identical to the captured baseline.
- [ ] ACC-2: The transaction has one owner with explicit success and failure
  completion results; all throw/return paths finalize through it rather than
  relying on callers to repair shared index state.
- [ ] ACC-3: Failure recovery is idempotent and fail-closed: if exact restore
  cannot be proven, later shared-index writes are blocked with a durable,
  executable recovery result instead of silently continuing.
- [ ] ACC-4: A successful task-scoped commit excludes and preserves multiple
  generated foreign entries without a fixed task ID, path list, or entry count.
- [ ] ACC-5: Focused red/green evidence binds the same case, digest, public
  seam, and baseline/candidate lineage. Broad CLI validation is phase advisory,
  not a substitute for the focused proof.
- [ ] ACC-6: A runner-recovery claim validates all read-only eligibility and
  broker admission before consuming its one-time emergency lease; a rejected
  claim consumes none, while the first actual lifecycle write consumes exactly
  one. This rule is permission-generic and must not depend on a task ID.
- [ ] ACC-7: An explicit, valid-but-unconsumed recovery lease may admit only
  unowned dirty code paths already wholly declared by that same task; foreign
  ownership remains blocked. Lease validation is read-only and the lease is
  still consumed only immediately before the first lifecycle write.
- [ ] ACC-8: A hook-bypass commit resolves its exact sealed candidate and passes
  Team Broker ownership admission before consuming a one-time bypass lease.
  Foreign shared-index residue outside that candidate is preserved and cannot
  force a broker override; a candidate that actually overlaps foreign scope
  remains blocked.

## Execution notes

Start by adding the focused failure fixture against the current path. Keep the
state capture, ownership, finalize, and exact-restore responsibilities in
`task-scoped-commit-transaction.ts`; keep `commit-bundle-resolution.ts` a policy
planner and `commit-execution.ts` a caller. Do not use an alternate worktree,
raw Git reset, manually edited ATM runtime state, or an emergency lease as the
implementation mechanism. Emergency authority may only unblock a subsequent
task-scoped delivery after this generic repair is green.

The same transaction rule applies to runner-recovery claims: validation and
broker admission are read-only preparation, while consuming a one-time
emergency approval is an irreversible state transition. Keep the public CLI
flag as a narrow bootstrap bridge, but consume its lease immediately before the
first lifecycle write—not merely because a request was parsed. Do not encode a
specific task, actor, lane, or incident into the rule.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-12T06:13:37.597Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0351-make-deferred-foreign-index-commit-failures-transactionally-reversible.task.md","contentDigest":"sha256:d0ad990dd6b7f723f5fec7ef1ad7c781c7a60f9f1dc18df7dce38f89001e600d"} -->
