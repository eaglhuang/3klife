---
task_id: TASK-ASP-0009
title: Import preamble rule, modify operation, and compose revalidation
status: done
completed_at: "2026-10-06T18:20:39.336Z"
completed_by_agent: "claude-code-opus-5"
delivery_commit: "8dd6a1c6d"
owner: claude-code-opus-5
priority: P2
depends_on:
  - TASK-ASP-0008
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
  - packages/core/src/broker/derived-atoms.ts
  - packages/cli/src/commands/shared/derived-atom-occupancy.ts
  - docs/BROKER_GUIDE.md
deliverables:
  - packages/core/src/broker/derived-atoms.ts
  - packages/cli/src/commands/shared/derived-atom-occupancy.ts
validators:
  - "node --strip-types tests/cli/derived-atom-occupancy.test.ts"
  - "node --strip-types tests/cli/derived-atoms-same-file-parallel.test.ts"
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-ASP-0009 Import preamble rule, modify operation, and compose revalidation

## Intent

Preamble rule and modify operation: one #preamble pseudo-atom per file that commutes only for pure import additions (judged on preamble hunks only); derived refs use operation modify. Revalidation investigation result: no new entry point; sequential commits are revalidated by close-time evidence on the combined HEAD and steward compose keeps post-compose-semantic-validation.

## Acceptance

- [x] Pure import additions from two tasks commute
- [x] Removing an import conflicts with a task holding the preamble
- [x] A body edit elsewhere does not make the preamble exclusive

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-10-06T17:02:13.185Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"adapter-guided-atomization-sdk/tasks/TASK-ASP-0009-import-preamble-rule-modify-operation-and-compose-revalidation.task.md","contentDigest":"sha256:b2511da6fde9a81879839b8f44d104cded4dd8741d3a067a8cb5316f99940898"} -->
