---
task_id: TASK-ASP-0010
title: Formal atom drift: stale downgrade and doctor reporting
status: done
completed_at: "2026-10-06T18:20:39.336Z"
completed_by_agent: "claude-code-opus-5"
delivery_commit: "8dd6a1c6d"
owner: claude-code-opus-5
priority: P2
depends_on:
  - TASK-ASP-0007
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
  - packages/cli/src/commands/shared/derived-atom-occupancy.ts
  - packages/cli/src/commands/doctor/run-doctor.ts
deliverables:
  - packages/cli/src/commands/shared/derived-atom-occupancy.ts
  - packages/cli/src/commands/doctor/run-doctor.ts
validators:
  - "node --strip-types tests/cli/derived-atom-occupancy.test.ts"
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-ASP-0010 Formal atom drift: stale downgrade and doctor reporting

## Intent

Formal atom drift: registry atoms are file-level (location.codePaths) and act as ownership annotations. A formal atom whose code path is missing is stale; claim and commit treat its files as file-level, doctor reports ATM_ATOM_FORMAL_STALE, and nothing is repaired automatically.

## Acceptance

- [x] Stale formal atom files get no derived reservation
- [x] Fresh formal atoms never swallow derived atoms
- [x] doctor warns with the stale atom list

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-10-06T17:02:14.502Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"adapter-guided-atomization-sdk/tasks/TASK-ASP-0010-formal-atom-drift-stale-downgrade-and-doctor-reporting.task.md","contentDigest":"sha256:19256c9894a3dfb0cd4ad4bb1000fb9bd7f88eecc2ef2ced94f242283ec6938f"} -->
