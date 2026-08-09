---
task_id: TASK-ERR-0012
title: Reconcile released residue transaction with commit readiness
status: done
owner: atm-captain
priority: P0
depends_on: [TASK-ERR-0010, TASK-LANE-0022]
causalGraph:
  causalDependencies: [TASK-ERR-0010, TASK-LANE-0022]
  startConditions: [wave-0-foreign-released-or-abandoned-staged-residue-reproduced]
  softRelations: [ATM-GOV-0325, TASK-ERR-0007]
  changedPublicSeams: [released-residue-transaction]
  causalImpactEdges: [release-to-durable-residue-ownership, residue-to-brokered-commit-readiness, commit-readiness-to-closeback]
  parallelFrontierInputs: [canonical-git-index, task-lifecycle-ledger, broker-index-lane]
  validatorReferences: [test_released_residue_transaction_0012, test_released_wip_reclaim_0012, validate:cli]
  phaseOwner: correction-wave-2
related_plan: error-governance/error-governance-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/cli/src/commands/tasks/release-wip-transaction.ts
  - packages/cli/src/commands/tasks/generated-residue-policy.ts
  - packages/cli/src/commands/tasks/claim-work-admission.ts
  - packages/cli/src/commands/tasks/scope-lock-diagnostics.ts
  - packages/cli/src/commands/tasks/close-orchestrator.ts
  - packages/cli/src/commands/taskflow/historical-close-preflight.ts
  - packages/cli/src/commands/git-head-evidence.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  # Exact generated outputs admitted only when recorded in this task's sealed
  # runner-sync inventory; do not widen this to a release/** wildcard.
  - packages/cli/dist/commands/git-governance/implementation/commit-bundle-resolution.js
  - packages/cli/dist/commands/hook/pre-commit/implementation.js
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/packages/cli/dist/commands/git-governance/implementation/commit-bundle-resolution.js
  - release/atm-root-drop/packages/cli/dist/commands/hook/pre-commit/implementation.js
  - release/atm-root-drop/packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - release/atm-root-drop/packages/cli/src/commands/hook/pre-commit/implementation.ts
  - release/atm-root-drop/release-manifest.json
  - tests/cli/released-residue-transaction.test.ts
  - tests/cli/released-wip-reclaim-transaction.test.ts
  - packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts
  # Exact generated outputs from runner-sync-978a8a92 for sealed source c65606e.
  - packages/cli/dist/commands/git-head-evidence.d.ts
  - packages/cli/dist/commands/git-head-evidence.js
  - packages/cli/dist/commands/tasks/__tests__/scope-lock-diagnostics.test.js
  - packages/cli/dist/commands/tasks/claim-work-admission.js
  - packages/cli/dist/commands/tasks/scope-lock-diagnostics.js
  - packages/cli/dist/commands/team/legacy/crew-decision-policy.d.ts
  - packages/cli/dist/commands/team/legacy/plan-orchestration.d.ts
  - packages/cli/dist/commands/team/legacy/planning-context.d.ts
  - packages/cli/dist/commands/team/legacy/team-run-runtime.d.ts
  - release/atm-root-drop/packages/cli/dist/commands/git-head-evidence.d.ts
  - release/atm-root-drop/packages/cli/dist/commands/git-head-evidence.js
  - release/atm-root-drop/packages/cli/dist/commands/tasks/__tests__/scope-lock-diagnostics.test.js
  - release/atm-root-drop/packages/cli/dist/commands/tasks/claim-work-admission.js
  - release/atm-root-drop/packages/cli/dist/commands/tasks/scope-lock-diagnostics.js
  - release/atm-root-drop/packages/cli/dist/commands/team/legacy/crew-decision-policy.d.ts
  - release/atm-root-drop/packages/cli/dist/commands/team/legacy/plan-orchestration.d.ts
  - release/atm-root-drop/packages/cli/dist/commands/team/legacy/planning-context.d.ts
  - release/atm-root-drop/packages/cli/dist/commands/team/legacy/team-run-runtime.d.ts
  - release/atm-root-drop/packages/cli/src/commands/git-head-evidence.ts
  - release/atm-root-drop/packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts
  - release/atm-root-drop/packages/cli/src/commands/tasks/claim-work-admission.ts
  - release/atm-root-drop/packages/cli/src/commands/tasks/scope-lock-diagnostics.ts
deliverables:
  - packages/cli/src/commands/tasks/generated-residue-policy.ts
  - packages/cli/src/commands/tasks/release-wip-transaction.ts
  - packages/cli/src/commands/tasks/claim-work-admission.ts
  - packages/cli/src/commands/tasks/scope-lock-diagnostics.ts
  - packages/cli/src/commands/git-head-evidence.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/release-manifest.json
  - tests/cli/released-residue-transaction.test.ts
  - tests/cli/released-wip-reclaim-transaction.test.ts
  - packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts
  - packages/cli/dist/commands/git-head-evidence.js
  - packages/cli/dist/commands/tasks/__tests__/scope-lock-diagnostics.test.js
  - packages/cli/dist/commands/tasks/claim-work-admission.js
  - packages/cli/dist/commands/tasks/scope-lock-diagnostics.js
  - release/atm-root-drop/packages/cli/dist/commands/git-head-evidence.js
  - release/atm-root-drop/packages/cli/dist/commands/tasks/__tests__/scope-lock-diagnostics.test.js
  - release/atm-root-drop/packages/cli/dist/commands/tasks/claim-work-admission.js
  - release/atm-root-drop/packages/cli/dist/commands/tasks/scope-lock-diagnostics.js
  - release/atm-root-drop/packages/cli/src/commands/git-head-evidence.ts
  - release/atm-root-drop/packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts
  - release/atm-root-drop/packages/cli/src/commands/tasks/claim-work-admission.ts
  - release/atm-root-drop/packages/cli/src/commands/tasks/scope-lock-diagnostics.ts
