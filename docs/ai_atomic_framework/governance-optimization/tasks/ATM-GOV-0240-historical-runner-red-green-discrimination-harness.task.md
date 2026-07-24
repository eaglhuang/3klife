---
task_id: ATM-GOV-0240
title: Historical runner red-green discrimination harness
status: planned
owner: atm-performance
priority: P0
milestone: ATM-3.1-R2
depends_on:
  - ATM-GOV-0239
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/schemas/parallel-replay-scenario.ts
  - packages/core/src/broker/replay/**
  - scripts/run-plan3-red-green-discrimination.ts
  - tests/cli/atm-3-red-baseline-discrimination.test.ts
  - artifacts/generated/atm-plan3-red-green/**
deliverables:
  - scripts/run-plan3-red-green-discrimination.ts
  - tests/cli/atm-3-red-baseline-discrimination.test.ts
  - artifacts/generated/atm-plan3-red-green/summary.json
validators:
  - node --strip-types tests/cli/atm-3-red-baseline-discrimination.test.ts
  - node --strip-types scripts/run-plan3-red-green-discrimination.ts --mode validate
  - npm run typecheck
errorCodes: []
evidence:
  required: paired-historical-current-runner-receipts
rollback:
  strategy: revert-commit
  notes: "Retain the last sealed red-green artifact as historical evidence."
atomizationImpact:
  ownerAtomOrMap: atm.broker.parallel-replay
  mapUpdates: []
  extractionCandidates:
    - atom: atm.replay.runner-discrimination
      pattern: Adapter
      source: scripts/run-plan3-red-green-discrimination.ts
      disposition: extract
createdByCommand: atm plan card create
skl_validator_transition:
  schema_id: atm.validatorSelection.transition.v1
  enforcement: advisory-until-TASK-SKL-0029
  causalImpactEdges:
    - sealed-scenario-to-frozen-runner-verdict
    - runner-digest-to-red-green-discrimination
  requiredTestCaseIds:
    - test_task_atm_gov_0240_frozen_runner_red_green_discrimination_66aae9d7
  phaseTestCaseIds:
    - test_int_plan3_parallel_replay_two_card_safe_compose_fb9f0b06
  advisoryTestCaseIds: []
  testContributions: []
---

# ATM-GOV-0240 Historical runner red-green discrimination harness

## Intent

Run one sealed scenario against an identified pre-fix frozen runner and the
current frozen runner. The historical runner must expose the intended failure
class and the current runner must clear it without changing scenario,
assertion, threshold, workload, or coverage digests.

## Acceptance

- [ ] Historical and current runner paths, digests, commits, and availability are sealed before execution.
- [ ] The same scenario digest runs on both runners; the old runner is red and the new runner is green.
- [ ] If either runner cannot execute, or both produce the same verdict, evidence is `inconclusive` and Plan 3.1 remains open.
- [ ] Failure counters come from command output and event/state differences, not fixture-declared `failureShapes`.
- [ ] The harness accepts arbitrary runner pairs and scenario files; no Plan 3 task ids are embedded in control flow.

## Evidence and rollback

Seal stdout/stderr, exit codes, runner digests, scenario digest, and derived
counters. Roll back the harness commit and retain the last sealed red/green
artifact as historical evidence.

## Atomization impact

- owner atom/map: `atm.broker.parallel-replay`
- new script ownership: the script is a thin adapter over the reusable replay scenario contract.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T01:07:53.753Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0240-historical-runner-red-green-discrimination-harness.task.md","contentDigest":"sha256:022a6795391fb4ff01c5cb7988de4e4b48075935404de550e17838311e846092"} -->
