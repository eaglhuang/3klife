---
task_id: TASK-GIT-0018
title: Brokered external-worker launcher and capability-bound process execution
status: planned
owner: atm-core
priority: P0
milestone: G10
depends_on:
  - TASK-GIT-0016
causalGraph:
  causalDependencies: [TASK-GIT-0016]
  startConditions: ["RestrictedExecutionGateway is closed and its policy receipt contract is available."]
  softRelations: [TASK-GIT-0017]
  changedPublicSeams: ["atm.externalWorkerLauncher.v1"]
  causalImpactEdges: ["external-write dispatch -> capability-bound launch -> execution receipt -> lifecycle evidence"]
  parallelFrontierInputs: ["TASK-GIT-0017 may close independently; do not consume its dirty publication residue."]
  validatorReferences: ["tests/cli/external-worker-launcher.test.ts", "tests/cli/restricted-execution-gateway.test.ts"]
  phaseOwner: "external-worker control plane"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/team-agents/restricted-execution-gateway.ts
  - packages/core/src/team-agents/external-worker-launcher.ts
  - packages/core/src/team-agents/worker-executor.ts
  - packages/cli/src/commands/broker/batch-execute-actions.ts
  - packages/cli/src/commands/team-runtime-gates.ts
  - schemas/validators/external-worker-execution-receipt.schema.json
  - tests/cli/external-worker-launcher.test.ts
  - tests/cli/restricted-execution-gateway.test.ts
deliverables:
  - "One ExternalWorkerLauncher deep module whose only public mutation-capable interface accepts a gateway-approved, task/actor/lane-bound execution capability and a structured request."
  - "The Team worker executor and command-manifest executor delegate process creation to the launcher; they never spawn a worker mutation process directly."
  - "Each admitted launch records declared outputs, observed output digest, capability digest, normalized command class, cancellation result, and receipt linkage."
  - "An absent, expired, wrong-task, wrong-lane, or wrong-output capability fails before launch; warning text, environment variables, and prompt phrases cannot substitute for it."
  - "Read-only validators remain explicitly classified and cannot be upgraded into a generated-write route by argv or output declaration drift."
validators:
  - node --strip-types tests/cli/external-worker-launcher.test.ts
  - node --strip-types tests/cli/restricted-execution-gateway.test.ts
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-GIT-0018 Brokered external-worker launcher and capability-bound process execution

## Intent

Make the existing gateway a real authority boundary for ATM-managed external
workers. The protected resource is repository mutation capability; a policy
decision that an unmanaged shell may ignore is not sufficient.

## First-Principles and Deep-Module Design

`ExternalWorkerLauncher.launch({ capability, executable, argv, cwd, declaredOutputs })`
is the only mutation-capable process-launch interface. It hides capability
verification, process invocation, cancellation, output observation, receipt
writing, and safe failure classification. The gateway is its policy adapter;
the Team worker executor and command-manifest executor are its two launch
adapters.

Deletion test: without the launcher, both executors must independently verify
capabilities and observe outputs, recreating an ambient-shell bypass.

## Acceptance

- [ ] A sealed deep-module review names the public interface, two adapters, rollback, and causal validators before source edits.
- [ ] A raw Git mutation, `node -e`, PowerShell write, and shell escape are denied before child process creation.
- [ ] A valid declared generated-write request launches exactly once and records its capability/output receipt; wrong task, lane, expiry, or outputs fail closed.
- [ ] Tests prove worker and command-manifest paths cannot directly spawn a mutation process outside the launcher.
- [ ] No OS sandbox claim is made for arbitrary human-owned shells outside an ATM-managed worker process.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T16:28:03.036Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0018-brokered-external-worker-launcher-and-capability-bound-process-execution.task.md","contentDigest":"sha256:1a2fc958048811d038fd30c174d8c93ffa26c18a33baaeaf9cf2813b706aa1a2"} -->
