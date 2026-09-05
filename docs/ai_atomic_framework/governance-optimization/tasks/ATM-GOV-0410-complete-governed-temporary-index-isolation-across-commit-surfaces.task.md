---
task_id: ATM-GOV-0410
title: Complete governed temporary-index isolation across commit surfaces
status: done
owner: atm-core
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations:
    - ATM-BUG-2026-07-17-003
  changedPublicSeams:
    - governed-commit-temporary-index-isolation
  causalImpactEdges:
    - foreign-staged-files-cannot-enter-governed-commit
  parallelFrontierInputs:
    - shared-git-index
  validatorReferences:
    - test_git_commit_task_scoped_staging_001
    - test_real_shared_delivery_commit_executor_001
  phaseOwner: null
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation/commit-command.ts
  - packages/cli/src/commands/git-governance/implementation/record-commit-command.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/broker/batch-execute-actions.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/git-commit-task-scoped-staging/fixture.ts
  - tests/cli/real-shared-delivery-commit-executor.test.ts
  - tests/cli/governed-commit-surface-audit.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation/commit-command.ts
  - packages/cli/src/commands/git-governance/implementation/record-commit-command.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/broker/batch-execute-actions.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/git-commit-task-scoped-staging/fixture.ts
  - tests/cli/real-shared-delivery-commit-executor.test.ts
  - tests/cli/governed-commit-surface-audit.test.ts
validators:
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - node --strip-types tests/cli/real-shared-delivery-commit-executor.test.ts
  - node --strip-types tests/cli/governed-commit-surface-audit.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_git_commit_task_scoped_staging_001
    targetGroupId: null
    semanticKey: governed_commit_foreign_staged_isolation
    coversAcceptance:
      - ACC-1
      - ACC-2
    coversImpactEdges:
      - foreign-staged-files-cannot-enter-governed-commit
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: governed-commit-temporary-index-isolation
    resourceKey: shared-git-index
  - caseId: test_real_shared_delivery_commit_executor_001
    targetGroupId: null
    semanticKey: shared_delivery_payload_isolation
    coversAcceptance:
      - ACC-3
    coversImpactEdges:
      - foreign-staged-files-cannot-enter-governed-commit
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: shared-delivery-temporary-index-isolation
    resourceKey: shared-git-index
  - caseId: test_governed_commit_surface_audit_0410
    targetGroupId: null
    semanticKey: governed_commit_surface_audit
    coversAcceptance:
      - ACC-4
      - ACC-5
    coversImpactEdges:
      - foreign-staged-files-cannot-enter-governed-commit
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: governed-commit-surface-audit
    resourceKey: shared-git-index
requiredTestCaseIds:
  - test_git_commit_task_scoped_staging_001
  - test_real_shared_delivery_commit_executor_001
  - test_governed_commit_surface_audit_0410
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the governed commit-surface isolation change while retaining any independent evidence receipts.
atomizationImpact:
  ownerAtomOrMap: atm.git-governance-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.task-scoped-commit-transaction
      pattern: Transaction Script
      source: packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-05T15:46:23.883Z"
completed_by_agent: "codex-backlog-audit-20260905"
closedAt: "2026-09-05T15:46:23.883Z"
closedByActor: "codex-backlog-audit-20260905"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-05T15-46-23-883Z-close-82a806875436"
lastTransitionAt: "2026-09-05T15:46:23.883Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "bb3cb26db0a27bb85989a428c44a330777c3b988"
---

# ATM-GOV-0410 Complete governed temporary-index isolation across commit surfaces

## Intent

Complete the evidence-backed temporary-index isolation contract for every
governed commit surface that can consume the shared Git index. A task-bound or
shared-delivery commit must physically exclude foreign staged paths, while the
low-risk record-commit route must reject a non-empty caller index before it
stages anything. Preserve the existing broker/branch serialization and do not
make a broad repository cleanup part of this task.

## Acceptance

- [ ] `git commit --task` and shared-delivery commit paths use a temporary index
      whose committed file set is exactly the admitted task/bundle scope.
- [ ] `git record-commit --paths` fails closed when pre-existing staged files are
      present and never absorbs them into a record-only commit.
- [ ] Focused regressions cover foreign staged files, payload/tree equality, and
      the negative non-empty-index route; tests must execute their assertions.
- [ ] A doctor or equivalent audit reports cross-task commit file sets without
      turning a read-only finding into mutation authority.
- [ ] Deliverables, validators, and command-backed red/green evidence are
      complete before close; runner publication is required if frozen surfaces
      change.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-05T15:25:26.738Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0410-complete-governed-temporary-index-isolation-across-commit-surfaces.task.md","contentDigest":"sha256:30321a4b8a80b02f3590f2ef209a5b2d792267f0fca0378fc221cafd392d07f9"} -->
