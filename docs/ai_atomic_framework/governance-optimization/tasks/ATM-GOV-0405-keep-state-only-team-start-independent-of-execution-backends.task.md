---
task_id: ATM-GOV-0405
title: Keep state-only Team start independent of execution backends
status: planned
owner: gemini-captain
priority: P0
depends_on:
  - ATM-GOV-0402
causalGraph:
  causalDependencies:
    - A validated state-only L5 plan is rejected for a missing editor-subagent execution backend before it can create its coordination record.
  startConditions:
    - A Team plan is safeToStart and execution was not requested.
  softRelations:
    - ATM-GOV-0341
  changedPublicSeams:
    - team-state-only-runtime-admission
  causalImpactEdges:
    - state-only-start-to-runtime-capability-validation
  parallelFrontierInputs:
    - validated team plan and executionRequested flag
  validatorReferences:
    - packages/cli/src/commands/team/__tests__/team-execute-fail-closed.spec.ts
  phaseOwner: gemini-captain
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: C:/Users/User/AI-Atomic-Framework
scopePaths:
  - packages/cli/src/commands/team/team-execution-lane.ts
  - packages/cli/src/commands/team/legacy/command-runner.ts
  - packages/cli/src/commands/team/__tests__/team-execute-fail-closed.spec.ts
  - tests/cli/team-state-only-runtime-admission.test.ts
deliverables:
  - packages/cli/src/commands/team/team-execution-lane.ts
  - packages/cli/src/commands/team/legacy/command-runner.ts
  - packages/cli/src/commands/team/__tests__/team-execute-fail-closed.spec.ts
  - tests/cli/team-state-only-runtime-admission.test.ts
validators:
  - node --strip-types packages/cli/src/commands/team/__tests__/team-execute-fail-closed.spec.ts
  - node --strip-types tests/cli/team-state-only-runtime-admission.test.ts
  - npm run typecheck
testContributions:
  - caseId: state_only_team_start_defers_execution_backend_0405
    targetGroupId: null
    semanticKey: state_only_backend_deferred
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [state-only-start-to-runtime-capability-validation]
    expectedRedPredicate: state-only start rejects a valid plan because the chosen execution backend is unavailable
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: team-state-only-runtime-admission
    resourceKey: null
requiredTestCaseIds:
  - state_only_team_start_defers_execution_backend_0405
tddMode: required
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.team-runtime-admission
  mapUpdates: []
  extractionCandidates:
    - atom: atm.team-state-only-admission
      pattern: Policy Object
      source: packages/cli/src/commands/team/team-execution-lane.ts
      disposition: extract
      inlineReason: null
errorCodes:
  - code: ATM_TEAM_RUNTIME_BACKEND_MISSING
    disposition: reuse
    category: guard
    trigger: Execution is requested but no installed integration declares the selected execution backend.
    retryable: true
    requiresHumanApproval: false
    recovery: Use a runtime capability returned by the official recovery or install a real backend; state-only start must not require one.
    sourceOwner: packages/cli/src/commands/team/team-execution-lane.ts
    registryOwnerTask: ATM-GOV-0405
    tests:
      - tests/cli/team-state-only-runtime-admission.test.ts
createdByCommand: atm plan card create
---

# ATM-GOV-0405 Keep state-only Team start independent of execution backends

## Intent

Repair a contract contradiction: plain `team start` is state-only and must not
spawn workers, yet it currently rejects a valid plan because the selected
editor-subagent execution backend is unavailable. State-only admission must
record the governed coordination run without requiring an execution backend.
`team start --execute` must retain strict installed-capability validation and
return a structured recovery; no manifest may claim a backend that does not
exist.

## Acceptance

- [ ] ACC-1: A valid state-only Team start succeeds without `teamRuntimeCapabilities`, mints no worker execution, and records `executeRequested: false`.
- [ ] ACC-2: `team start --execute` with a missing backend remains fail-closed as `ATM_TEAM_RUNTIME_BACKEND_MISSING` and reports a structured recovery derived from installed capabilities.
- [ ] ACC-3: Existing installed manifests are not falsely widened; actual execution capability remains a separately verified adapter fact.
- [ ] ACC-4: Fixture-first red/green tests prove state-only success, execute failure, and no agents spawned in either unavailable-backend fixture.

## Boundaries

Do not hand-edit integration manifests, invent an editor runtime, call
`team start --execute`, build, enqueue, publish, close, or push. This is a
bounded control-plane quickfix, not a provider-runtime implementation.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-16T16:49:08.731Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0405-keep-state-only-team-start-independent-of-execution-backends.task.md","contentDigest":"sha256:6554a80eabfbd551d088d75ef0551eccd901b554d0951fb4ac8caf50a7b00723"} -->
