---
task_id: TASK-ASP-0008
title: Commit-time derived atom confirmation from the staged diff
status: done
completed_at: "2026-10-06T18:20:39.336Z"
completed_by_agent: "claude-code-opus-5"
delivery_commit: "8dd6a1c6d"
owner: claude-code-opus-5
priority: P2
depends_on:
  - TASK-ASP-0007
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: adapter-guided-atomization-sdk/derived-atoms-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance.ts
  - packages/cli/src/commands/shared/derived-atom-occupancy.ts
  - packages/core/src/broker/derived-atoms.ts
deliverables:
  - packages/cli/src/commands/git-governance.ts
  - packages/cli/src/commands/shared/derived-atom-occupancy.ts
  - packages/core/src/broker/derived-atoms.ts
validators:
  - "node --strip-types tests/cli/derived-atom-occupancy.test.ts"
  - "node --strip-types tests/cli/derived-atoms-same-file-parallel.test.ts"
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-ASP-0008 Commit-time derived atom confirmation from the staged diff

## Intent

Commit-time confirmation: the governed git commit derives the atoms the staged diff touched (index post-image, worktree for --auto-stage), refuses a real overlap with another active task reserved/confirmed atom with ATM_GIT_DERIVED_ATOM_CONFLICT before writing, and merges confirmed atoms into the task broker intent (VirtualAtomInUse projection). Derivation failures never block; ATM_DERIVED_ATOMS=off disables.

## Acceptance

- [x] Overlapping change is refused and HEAD does not move
- [x] Disjoint change commits and is recorded on the broker intent
- [x] New symbols are confirmed from the new side of the diff
- [x] Underivable input stays file-level without fabricating symbols

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-10-06T17:02:11.885Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"adapter-guided-atomization-sdk/tasks/TASK-ASP-0008-commit-time-derived-atom-confirmation-from-the-staged-diff.task.md","contentDigest":"sha256:383b0eaa3420aeccc25be6fd84ab71e15369aa9049ba229d721611d5bef38d1f"} -->
