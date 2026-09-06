---
task_id: TASK-RFT-0109
title: Extract bounded semantic modules from pre-commit hook implementation
status: done
owner: atm-cli
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
related_plan: rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/hook/pre-commit.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/hook/pre-commit/support.ts
  - packages/cli/src/commands/hook/pre-commit/*.ts
  - tests/cli/pre-commit-hook-extraction.test.ts
deliverables:
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/hook/pre-commit/*.ts
  - tests/cli/pre-commit-hook-extraction.test.ts
validators:
  - node --strip-types tests/cli/pre-commit-hook-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
methodProfiles:
  - expand-contract
tddMode: required
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the governed delivery commit and closeout bundle together.
atomizationImpact:
  ownerAtomOrMap: atm.cli-pre-commit-hook
  extractionCandidates:
    - atom: atm.cli-pre-commit-protected-state
      pattern: ProtectedStateGuard
      source: packages/cli/src/commands/hook/pre-commit/implementation.ts
      disposition: extract
    - atom: atm.cli-pre-commit-ownership
      pattern: OwnershipAndResidueGuard
      source: packages/cli/src/commands/hook/pre-commit/implementation.ts
      disposition: follow-up-card
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-RFT-0109 Extract bounded semantic modules from pre-commit hook implementation

## Intent

Expand the pre-commit hook's transitional implementation and support carriers into readable semantic modules while preserving the facade exports and fail-closed protected-state, direction-lock, ownership, identity, and residue behavior.

## Acceptance

- [ ] Extract at least one bounded semantic guard module without changing the public facade.
- [ ] Keep every checked module at or below the repository line/longest-line budget.
- [ ] Prove behavior with the focused extraction regression, typecheck, and CLI validation.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-06T18:00:35.992Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"rft-hardening/tasks/TASK-RFT-0109-extract-bounded-semantic-modules-from-pre-commit-hook-implementation.task.md","contentDigest":"sha256:0c78eb4d8956b1213c5a1f6702eb80aac99b9e6e51558444085a644ec46886c1"} -->
