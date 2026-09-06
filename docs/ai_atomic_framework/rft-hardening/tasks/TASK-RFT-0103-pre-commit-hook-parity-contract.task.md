---
task_id: TASK-RFT-0103
title: Align pre-commit hook parity test with unique staged task context
status: planned
owner: atm-core
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - current pre-commit implementation contains unique staged task context inference
    - parity test reproduces a cross-task commit with an explicit unrelated committing task
  softRelations:
    - ATM-BUG-2026-07-15-200
  changedPublicSeams:
    - pre-commit hook behavior remains unchanged
  causalImpactEdges:
    - pre-commit-hook-parity-contract
  parallelFrontierInputs: []
  validatorReferences:
    - pre-commit-hook-extraction
  phaseOwner: null
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - tests/cli/pre-commit-hook-extraction.test.ts
deliverables:
  - tests/cli/pre-commit-hook-extraction.test.ts
validators:
  - node --strip-types tests/cli/pre-commit-hook-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: pre_commit_hook_parity_unique_task_context_0103
    targetGroupId: null
    semanticKey: pre_commit_hook_parity_unique_task_context
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [pre-commit-hook-parity-contract]
    expectedRedPredicate: parity test assumes missing task context means cross-task commit after unique staged task inference
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: pre-commit-hook-extraction
    resourceKey: null
requiredTestCaseIds:
  - pre_commit_hook_parity_unique_task_context_0103
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - test-contract-alignment
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.pre-commit-hook
  mapUpdates: []
  extractionCandidates: []
---

# TASK-RFT-0103 - Align pre-commit hook parity test with unique staged task context

## Acceptance

- Update only the parity test fixture so the raw commit case supplies an
  explicitly unrelated `ATM_COMMIT_TASK_ID`, proving that the hook blocks a
  cross-task mutation under the current unique-staged-task inference behavior.
- Preserve the existing assertions for the governed bridge, tampered payload,
  and ineligible evidence; do not change the hook implementation, error code,
  or any foreign worktree/index state.

## Boundaries

- Do not modify `packages/cli/src/commands/hook/**`.
- Do not delete, restore, stage, or absorb foreign residue.
- Do not change release artifacts, backlog projections, or npm publication.
