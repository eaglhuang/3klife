---
task_id: TASK-ASP-0011
title: Dogfood: same-file two-symbol parallel claims and metrics
status: done
completed_at: "2026-10-06T18:20:39.336Z"
completed_by_agent: "claude-code-opus-5"
delivery_commit: "8dd6a1c6d"
owner: claude-code-opus-5
priority: P2
depends_on:
  - TASK-ASP-0009
  - TASK-ASP-0010
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
  - tests/cli/derived-atoms-same-file-parallel.test.ts
deliverables:
  - tests/cli/derived-atoms-same-file-parallel.test.ts
validators:
  - "node --strip-types tests/cli/derived-atoms-same-file-parallel.test.ts"
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-ASP-0011 Dogfood: same-file two-symbol parallel claims and metrics

## Intent

Dogfood in a fresh adopter: two tasks claim and commit different functions of one file in parallel, an overlapping change is refused with HEAD unchanged, additive imports commute, an import removal conflicts, and the off switch restores file-level behaviour. Metrics (same-file parallel admit ratio, preamble queueing, derivation p95, post-compose validator failures) are collected from these runs going forward.

## Acceptance

- [x] End-to-end test passes in CI (Product CI test sweep)

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-10-06T17:02:15.812Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"adapter-guided-atomization-sdk/tasks/TASK-ASP-0011-dogfood-same-file-two-symbol-parallel-claims-and-metrics.task.md","contentDigest":"sha256:34391ce289e980b977ba55551f274f88181ee3bba4e4b383d7c46506b0c95aca"} -->
