---
task_id: TASK-ASP-0007
title: Claim-time derived atom reservation with --atoms
status: done
completed_at: "2026-10-06T18:20:39.336Z"
completed_by_agent: "claude-code-opus-5"
delivery_commit: "8dd6a1c6d"
owner: claude-code-opus-5
priority: P2
depends_on:
  - TASK-ASP-0006
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
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/next/claim-helpers.ts
  - packages/cli/src/commands/command-specs/next.spec.ts
  - packages/cli/src/commands/shared/derived-atom-occupancy.ts
  - packages/core/src/broker/derived-atoms.ts
deliverables:
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/next/claim-helpers.ts
  - packages/cli/src/commands/command-specs/next.spec.ts
  - packages/cli/src/commands/shared/derived-atom-occupancy.ts
  - packages/core/src/broker/derived-atoms.ts
validators:
  - "node --strip-types tests/cli/derived-atom-occupancy.test.ts"
  - "node --strip-types tests/cli/derived-atoms-same-file-parallel.test.ts"
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-ASP-0007 Claim-time derived atom reservation with --atoms

## Intent

Claim-time reservation: next --claim --atoms <symbols> resolves symbols in the scope files at the base commit and registers modify atom refs with source ranges on the broker intent (an intent ceiling, not an exclusive guarantee). Undeclared claims stay file-level and shareable; unknown symbols are confirmed at commit.

## Acceptance

- [x] Two tasks reserving disjoint atoms of one file are both admitted
- [x] Unresolved symbols are reported, not invented
- [x] WriteIntent carries operation modify for existing atoms

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-10-06T17:02:10.510Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"adapter-guided-atomization-sdk/tasks/TASK-ASP-0007-claim-time-derived-atom-reservation-with-atoms.task.md","contentDigest":"sha256:28271e37d58106ac1c5c2a50ee53a7b9bbf23cde7005623d5c17edbeab0ed169"} -->
