---
task_id: ATM-GOV-0411
title: Bound every git-derived path argv caller
status: done
owner: atm-git-governance
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/pathspec-argv-batching.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-ownership-argv-budget.test.ts
deliverables:
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/pathspec-argv-batching.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-ownership-argv-budget.test.ts
validators:
  - node --strip-types packages/cli/src/commands/git-governance/implementation/git-index-ownership-argv-budget.test.ts
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - node --strip-types tests/cli/real-shared-delivery-commit-executor.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_git_index_ownership_argv_budget_0411
    targetGroupId: null
    semanticKey: git_index_ownership_argv_budget
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [git-derived-path-argv-budget]
    expectedRedPredicate: repository-sized staged path metadata calls exceed the platform argv budget without batching
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: pathspec-argv-budget
    resourceKey: null
requiredTestCaseIds:
  - test_git_index_ownership_argv_budget_0411
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
atomizationImpact:
  ownerAtomOrMap: atm.cli-git-governance-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.pathspec-argv-budget
      pattern: Policy Object
      source: packages/cli/src/commands/git-governance/implementation/pathspec-argv-batching.ts
      disposition: inline
      inlineReason: Reuse the existing canonical planner; duplicating it would create a second budget authority.
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0411 Bound every git-derived path argv caller

## Intent

Repair the remaining commit-admission callers that pass a git-derived, repository-sized path list directly into child-process argv. Reuse the canonical pathspec budget planner, batch each metadata/restore invocation, merge results without dropping paths, and preserve fail-closed behavior for incomplete metadata or unbatchable paths. This is the caller-audit follow-up of ATM-BUG-2026-08-28-001. The runner inventory root list is explicitly out of scope because it is a bounded package-root list, not a repository-sized file list.

- [ ] Every path-list child-process call in the declared seams is budgeted through the canonical planner.
- [ ] A deterministic oversized staged-file fixture proves all paths are queried without `ENAMETOOLONG`, and incomplete batch output remains fail-closed.
- [ ] Existing task-scoped staging and shared-delivery behavior remains green.
- [ ] No foreign staged bytes, release mirrors, or ignored diagnostic residue are changed.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-05T15:52:35.051Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0411-bound-every-git-derived-path-argv-caller.task.md","contentDigest":"sha256:c6f779e69c80f36340ad553ed613beb15f8ec534f796436220793a804f81dfc2"} -->
