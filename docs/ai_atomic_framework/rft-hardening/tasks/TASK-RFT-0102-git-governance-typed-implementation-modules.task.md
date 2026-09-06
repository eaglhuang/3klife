---
task_id: TASK-RFT-0102
title: Expand git-governance implementation carrier into typed bounded modules
status: done
owner: atm-core
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-RFT-0032 is closed in the target ledger
    - current implementation and facade measurements are captured before editing
  softRelations:
    - ATM-BUG-2026-07-15-195
  changedPublicSeams:
    - git-governance facade exports remain behavior-compatible
  causalImpactEdges:
    - typed-implementation-modules
  parallelFrontierInputs: []
  validatorReferences:
    - git-governance-command-extraction
  phaseOwner: null
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/**/*.ts
  - tests/cli/git-governance-command-extraction.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/**/*.ts
  - tests/cli/git-governance-command-extraction.test.ts
validators:
  - node --strip-types tests/cli/git-governance-command-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: git_governance_typed_module_boundaries_0102
    targetGroupId: null
    semanticKey: git_governance_typed_module_boundaries
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [typed-implementation-modules]
    expectedRedPredicate: compact implementation carrier violates the bounded semantic-module contract
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: git-governance-command-extraction
    resourceKey: null
requiredTestCaseIds:
  - git_governance_typed_module_boundaries_0102
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
  ownerAtomOrMap: atm.git-governance-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.git-governance-transaction-policy
      pattern: Policy Object
      source: packages/cli/src/commands/git-governance/implementation.ts
      disposition: extract
      inlineReason: null
    - atom: atm.git-governance-command-results
      pattern: Result Contract Object
      source: packages/cli/src/commands/git-governance/implementation.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-09-06T15:29:07.358Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-06T15:29:07.358Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-06T15-29-07-358Z-close-cc5e1fe9c199"
lastTransitionAt: "2026-09-06T15:29:07.358Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "65aa32730"
---

# TASK-RFT-0102 - Expand git-governance implementation carrier into typed bounded modules

## Acceptance

- Replace the transitional compact implementation carrier with readable,
  semantically bounded modules for the existing commit and push guard seams;
  every touched or newly extracted source/test support module must stay at or
  below 600 physical lines.
- Preserve the `TASK-RFT-0032` facade exports and protected-branch behavior,
  add the bound case `git_governance_typed_module_boundaries_0102` with a
  deterministic red-to-green receipt, and update the declared atom map only
  when the extracted ownership is proven.

## Boundaries

- Do not reopen or rewrite `TASK-RFT-0032` history.
- Do not change release artifacts, npm publication, or unrelated command
  behavior.
- Do not absorb foreign worktree or staged evidence.