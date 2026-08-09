---
task_id: TASK-ERR-0010
title: Preserve foreign staged bytes across taskflow close
status: planned
owner: atm-captain
priority: P0
depends_on: [TASK-ERR-0008, TASK-ERR-0009]
causalGraph:
  causalDependencies: [TASK-ERR-0008, TASK-ERR-0009]
  startConditions: [foreign-stage-loss-reproduction-recorded]
  softRelations: [ATM-GOV-0328-closeback-blocked-until-restoration-proven]
  changedPublicSeams: [taskflow-close-defer-foreign-staged-transaction]
  causalImpactEdges: [foreign-index-snapshot-to-byte-identical-restore, restore-failure-to-fail-closed-recovery]
  parallelFrontierInputs: [active-foreign-git-head-receipt, stage-override-lease]
  validatorReferences: [test_taskflow_close_foreign_stage_restoration_0010, typecheck, validate:cli, validate:git-head-evidence]
  phaseOwner: TASK-ERR-0010
related_plan: error-governance/error-governance-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/cli/src/commands/tasks/close-window-lock.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/taskflow/__tests__/taskflow-close-window-lock.test.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
deliverables:
  - packages/cli/src/commands/tasks/close-window-lock.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/taskflow/__tests__/taskflow-close-window-lock.test.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
validators:
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-close-window-lock.test.ts
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:git-head-evidence
testContributions:
  - caseId: test_taskflow_close_foreign_stage_restoration_0010
    semanticKey: taskflow_close_foreign_stage_restoration
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [foreign-index-snapshot-to-byte-identical-restore, restore-failure-to-fail-closed-recovery]
    expectedRedPredicate: taskflow close with defer-foreign-staged removes or changes a foreign staged entry after successful close
    responsibility: task-required
    contractEdge: taskflow-close-defer-foreign-staged-transaction
requiredTestCaseIds: [test_taskflow_close_foreign_stage_restoration_0010]
phaseTestCaseIds: [typecheck, validate:cli, validate:git-head-evidence]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [repair-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the source and regenerated runner artifacts together; never attempt to recreate a lost foreign staged blob from an assumed worktree copy.
atomizationImpact:
  ownerAtomOrMap: atm.git-index-ownership
  mapUpdates: []
  extractionCandidates:
    - atom: atm.close-window-foreign-stage-transaction
      pattern: Transaction Script
      source: packages/cli/src/commands/tasks/close-window-lock.ts
      disposition: inline
      inlineReason: The close-window lock is the existing transactional boundary; a separate facade would split snapshot, lease-consumption, and restore authority.
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-ERR-0010 Preserve foreign staged bytes across taskflow close

## Intent

Repair the close-window transaction so `taskflow close --defer-foreign-staged`
preserves every authorized foreign staged entry across a successful close. The
observed reproduction was a staged `ATM-GOV-0328` git-head receipt: ERR-0009
closed successfully after a valid stage-override lease, yet the entry was absent
from both index and worktree afterwards. This card owns the general transaction
rule, not an exception for that task or filename.

Planning authority: `C:/Users/User/3KLife`.
Target authority: `C:/Users/User/AI-Atomic-Framework`.
Closure authority: target ledger plus planning closeback.

## Acceptance

- [ ] ACC-1: With a valid stage-override lease, a successful taskflow close
  that defers a foreign staged entry restores the exact path, index mode, and
  staged blob id after its own target and planning commits complete.
- [ ] ACC-2: The restore contract is provider-neutral: it applies to every
  foreign active staged entry in the authorized snapshot, not only git-head or
  a named task id.
- [ ] ACC-3: If byte-identical restoration cannot be verified, the close
  transaction fails closed with a durable recovery snapshot; it must not report
  successful close while silently dropping the entry.
- [ ] ACC-4: Regression coverage proves success-path restoration and
  restore-failure recovery without raw Git mutation in the production route.
- [ ] ACC-5: Focused tests, typecheck, CLI validation, and git-head evidence
  validation are fresh command-backed evidence before close.

## Engineering method

- First principles: borrowing a foreign index entry for isolation cannot change
  its authority or bytes; the transaction has either restored its recorded
  precondition or failed.
- Deep module: one close-window transaction owns snapshot, temporary unstage,
  commit, byte-identity verification, restore, and recovery receipt. Callers
  receive a verdict, not piecemeal index commands.
- Charter: preserve Tier-2 Git-index ownership through a brokered lease and
  keep one canonical worktree; no task-, actor-, or filename-specific bypass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T12:22:17.117Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"error-governance/tasks/TASK-ERR-0010-preserve-foreign-staged-bytes-across-taskflow-close.task.md","contentDigest":"sha256:b247aebdf6f066c86d76ce6351712b6c7d6d08674d0dfb44c1d7ff0836a15c3f"} -->