validators:
  - node --strip-types tests/cli/released-residue-transaction.test.ts
  - node --strip-types tests/cli/released-wip-reclaim-transaction.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_released_residue_transaction_0012
    semanticKey: released_residue_is_preserved_or_brokered_without_stage_override
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [release-to-durable-residue-ownership, residue-to-brokered-commit-readiness]
    expectedRedPredicate: a released task leaves protected staged residue and an unrelated scoped commit receives a bare refusal or mutates those bytes
    responsibility: task-required
    contractEdge: released-residue-transaction
  - caseId: test_released_wip_reclaim_0012
    semanticKey: failed_wip_preservation_never_releases_claim_or_ownerless_wip
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [release-to-durable-residue-ownership, commit-readiness-to-closeback]
    expectedRedPredicate: failed WIP commit releases a claim or same-task reclaim reports unowned dirty WIP without executable recovery
    responsibility: task-required
    contractEdge: released-wip-continuity
  - caseId: test_git_head_receipt_close_ownership_0012
    semanticKey: latest_git_head_receipt_is_advisory_only_for_its_current_closing_task
    coversAcceptance: [ACC-1, ACC-6]
    coversImpactEdges: [commit-readiness-to-closeback]
    expectedRedPredicate: a current task's generated Git-head receipt blocks its own close, or a foreign or malformed receipt is treated as close-owned
    responsibility: task-required
    contractEdge: git-head-receipt-ownership
requiredTestCaseIds: [test_released_residue_transaction_0012, test_released_wip_reclaim_0012]
phaseTestCaseIds: [typecheck, validate:cli]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [repair-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the transaction policy and tests together; retain snapshots and recovery receipts, never recreate protected bytes from an assumed worktree copy.
atomizationImpact:
  ownerAtomOrMap: atm.git-index-ownership
  mapUpdates: []
  extractionCandidates:
    - atom: atm.released-residue-transaction
      pattern: Transaction Script
      source: packages/cli/src/commands/tasks/generated-residue-policy.ts
      disposition: inline
      inlineReason: The existing residue policy is the single decision boundary for lifecycle-derived ownership; another facade would duplicate commit and claim admission policy.
errorCodes:
  - code: ATM_GIT_COMMIT_PROTECTED_FOREIGN_STAGED_OWNERSHIP
    disposition: reuse
    category: git-governance
    trigger: protected foreign staged bytes lack a valid preserve or broker transaction
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs broker status --json
    sourceOwner: packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
    registryOwnerTask: TASK-ERR-0008
    tests: [tests/cli/released-residue-transaction.test.ts]
  - code: ATM_CLAIM_FOREIGN_UNSTAGED_WIP
    disposition: reuse
    category: task-ledger
    trigger: a claim intersects dirty WIP lacking durable ownership lineage
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs tasks repair-claim --task <task-id> --actor <actor-id> --json
    sourceOwner: packages/cli/src/commands/tasks/claim-work-admission.ts
    registryOwnerTask: TASK-LANE-0022
    tests: [tests/cli/released-wip-reclaim-transaction.test.ts]
completed_at: "2026-08-09T18:16:18.313Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-09T18:16:18.313Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-09T18-16-18-313Z-close-4f214d95ea3a"
lastTransitionAt: "2026-08-09T18:16:18.313Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2fc9a88378037059a7a76438655b3f951beeafa4"
---

# TASK-ERR-0012 Reconcile released residue transaction with commit readiness

## Intent

Repair the generic state transition where a task is released after a WIP or
close transaction cannot finish. Protected generated or staged bytes must remain
durably attributable to their producing task and snapshot. A later independent
commit receives an executable broker outcome: preserve in a transaction, queue
behind an owner, or fail with a recovery receipt. It must not require a human to
unstage bytes from an ownerless released task, and it must not silently absorb or
discard them.

## Acceptance

- [ ] ACC-1: Release, failed WIP preservation, reclaim, close and commit consume one lifecycle-derived residue decision; no caller independently infers released ownership from task id, filename or index status.
- [ ] ACC-2: Protected staged bytes from a released task are either preserved byte-identically by the owning transaction or produce a broker ticket/recovery snapshot. An unrelated scoped commit never needs a stage override merely because no active owner remains.
- [ ] ACC-3: A true active foreign owner remains protected and queues or fails closed as before; the repair does not widen commits or weaken index isolation.
- [ ] ACC-4: If WIP preservation cannot create a verified commit SHA, release fails closed and the claim plus durable WIP ownership remain intact.
- [ ] ACC-5: Same-task reclaim restores durable WIP ownership without converting it to unowned/foreign dirty WIP; discard remains explicit and destructive.
- [ ] ACC-6: A Git-head receipt is advisory at close only when its latest parseable record durably identifies the closing task. Missing, malformed, stale, or foreign receipts remain blocking; claim admission and close use the same reader.

## Engineering method

- First principles: bytes and authority are facts. A lifecycle transition may not erase either until a verified replacement fact exists.
- Deep module: `generated-residue-policy` owns lifecycle classification and returns a compact transaction plan; release, claim admission, commit assembly and close orchestration consume it rather than duplicating exceptions.
- Evidence identity: one shared Git-head receipt reader is the authority for both admission and close; a filename alone never grants ownership.
- Charter: Git index is Tier 2. The broker returns execute-now, queue or recovery (INV-ATM-008), keeps one canonical worktree (INV-ATM-010), and uses the most general evidence-supported rule (INV-ATM-009).
