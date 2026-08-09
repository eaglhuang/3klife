---
task_id: ATM-GOV-0315
title: Plan 4.0 six-editor runtime adapter parity canary
status: planned
owner: unassigned
priority: P1
depends_on: [ATM-GOV-0314]
causalGraph:
  causalDependencies: [ATM-GOV-0314]
  startConditions: ["0314 shadow adjudication is done with no unresolved escaped defect"]
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
  changedPublicSeams:
    - atm.adapterParityReceipt.v1
  causalImpactEdges:
    - source/compiler/manifest digest mismatch -> adapter parity block
  parallelFrontierInputs:
    - ATM-GOV-0314 shadow adjudication
  validatorReferences:
    - node --strip-types tests/cli/plan4-adapter-parity.test.ts
  phaseOwner: Plan4-adapter-parity
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - integrations
  - packages/cli/src/commands
  - packages/core/src
  - tests/cli/plan4-adapter-parity.test.ts
  - tests/catalog/groups/test_group_plan4_adapter_parity.shard.json
deliverables:
  - six-editor/provider adapter parity receipt with source/compiler/manifest digests
  - reinstall and frozen-runner smoke evidence for each adapter
  - degradation diagnostics and rollback/recovery proof
validators:
  - node --strip-types tests/cli/plan4-adapter-parity.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:git-head-evidence
testContributions:
  - caseId: test_task_atm_gov_0315_adapter_parity_4d8a1c73
    targetGroupId: test_group_plan4_adapter_parity
    semanticKey: plan4_six_editor_adapter_parity
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: ["source/compiler/manifest digest mismatch -> adapter parity block"]
    expectedRedPredicate: any adapter drifts without a parity block
    responsibility: task-required
  - caseId: test_task_atm_gov_0315_adapter_reinstall_smoke_9e2b6f14
    targetGroupId: test_group_plan4_adapter_parity
    semanticKey: plan4_adapter_reinstall_frozen_smoke
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: ["source/compiler/manifest digest mismatch -> adapter parity block"]
    expectedRedPredicate: reinstall or frozen smoke hides degradation
    responsibility: task-required
requiredTestCaseIds:
  - test_task_atm_gov_0315_adapter_parity_4d8a1c73
  - test_task_atm_gov_0315_adapter_reinstall_smoke_9e2b6f14
evidence:
  required: command-backed
  realness: fresh-sealed-and-real-reinstall
rollback:
  strategy: restore-last-known-good-adapter-corpus
  notes: Retain source evidence but disable any adapter projection whose compiler or manifest digest diverges.
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0315 Plan 4.0 six-editor runtime adapter parity canary

## Intent

Prove parity across codex, claude-code, cursor, copilot, gemini, and
antigravity projections from one sealed corpus. Every adapter must report
source/compiler/manifest digests, degradation diagnostics, reinstall behavior,
and frozen-runner smoke results; one adapter's green result cannot substitute
for another's.

## Acceptance

- [ ] Six adapters have matching source/compiler/manifest evidence.
- [ ] Reinstall and frozen-runner smoke pass for each adapter.
- [ ] Unsupported/degraded behavior is explicit and fail-closed.
- [ ] Fresh sealed evidence includes rollback and deep-module review.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T15:03:50.830Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0315-plan-4-0-six-editor-runtime-adapter-parity-canary.task.md","contentDigest":"sha256:bedba5396fb94861b438f49a6274023bd9ff7076c9562f3f09086b36cb537b9a"} -->
