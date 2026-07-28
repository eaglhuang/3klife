---
task_id: TASK-GIT-0021
title: Cross-adapter controlled-execution dogfood and rollout evidence
status: planned
owner: atm-core
priority: P1
milestone: G13
depends_on:
  - TASK-GIT-0019
  - TASK-GIT-0020
causalGraph:
  causalDependencies: [TASK-GIT-0019, TASK-GIT-0020]
  startConditions: ["Adapter attestations and protected-state integrity verification are closed."]
  softRelations: []
  changedPublicSeams: ["atm.controlledExecutionConformance.v1"]
  causalImpactEdges: ["adapter matrix -> dispatch outcome -> launcher receipt -> integrity gate"]
  parallelFrontierInputs: []
  validatorReferences: ["tests/cli/controlled-execution-conformance.test.ts"]
  phaseOwner: "dogfood and rollout"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/team-agents/controlled-execution-conformance.ts
  - packages/cli/src/commands/integration-hooks/implementation.ts
  - packages/cli/src/commands/team-runtime-gates.ts
  - packages/cli/src/commands/doctor/readiness.ts
  - docs/governance/integration-plugin-matrix.md
  - docs/AGENT_PACK_ONBOARDING.md
  - tests/cli/controlled-execution-conformance.test.ts
  - tests/cli/adapter-enforcement-capability.test.ts
deliverables:
  - "One conformance matrix and receipt schema that records supported, unsupported, stale, and degraded external-write capability across every shipped adapter."
  - "Dogfood fixtures prove denial before launch for raw Git, node evaluation, PowerShell writes, and shell escapes; supported adapters prove one governed write path; unsupported adapters prove dispatch rejection."
  - "Doctor and onboarding output distinguish honest unsupported state from a broken installed enforcement bridge and provide the correct ATM remediation command."
  - "Rollout documentation states the boundary precisely: ATM controls managed external workers and detects governance-state bypasses; it does not sandbox arbitrary user shells."
validators:
  - node --strip-types tests/cli/controlled-execution-conformance.test.ts
  - node --strip-types tests/cli/adapter-enforcement-capability.test.ts
  - npm run validate:cli
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-GIT-0021 Cross-adapter controlled-execution dogfood and rollout evidence

## Intent

Turn the new control plane into measurable cross-adapter evidence before it is
advertised as a hard external-write boundary.

## First-Principles and Deep-Module Design

`ControlledExecutionConformance.evaluate(matrixInput)` owns classification of
adapter evidence and fixture outcomes. It hides adapter naming, probe details,
policy digest comparison, and rollout wording. Its adapters are doctor/onboarding
and the cross-adapter test fixture suite.

## Acceptance

- [ ] Every shipped adapter is classified as enforced, unsupported, stale, or degraded from evidence, never from a static marketing label.
- [ ] Tests prove unsupported adapters cannot receive external-write dispatch and supported adapters deny bypass shapes before launch.
- [ ] Documentation and doctor output make no OS-sandbox claim beyond the evidence.
- [ ] A failed dogfood fixture blocks promotion of the corresponding adapter capability.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T16:28:11.508Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0021-cross-adapter-controlled-execution-dogfood-and-rollout-evidence.task.md","contentDigest":"sha256:a388628eb5b52c141ec04746f467bb4eec597406238a92e303cf6f2c00aaefd8"} -->
